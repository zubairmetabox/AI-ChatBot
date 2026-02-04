-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries on date and model
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON usage_logs(model);

-- Seed Historical Data (Last Month)
-- Total: 217,300 tokens, 128 requests
-- We will insert one aggregate record for this history to keep it simple.
-- Using a date from last month so it doesn't skew "Today's" stats but counts for "Total".
INSERT INTO usage_logs (model, tokens_in, tokens_out, created_at)
VALUES (
    'llama-3.3-70b', 
    108650, -- Approximating split (50% in)
    108650, -- Approximating split (50% out)
    NOW() - INTERVAL '1 month'
);

-- Insert 127 more dummy records to match the request count of 128 (1 is above)
-- These will have 0 tokens just to get the COUNT(*) right for "Total Requests"
INSERT INTO usage_logs (model, tokens_in, tokens_out, created_at)
SELECT 
    'llama-3.3-70b',
    0,
    0,
    NOW() - INTERVAL '1 month'
FROM generate_series(1, 127);
