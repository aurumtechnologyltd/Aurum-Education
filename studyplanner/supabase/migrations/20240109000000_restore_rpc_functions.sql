-- Migration: Restore missing RPC functions for Chat and Credits
-- Fixes: 500 errors on chat-rag due to missing RPCs 'check_and_deduct_credits' and 'match_document_chunks'

-- 1. Create function for atomic credit check and deduction
CREATE OR REPLACE FUNCTION check_and_deduct_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_plan_tier TEXT;
BEGIN
  -- Get current balance and plan tier
  SELECT credit_balance, plan_tier
  INTO v_current_balance, v_plan_tier
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Enterprise tier bypass
  IF v_plan_tier = 'enterprise' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has enough credits
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits atomically
  UPDATE subscriptions
  SET credit_balance = credit_balance - p_amount
  WHERE user_id = p_user_id
    AND credit_balance >= p_amount;
  
  -- Check if update was successful
  IF FOUND THEN
    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_amount, 
      CASE 
        WHEN p_amount = 5 THEN 'chat'
        WHEN p_amount = 10 THEN 'study_plan'
        ELSE 'chat'
      END,
      CASE 
        WHEN p_amount = 5 THEN 'RAG chat question'
        WHEN p_amount = 10 THEN 'Study plan generation'
        ELSE 'Credit deduction'
      END
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create function for vector similarity search (RAG)
-- Used to find relevant document chunks for chat context
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_course_id uuid
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  AND d.course_id = p_course_id
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
