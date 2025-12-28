import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getUserTier,
  getChatModel,
  generateCompletion,
  generateEmbedding,
  logAIUsage,
} from "../_shared/model-router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { course_id, query } = await req.json();

    if (!course_id || !query) {
      throw new Error("course_id and query are required");
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user token and get user ID
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's subscription tier for model routing
    const userTier = await getUserTier(supabase, user.id);
    const modelConfig = getChatModel(userTier);
    const isEnterprise = userTier === "enterprise";
    
    console.log(`User ${user.id} tier: ${userTier}, using model: ${modelConfig.model} (${modelConfig.provider})`);

    // HIGH-005: Rate limiting - 30 requests per minute for chat
    const { data: withinRateLimit } = await supabase.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "chat-rag",
      p_max_requests: 30,
      p_window_seconds: 60,
    });

    if (!withinRateLimit) {
      return new Response(
        JSON.stringify({
          error: "Rate limited",
          message: "Too many requests. Please wait a moment and try again.",
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }

    // Enterprise tier bypasses credit checks
    const CREDIT_COST = 5;
    if (!isEnterprise) {
      const { data: creditCheck, error: creditError } = await supabase.rpc(
        "check_and_deduct_credits",
        {
          p_user_id: user.id,
          p_amount: CREDIT_COST,
        }
      );

      if (creditError) {
        throw new Error(`Failed to check credits: ${creditError.message}`);
      }

      if (!creditCheck) {
        // Get current balance for error message
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("credit_balance")
          .eq("user_id", user.id)
          .single();

        const balance = subscription?.credit_balance || 0;
        return new Response(
          JSON.stringify({
            error: "Insufficient credits",
            message: `You need ${CREDIT_COST} credits to ask a question. You have ${balance} credits remaining.`,
            balance,
            required: CREDIT_COST,
          }),
          {
            status: 402, // Payment Required
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message}`);
    }

    // Generate embedding for the query using OpenAI (same for all tiers)
    const queryEmbedding = await generateEmbedding(query);

    // Format embedding as a Postgres vector literal string: '[0.1,0.2,...]'
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Search for similar chunks using the match_document_chunks function
    const { data: matches, error: matchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: embeddingString,
        match_threshold: 0.5,
        match_count: 5,
        p_course_id: course_id,
      }
    );

    if (matchError) {
      console.error("Match error:", matchError);
      throw new Error(`Failed to search documents: ${matchError.message}`);
    }

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({
          response:
            "I couldn't find any relevant information in the uploaded documents. Please make sure a syllabus has been uploaded and processed.",
          model: modelConfig.model,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Combine matched chunks into context
    const context = matches
      .map((m: { content: string; similarity: number }) => m.content)
      .join("\n\n---\n\n");

    // Generate response using the appropriate model based on user tier
    const systemPrompt = `You are a helpful academic assistant for the course "${course.name}". 
You answer questions about the course syllabus and materials.
Use the provided context to answer questions accurately.
If the answer is not in the context, say so honestly.
Be concise but thorough. Format your response clearly.`;

    const userPrompt = `Context from the syllabus:
---
${context}
---

Question: ${query}`;

    const response = await generateCompletion(modelConfig, systemPrompt, userPrompt);

    // Log AI usage for cost tracking
    await logAIUsage(supabase, {
      userId: user.id,
      modelName: modelConfig.model,
      featureType: "chat",
      inputTokens: Math.ceil((systemPrompt.length + userPrompt.length) / 4), // Rough estimate
      outputTokens: Math.ceil(response.length / 4), // Rough estimate
      tier: userTier,
    });

    // Format sources for citation
    const sources = matches.map((m: { id: number; similarity: number; metadata?: unknown }) => ({
      chunk_id: m.id,
      similarity: m.similarity,
      metadata: m.metadata || {},
    }));

    return new Response(
      JSON.stringify({
        response,
        sources,
        model: modelConfig.model,
        provider: modelConfig.provider,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat RAG error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
