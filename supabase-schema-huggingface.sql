-- Update Supabase schema for Hugging Face embeddings (384 dimensions)
-- Run this in Supabase SQL Editor

-- Drop existing table and recreate with correct dimension
DROP TABLE IF EXISTS document_embeddings CASCADE;

CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(384),  -- Changed from 1536 to 384 for Hugging Face
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recreate index for fast similarity search
CREATE INDEX document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Update RPC function for similarity search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(384),  -- Changed from 1536 to 384
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
