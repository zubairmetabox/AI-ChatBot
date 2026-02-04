import { NextRequest } from 'next/server';
import { searchSimilarDocuments } from '@/lib/services/vectorStore';
import { generateStreamingCompletion, Message } from '@/lib/services/cerebrasClient';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/chat
 * Handle chat queries with RAG
 */
export async function POST(req: NextRequest) {
    try {
        const { message, conversationHistory = [] } = await req.json();

        if (!message) {
            return Response.json({ error: 'Message is required' }, { status: 400 });
        }

        console.log(`💬 Query: ${message}`);

        // 1. Fetch settings from Supabase (FAILSAFE)
        let settings: any = {};
        try {
            const { data: rows, error } = await supabase
                .from('chatbot_settings')
                .select('key, value')
                .in('key', ['guardrails', 'model_config']);

            if (error || !rows) {
                console.warn("Settings fetch failed or empty, using defaults.", error);
            } else {
                // Merge all settings into one object
                // We spread the values so 'system_prompt' is top-level (from guardrails)
                // We also keep the key for explicit access like settings.model_config
                settings = rows.reduce((acc, row) => ({
                    ...acc,
                    ...row.value, // Spread content (e.g. system_prompt, competitors)
                    [row.key]: row.value // Keep namespaced access (e.g. settings.model_config)
                }), {});
            }
        } catch (err) {
            console.error('Settings fetch error, using defaults:', err);
            settings = {};
        }

        const defaultSettings = {
            system_prompt: "You are a helpful AI Assistant. You answer questions based on the provided documents.",
            competitors: [],
            messages: {
                competitor_response: "I cannot answer questions about competitors.",
                fallback_response: "I don't have that information."
            },
            faqs: [
                "Summarize the key points from the documents",
                "What are the main risks mentioned?",
                "Can you help me find specific details?"
            ]
        };

        // Merge defaults
        settings = { ...defaultSettings, ...settings };

        // 2. Search for relevant documents (top 10 for better coverage)
        // Enhance query with context if missing to improve retrieval
        const searchQuery = message.toLowerCase().includes('zoho')
            ? message
            : `${message} Zoho Books`;

        const relevantDocs = await searchSimilarDocuments(searchQuery, 10);

        // 3. Build context from retrieved documents
        let context = '';
        if (relevantDocs.length > 0) {
            context = 'Here is relevant information from the documents:\n\n';
            relevantDocs.forEach((doc, idx) => {
                context += `[Source ${idx + 1}]: ${doc.content}\n\n`;
            });
        }

        // 4. Construct System Prompt
        const competitorsList = settings.competitors?.join(", ") || "";
        // Use generic placeholders replacement
        // Note: The template stored in DB might have {competitors}, {competitor_response}, etc.
        const systemPromptTemplate = settings.system_prompt || "You are a helpful AI Assistant.";

        const finalSystemPrompt = systemPromptTemplate
            .replace(/{competitors}/g, competitorsList)
            .replace(/{competitor_response}/g, settings.messages?.competitor_response || "I cannot answer questions about competitors.")
            .replace(/{fallback_response}/g, settings.messages?.fallback_response || "I don't have that information.");

        // Build messages for LLM
        const systemMessage: Message = {
            role: 'system',
            content: finalSystemPrompt,
        };

        const messages: Message[] = [
            systemMessage,
            ...conversationHistory,
            {
                role: 'user',
                content: context ? `${context}\n\nQuestion: ${message}` : message,
            },
        ];

        // Create a readable stream for the response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let tokensOut = 0;
                const tokensIn = Math.ceil(JSON.stringify(messages).length / 4);

                try {
                    // Get model from settings or default
                    const model = (settings.model_config as any)?.model || 'llama-3.3-70b';
                    console.log(`🤖 Model: ${model}`);

                    // Get streaming response from Cerebras
                    const aiStream = await generateStreamingCompletion(messages, model);

                    let isThinking = false;
                    let internalBuffer = '';
                    const THINK_START = '<think>';
                    const THINK_END = '</think>';

                    // Stream the response
                    for await (const chunk of aiStream) {
                        const content = chunk.choices[0]?.delta?.content || '';

                        if (content) {
                            // Count tokens for ALL generated content (user pays for thoughts)
                            tokensOut += Math.ceil(content.length / 4);

                            internalBuffer += content;

                            // Process buffer
                            while (true) {
                                if (isThinking) {
                                    // Look for end tag
                                    const endIdx = internalBuffer.indexOf(THINK_END);
                                    if (endIdx !== -1) {
                                        isThinking = false;
                                        // Discard thought, keep output after it
                                        internalBuffer = internalBuffer.substring(endIdx + THINK_END.length);
                                        // Loop again to process potential legitimate text or new think block
                                        continue;
                                    } else {
                                        // No end tag yet. 
                                        // Discard content but keep enough tail to detect a partial end tag.
                                        // </think> is 8 chars. Keep last 7 chars.
                                        if (internalBuffer.length > THINK_END.length) {
                                            internalBuffer = internalBuffer.slice(-THINK_END.length);
                                        }
                                        break; // Need more chunks
                                    }
                                } else {
                                    // Look for start tag
                                    const startIdx = internalBuffer.indexOf(THINK_START);
                                    if (startIdx !== -1) {
                                        // Emit everything BEFORE start tag
                                        if (startIdx > 0) {
                                            const validContent = internalBuffer.substring(0, startIdx);
                                            const data = JSON.stringify({ content: validContent });
                                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                                        }
                                        isThinking = true;
                                        internalBuffer = internalBuffer.substring(startIdx + THINK_START.length);
                                        continue; // Loop to check for immediate end tag
                                    } else {
                                        // No start tag found.
                                        // Emit content, but keep tail to handle split start tag.
                                        // <think> is 7 chars. Keep last 6.
                                        const keepLen = THINK_START.length;
                                        if (internalBuffer.length > keepLen) {
                                            const emitLen = internalBuffer.length - keepLen;
                                            const validContent = internalBuffer.substring(0, emitLen);
                                            const data = JSON.stringify({ content: validContent });
                                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                                            internalBuffer = internalBuffer.substring(emitLen);
                                        }
                                        break; // Need more chunks
                                    }
                                }
                            }
                        }
                    }

                    // Flush remaining buffer at end of stream
                    if (internalBuffer && !isThinking) {
                        const data = JSON.stringify({ content: internalBuffer });
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    }

                    // Log usage to Supabase (Fire and forget, or await)
                    // We await it to ensure it's logged before we close, though it delays "DONE" slightly.
                    // Given it's a fast insert, it's fine.
                    try {
                        await supabase.from('usage_logs').insert({
                            model: model,
                            tokens_in: tokensIn,
                            tokens_out: tokensOut
                        });
                    } catch (logError) {
                        console.error('Failed to log usage:', logError);
                    }

                    // Send sources at the end

                    // Send sources at the end
                    if (relevantDocs.length > 0) {
                        const sources = relevantDocs.map((doc, idx) => ({
                            index: idx + 1,
                            filename: doc.metadata?.filename || 'Unknown',
                            chunkIndex: doc.metadata?.chunkIndex,
                        }));

                        const sourcesData = JSON.stringify({ sources });
                        controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`));
                    }

                    // Send done signal
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    const errorData = JSON.stringify({ error: (error as Error).message });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat error:', error);
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}
