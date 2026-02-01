import OpenAI from 'openai';
import { supabase } from '@/lib/db/supabase';

// Initialize OpenAI for embeddings (if using OpenAI)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY
    ? new OpenAI({ apiKey: OPENAI_API_KEY })
    : null;

// Hugging Face API configuration (free alternative)
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const JINA_API_KEY = process.env.JINA_API_KEY || HF_API_KEY; // Reuse HF key slot for Jina
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

export interface DocumentMetadata {
    filename: string;
    uploadDate: string;
    documentId: string;
    chunkIndex: number;
    totalChunks: number;
}

export interface SearchResult {
    content: string;
    metadata: DocumentMetadata;
    similarity: number;
}

/**
 * Generate embeddings using Jina AI (free - 1M tokens/month)
 * Model: jina-embeddings-v3 (384 dimensions)
 */
async function generateEmbeddingJinaAI(text: string, task: 'retrieval.query' | 'retrieval.passage' = 'retrieval.passage'): Promise<number[]> {
    try {
        const response = await fetch(
            'https://api.jina.ai/v1/embeddings',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${JINA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'jina-embeddings-v3',
                    task: task, // Use different tasks for queries vs passages
                    dimensions: 384, // Match our Supabase schema
                    input: [text],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Jina AI API error:', response.status, errorText);
            throw new Error(`Jina AI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Jina AI returns embeddings in data array
        if (result.data && result.data[0] && result.data[0].embedding) {
            return result.data[0].embedding;
        }

        throw new Error('Invalid response format from Jina AI');
    } catch (error) {
        console.error('Error generating Jina AI embedding:', error);
        throw error;
    }
}

/**
 * Generate embeddings using OpenAI
 */
async function generateEmbeddingOpenAI(text: string): Promise<number[]> {
    if (!openai) {
        throw new Error('OpenAI client not initialized');
    }

    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating OpenAI embedding:', error);
        throw error;
    }
}

/**
 * Generate embeddings for text (auto-selects provider)
 */
async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // Try Jina AI first (free - 1M tokens/month)
        if (JINA_API_KEY) {
            console.log('Using Jina AI embeddings (free)');
            return await generateEmbeddingJinaAI(text);
        }

        // Fall back to OpenAI
        if (openai) {
            console.log('Using OpenAI embeddings');
            return await generateEmbeddingOpenAI(text);
        }

        throw new Error('No embedding provider configured. Set JINA_API_KEY or OPENAI_API_KEY');
    } catch (error) {
        console.error('Error generating embedding:', error);
        // Return a fallback random embedding (NOT for production!)
        console.warn('⚠️ Using fallback random embedding - NOT for production!');
        return Array(384).fill(0).map(() => Math.random() * 2 - 1);
    }
}

/**
 * Add document chunks to the vector store (Supabase)
 */
export async function addDocumentToVectorStore(
    documentId: string,
    chunks: string[],
    metadata: Partial<DocumentMetadata> = {}
): Promise<{ success: boolean; chunksAdded: number }> {
    try {
        let addedCount = 0;

        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
            const embedding = await generateEmbedding(chunks[i]);

            // Insert into Supabase
            const { error } = await supabase.from('document_embeddings').insert({
                document_id: documentId,
                chunk_index: i,
                content: chunks[i],
                embedding: JSON.stringify(embedding), // pgvector expects array as string
                metadata: {
                    ...metadata,
                    documentId,
                    chunkIndex: i,
                    totalChunks: chunks.length,
                },
            });

            if (error) {
                console.error('Error inserting embedding:', error);
                throw error;
            }

            addedCount++;
        }

        console.log(`✅ Added ${addedCount} chunks for document ${documentId}`);

        return { success: true, chunksAdded: addedCount };
    } catch (error) {
        console.error('Error adding document to vector store:', error);
        throw error;
    }
}

/**
 * Search for similar documents using Supabase pgvector
 */
export async function searchSimilarDocuments(
    query: string,
    topK = 10
): Promise<SearchResult[]> {
    try {
        // Generate embedding for the query using 'retrieval.query' task
        const queryEmbedding = JINA_API_KEY
            ? await generateEmbeddingJinaAI(query, 'retrieval.query')
            : await generateEmbedding(query);
        console.log('🔍 Query embedding generated, length:', queryEmbedding.length);

        // Call Supabase RPC function for similarity search
        // Pass embedding as array, not JSON string (Supabase converts to VECTOR type)
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: topK,
        });

        if (error) {
            console.error('Error searching documents:', error);
            throw error;
        }

        console.log('📊 Search results:', data?.length || 0, 'matches found');
        if (data && data.length > 0) {
            console.log('Top match:', data[0].filename, 'similarity:', data[0].similarity);
        }

        return data || [];
    } catch (error) {
        console.error('Error searching documents:', error);
        throw error;
    }
}

/**
 * Delete a document from the vector store
 */
export async function deleteDocumentFromVectorStore(
    documentId: string
): Promise<{ success: boolean; chunksDeleted: number }> {
    try {
        // Delete all chunks for this document
        const { data, error } = await supabase
            .from('document_embeddings')
            .delete()
            .eq('document_id', documentId)
            .select();

        if (error) {
            console.error('Error deleting document:', error);
            throw error;
        }

        const deletedCount = data?.length || 0;
        console.log(`✅ Deleted ${deletedCount} chunks for document ${documentId}`);

        return { success: true, chunksDeleted: deletedCount };
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
}
