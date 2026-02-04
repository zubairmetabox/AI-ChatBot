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
export async function generateStreamingCompletion(messages: Message[], model: string = 'llama-3.3-70b') {
    try {
        const stream = await cerebras.chat.completions.create({
            model,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 8192,
        });

        return stream;
    } catch (error) {
        console.error('Cerebras Streaming Error:', error);
        throw new Error(`Failed to generate streaming response: ${(error as Error).message}`);
    }
}

export default cerebras;
