-- Migration: Create chat persistence tables (sessions and messages)
-- Aligns with existing schema where tables reference 'profiles' rather than 'auth.users' directly

-- 1. Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_course ON chat_sessions(user_id, course_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON chat_sessions(last_message_at DESC);

-- RLS for sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can view their own chat sessions') THEN
        CREATE POLICY "Users can view their own chat sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can insert their own chat sessions') THEN
        CREATE POLICY "Users can insert their own chat sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can update their own chat sessions') THEN
        CREATE POLICY "Users can update their own chat sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can delete their own chat sessions') THEN
        CREATE POLICY "Users can delete their own chat sessions" ON chat_sessions FOR DELETE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Service role can manage all chat sessions') THEN
        CREATE POLICY "Service role can manage all chat sessions" ON chat_sessions FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 2. Update chat_messages table
-- Add session_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'session_id') THEN
        ALTER TABLE chat_messages ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add index for session_id on chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

COMMENT ON TABLE chat_sessions IS 'Stores chat session metadata';
