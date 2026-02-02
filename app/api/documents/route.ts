import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { processDocument, chunkText } from '@/lib/services/documentProcessor';
import { addDocumentToVectorStore } from '@/lib/services/vectorStore';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/documents
 * List all uploaded documents
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('upload_date', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ documents: data });
    } catch (error) {
        console.error('Error listing documents:', error);
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}

/**
 * POST /api/documents
 * Upload and process a document
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return Response.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['.pdf', '.txt', '.docx'];
        const ext = '.' + file.name.toLowerCase().split('.').pop();
        if (!allowedTypes.includes(ext)) {
            return Response.json(
                { error: `File type ${ext} not supported. Allowed: ${allowedTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            return Response.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
        }

        const documentId = uuidv4();
        const filename = file.name;

        console.log(`📄 Processing document: ${filename}`);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const storagePath = `documents/${documentId}/${filename}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Error uploading to storage:', uploadError);
            return Response.json({ error: uploadError.message }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

        // Extract text from document
        const text = await processDocument(buffer, filename);

        if (!text || text.length < 10) {
            return Response.json({ error: 'Could not extract text from document' }, { status: 400 });
        }

        // Chunk the text
        const chunks = chunkText(text);

        // Store metadata in Supabase FIRST (before embeddings)
        const { error: dbError } = await supabase.from('documents').insert({
            id: documentId,
            filename,
            storage_path: storagePath,
            storage_url: urlData.publicUrl,
            upload_date: new Date().toISOString(),
            size: file.size,
            chunks: chunks.length,
            text_length: text.length,
        });

        if (dbError) {
            console.error('Error saving document metadata:', dbError);
            return Response.json({ error: dbError.message }, { status: 500 });
        }

        // Now add to vector store (references the document_id we just created)
        await addDocumentToVectorStore(documentId, chunks, {
            filename,
            uploadDate: new Date().toISOString(),
            documentId,
            chunkIndex: 0,
            totalChunks: chunks.length,
        });

        return Response.json({
            success: true,
            document: {
                id: documentId,
                filename,
                chunks: chunks.length,
                textLength: text.length,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}
