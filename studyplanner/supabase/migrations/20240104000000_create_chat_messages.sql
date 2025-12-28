-- Migration: Create chat_messages table for persistent chat history
-- This addresses the major UX gap where conversations are lost on page refresh

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model_used TEXT, -- Only populated for assistant messages
  provider TEXT, -- Only populated for assistant messages ('openai', 'gemini', 'anthropic')
  tokens_used JSONB, -- {input: number, output: number} - Only for assistant messages
  credits_deducted INTEGER, -- Only populated for assistant messages (cost per query)
  sources JSONB, -- Array of source chunk references for assistant messages
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_course ON chat_messages(user_id, course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id ON chat_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own chat messages
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own chat messages
CREATE POLICY "Users can insert their own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chat messages (for clear history feature)
CREATE POLICY "Users can delete their own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all chat messages (for Edge Functions)
CREATE POLICY "Service role can manage all chat messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE chat_messages IS 'Persistent chat history for RAG conversations, enabling users to continue conversations across sessions';
