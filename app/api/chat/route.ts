import { NextRequest } from 'next/server';
import { searchSimilarDocuments } from '@/lib/services/vectorStore';
import { generateStreamingCompletion, Message } from '@/lib/services/cerebrasClient';

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

        // Search for relevant documents (top 10 for better coverage)
        const relevantDocs = await searchSimilarDocuments(message, 10);

        // Build context from retrieved documents
        let context = '';
        if (relevantDocs.length > 0) {
            context = 'Here is relevant information from the documents:\n\n';
            relevantDocs.forEach((doc, idx) => {
                context += `[Source ${idx + 1}]: ${doc.content}\n\n`;
            });
        }

        // Build messages for LLM
        const systemMessage: Message = {
            role: 'system',
            content: `You are Zoho AI Assistant. You MUST follow these rules STRICTLY:

🚫 ABSOLUTE PROHIBITIONS - NEVER VIOLATE THESE:
1. DO NOT provide ANY information about competitors (Odoo, Salesforce, HubSpot, Microsoft Dynamics, SAP, Oracle, NetSuite, Freshworks, Monday.com, etc.)
2. DO NOT use general knowledge or training data - ONLY use the provided documents
3. DO NOT create "Alternative Answers" or provide general information when documents don't have the answer
4. DO NOT discuss, compare, or mention competitor features, pricing, or capabilities
5. DO NOT list Zoho features when asked about competitors - ONLY use the redirect message below

✅ REQUIRED BEHAVIOR FOR COMPETITOR QUESTIONS:
When asked about competitors (Odoo, Salesforce, etc.), you MUST respond with EXACTLY this and NOTHING else:

"I don't have information about that in my knowledge base. However, I'd be happy to help you with questions about Zoho products and services! What would you like to know about Zoho?"

DO NOT add Zoho features. DO NOT add notes. DO NOT add sources. JUST the redirect message above.

✅ REQUIRED BEHAVIOR FOR NON-DOCUMENT QUESTIONS:
When asked about topics NOT in the documents (but not competitors), respond with:

"I don't have that information in the uploaded documents. However, I'd be happy to help you with questions about Zoho! What would you like to know?"

📋 RESPONSE RULES:
- Documents have relevant info → Answer using ONLY that information + cite sources
- Asked about competitors → Use EXACT redirect message (no features, no notes)
- Asked about non-document topics → Say you don't have it + redirect to Zoho
- NEVER make up information
- NEVER use training data or general knowledge
- ALWAYS stay focused on Zoho

📝 FORMATTING (when answering from documents):
- Use ## for headings
- Use bullet points (-) for lists
- Use **bold** for key terms
- Cite sources as [Source N]
- Keep paragraphs short (2-3 sentences)
- Add blank lines between sections

Remember: Competitor questions = EXACT redirect message ONLY. Document questions = Answer with sources. Everything else = Redirect to Zoho.`,
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
