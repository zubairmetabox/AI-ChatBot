# Free Embedding Options

Since OpenAI requires paid credits, here are your **FREE** alternatives:

## 🎯 Recommended: Hugging Face (FREE)

**Why**: Completely free, reliable, good quality

### Setup Steps:
1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `ai-chatbot-embeddings`
4. Type: **Read**
5. Click "Generate"
6. Copy the token (starts with `hf_...`)
7. Add to `.env.local`:
   ```env
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```

**Model Used**: `sentence-transformers/all-MiniLM-L6-v2`
- Dimension: 384 (vs OpenAI's 1536)
- Quality: Good for most use cases
- Speed: Fast
- Cost: **FREE**

---

## Alternative: Update Supabase Schema

Since Hugging Face uses 384 dimensions (vs OpenAI's 1536), you need to update your Supabase schema:

### Run this SQL in Supabase SQL Editor:

```sql
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

-- Recreate index
CREATE INDEX document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Update RPC function
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
```

---

## Other Free Options

### Cohere (Free Tier)
- Sign up: https://dashboard.cohere.com/api-keys
- Free tier: 100 calls/minute
- Good quality embeddings

### Voyage AI (Free Trial)
- Sign up: https://www.voyageai.com/
- Free trial credits
- High quality

---

## Summary

**Easiest Path**:
1. Get Hugging Face token (free, 2 minutes)
2. Update Supabase schema (change 1536 → 384)
3. Add `HUGGINGFACE_API_KEY` to `.env.local`
4. Done! ✅

The code is already updated to automatically use Hugging Face if the key is present.
