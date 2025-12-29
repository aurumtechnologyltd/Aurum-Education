-- Migration: Fix subscription creation for new users
-- Fixes: 406 errors on subscriptions table and 500 errors on chat-rag
-- Root cause: Users can't INSERT into subscriptions table due to RLS policy
-- Solution: 
--   1. Add RLS policy allowing users to insert their own subscription
--   2. Create trigger to auto-create subscription when profile is created
--   3. Backfill missing subscriptions for existing users

-- 1. Add RLS policy to allow users to INSERT their own subscription record
-- This is needed because the signup flow tries to upsert from frontend
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Add RLS policy to allow users to UPDATE their own subscription
-- (for upsert to work on conflict)
CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Create trigger function to auto-create subscription when profile is created
CREATE OR REPLACE FUNCTION handle_new_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert subscription for new profile with 50 credit signup bonus
  INSERT INTO subscriptions (
    user_id, 
    plan_tier, 
    status, 
    credit_balance, 
    credit_cap,
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id, 
    'free', 
    'active', 
    50,  -- Signup bonus
    50,  -- Free tier cap
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Log the signup bonus transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 50, 'signup_bonus', 'Welcome bonus - account creation')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_create_subscription_on_profile ON profiles;
CREATE TRIGGER trigger_create_subscription_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile_subscription();

-- 5. Backfill: Create subscriptions for existing users who don't have one
INSERT INTO subscriptions (user_id, plan_tier, status, credit_balance, credit_cap, current_period_start, current_period_end)
SELECT 
  p.id,
  COALESCE(p.plan_tier, 'free'),
  'active',
  COALESCE(p.current_credits, 50),
  COALESCE(p.credit_cap, 50),
  NOW(),
  NOW() + INTERVAL '30 days'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = p.id
);

-- 6. Log signup bonus for backfilled users who got credits
INSERT INTO credit_transactions (user_id, amount, type, description)
SELECT 
  s.user_id,
  s.credit_balance,
  'signup_bonus',
  'Welcome bonus - backfill from migration'
FROM subscriptions s
WHERE s.credit_balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions ct 
    WHERE ct.user_id = s.user_id 
      AND ct.type = 'signup_bonus'
  );
