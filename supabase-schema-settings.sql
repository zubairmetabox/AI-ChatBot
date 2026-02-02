-- Create settings table
CREATE TABLE IF NOT EXISTS chatbot_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default guardrails if not exists
INSERT INTO chatbot_settings (key, value)
VALUES (
  'guardrails',
  '{
    "system_prompt": "You are a helpful AI Assistant. You answer questions based on the provided documents.",
    "competitors": [],
    "messages": {
      "competitor_response": "I cannot answer questions about competitors.",
      "fallback_response": "I don''t have that information."
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
