import OpenAI from 'openai';

// Initialize Cerebras client using OpenAI SDK
const cerebras = new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1',
});

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Generate a streaming chat completion using Cerebras API
 * @param messages - Array of message objects
 * @returns Streaming response
 */
export async function generateStreamingCompletion(messages: Message[]) {
    try {
        const stream = await cerebras.chat.completions.create({
            model: 'llama-3.3-70b',
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
        });

        return stream;
    } catch (error) {
        console.error('Cerebras Streaming Error:', error);
        throw new Error(`Failed to generate streaming response: ${(error as Error).message}`);
    }
}

export default cerebras;
