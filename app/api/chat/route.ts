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
        let settings;
        try {
            const { data, error } = await supabase
                .from('chatbot_settings')
                .select('value')
                .eq('key', 'guardrails')
                .single();

            if (error || !data) {
                console.warn("Settings fetch failed or empty, using defaults.", error);
                settings = {}; // Will fall back to defaults below
            } else {
                settings = data.value;
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
        const relevantDocs = await searchSimilarDocuments(message, 10);

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
                try {
                    // Get streaming response from Cerebras
                    const aiStream = await generateStreamingCompletion(messages);

                    // Stream the response
                    for await (const chunk of aiStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            const data = JSON.stringify({ content });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }

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
