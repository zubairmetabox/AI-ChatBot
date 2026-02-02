-- Supabase Database Schema for Zoho AI Assistant
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  size BIGINT,
  chunks INT,
  text_length INT
);

-- 3. Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small dimension
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create index for similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 5. Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
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

-- 6. Create storage bucket for documents
-- Run this in the Supabase Dashboard > Storage > Create Bucket
-- Bucket name: documents
-- Public: true (or configure RLS policies as needed)

-- Optional: Row Level Security (RLS) policies
-- Uncomment if you want to add authentication later

-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Public documents are viewable by everyone"
-- ON documents FOR SELECT
-- USING (true);

-- CREATE POLICY "Public embeddings are viewable by everyone"
-- ON document_embeddings FOR SELECT
-- USING (true);
