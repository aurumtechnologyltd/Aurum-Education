-- Migration: Restore missing AI logging and rate limiting tables
-- Fixes: 500 errors on chat-rag due to missing RPC functions

-- 1. Create AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('chat', 'study_plan', 'extraction', 'embedding')),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  tier TEXT NOT NULL,
  request_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for AI usage logs
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tier ON ai_usage_logs(tier);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model_name);

-- Enable RLS on ai_usage_logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_logs (Idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_logs' AND policyname = 'Users can view their own AI usage logs') THEN
    CREATE POLICY "Users can view their own AI usage logs"
      ON ai_usage_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_logs' AND policyname = 'Service role can manage AI usage logs') THEN
    CREATE POLICY "Service role can manage AI usage logs"
      ON ai_usage_logs FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 2. Create log_ai_usage RPC function
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_model_name TEXT,
  p_feature_type TEXT,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL,
  p_cost_usd DECIMAL(10, 6) DEFAULT NULL,
  p_tier TEXT DEFAULT 'free',
  p_request_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_usage_logs (
    user_id, model_name, feature_type, 
    input_tokens, output_tokens, cost_usd, 
    tier, request_metadata
  )
  VALUES (
    p_user_id, p_model_name, p_feature_type,
    p_input_tokens, p_output_tokens, p_cost_usd,
    p_tier, p_request_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Rate Limit Log Table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint ON rate_limit_log(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_log(created_at DESC);

-- Enable RLS
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate_limit_log (Idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rate_limit_log' AND policyname = 'Service role can manage rate limit logs') THEN
    CREATE POLICY "Service role can manage rate limit logs"
      ON rate_limit_log FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 4. Create check_rate_limit RPC function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in the window
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > v_window_start;
  
  -- If over limit, return FALSE
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Log this request
  INSERT INTO rate_limit_log (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);
  
  -- Clean up old entries periodically (1% chance each request)
  IF random() < 0.01 THEN
    DELETE FROM rate_limit_log
    WHERE created_at < NOW() - INTERVAL '1 hour';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
