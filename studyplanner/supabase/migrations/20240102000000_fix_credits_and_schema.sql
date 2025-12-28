-- Migration: Fix credits system, add billing_interval, ai_usage_logs, and signup trigger
-- This migration addresses CRIT-002, CRIT-003, and HIGH-003

-- HIGH-003: Add billing_interval column to subscriptions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'billing_interval'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly'));
  END IF;
END $$;

-- CRIT-003: Create AI usage logs table for cost tracking
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

-- RLS Policies for ai_usage_logs
CREATE POLICY "Users can view their own AI usage logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI usage logs"
  ON ai_usage_logs FOR ALL
  USING (auth.role() = 'service_role');

-- CRIT-002: Create function to log AI usage (called from Edge Functions)
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

-- CRIT-002: Create trigger to award signup bonus when subscription is created
CREATE OR REPLACE FUNCTION handle_signup_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award signup bonus for new free tier subscriptions
  IF NEW.plan_tier = 'free' AND NEW.credit_balance = 0 THEN
    -- Award 50 credits signup bonus
    NEW.credit_balance := 50;
    
    -- Log the transaction
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (NEW.user_id, 50, 'signup_bonus', 'Welcome bonus');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for signup bonus (only on INSERT, not UPDATE)
DROP TRIGGER IF EXISTS trigger_signup_credits ON subscriptions;
CREATE TRIGGER trigger_signup_credits
  BEFORE INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_signup_credits();

-- Create function to award credits with proper validation (for internal use)
CREATE OR REPLACE FUNCTION award_credits_internal(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_respect_cap BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER AS $$
DECLARE
  v_current_balance INTEGER;
  v_credit_cap INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance and cap
  SELECT credit_balance, credit_cap
  INTO v_current_balance, v_credit_cap
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Initialize subscription if doesn't exist
  IF v_current_balance IS NULL THEN
    INSERT INTO subscriptions (user_id, credit_balance, credit_cap, plan_tier, status)
    VALUES (p_user_id, 0, 50, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT credit_balance, credit_cap
    INTO v_current_balance, v_credit_cap
    FROM subscriptions
    WHERE user_id = p_user_id;
    
    v_current_balance := COALESCE(v_current_balance, 0);
    v_credit_cap := COALESCE(v_credit_cap, 50);
  END IF;
  
  -- Calculate new balance
  IF p_respect_cap THEN
    v_new_balance := LEAST(v_current_balance + p_amount, v_credit_cap);
  ELSE
    v_new_balance := v_current_balance + p_amount;
  END IF;
  
  -- Ensure balance doesn't go negative
  IF v_new_balance < 0 THEN
    v_new_balance := 0;
  END IF;
  
  -- Update balance
  UPDATE subscriptions
  SET credit_balance = v_new_balance
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, related_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_reference_id);
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync profiles credits with subscriptions (for backwards compatibility)
CREATE OR REPLACE FUNCTION sync_profile_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync credit balance to profiles table for backwards compatibility
  UPDATE profiles
  SET current_credits = NEW.credit_balance,
      credit_cap = NEW.credit_cap
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_profile_credits ON subscriptions;
CREATE TRIGGER trigger_sync_profile_credits
  AFTER INSERT OR UPDATE OF credit_balance, credit_cap ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_credits();

-- HIGH-005: Rate limiting table for AI endpoints
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint ON rate_limit_log(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_log(created_at DESC);

-- Enable RLS
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit logs
CREATE POLICY "Service role can manage rate limit logs"
  ON rate_limit_log FOR ALL
  USING (auth.role() = 'service_role');

-- Function to check and log rate limit
-- Returns TRUE if within limits, FALSE if rate limited
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

