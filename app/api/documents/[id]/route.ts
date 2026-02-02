import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { deleteDocumentFromVectorStore } from '@/lib/services/vectorStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/documents/[id]
 * Delete a specific document
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get document metadata
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !doc) {
            return Response.json({ error: 'Document not found' }, { status: 404 });
        }

        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([doc.storage_path]);

        if (storageError) {
            console.warn('Could not delete file from storage:', storageError);
        }

        // Delete from vector store
        await deleteDocumentFromVectorStore(id);

        // Delete metadata from database
        const { error: dbError } = await supabase.from('documents').delete().eq('id', id);

        if (dbError) {
            console.error('Error deleting document metadata:', dbError);
            return Response.json({ error: dbError.message }, { status: 500 });
        }

        return Response.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}
