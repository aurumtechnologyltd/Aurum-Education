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

interface Message {
  role: "user" | "assistant";
  content: string;
}

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

    const { course_id, query, session_id } = await req.json();

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

    // --- Session Management ---
    let currentSessionId = session_id;
    let isNewSession = false;

    if (!currentSessionId) {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          course_id: course_id,
          title: "New Chat", // We'll update this later appropriately
        })
        .select("id")
        .single();

      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }
      currentSessionId = newSession.id;
      isNewSession = true;
    }

    // Update session last_message_at
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", currentSessionId);

    // --- Chat History Context ---
    let chatHistory: Message[] = [];
    if (!isNewSession) {
      const { data: history } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", currentSessionId)
        .order("created_at", { ascending: false })
        .limit(6); // Get last 6 messages (3 turns)

      if (history) {
        // Reverse to chronological order
        chatHistory = history.reverse().map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }));
      }
    }

    // Insert user message into chat_messages table for persistence
    const { error: insertUserError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        course_id: course_id,
        session_id: currentSessionId,
        role: "user",
        content: query,
      });

    if (insertUserError) {
      console.error("Failed to save user message:", insertUserError);
      // Don't fail the request, just log the error
    }

    // --- RAG Pipeline ---

    // Generate embedding for the query using OpenAI (same for all tiers)
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (embeddingError) {
      console.error("Embedding generation failed:", embeddingError);
      throw new Error(`Failed to generate embedding: ${embeddingError.message}`);
    }

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

    // If no context found, we can still chat using history, but warn user
    const hasContext = matches && matches.length > 0;

    // Combine matched chunks into context
    const context = hasContext
      ? matches.map((m: { content: string; similarity: number }) => m.content).join("\n\n---\n\n")
      : "";

    // Generate response using the appropriate model based on user tier
    const systemPrompt = `You are a helpful academic assistant for the course "${course.name}". 
You answer questions about the course syllabus and materials.
Use the provided context to answer questions accurately.
If the answer is not in the context, say so honestly, but try to be helpful based on the conversation history.
Be concise but thorough. Format your response clearly.`;

    const userPrompt = `Context from the syllabus:
---
${hasContext ? context : "No relevant documents found."}
---

Question: ${query}`;

    // Construct full prompt with history
    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userPrompt }
    ];

    let response;
    try {
      // We need to modify generateCompletion to accept array of messages or modify how we call it.
      // Assuming generateCompletion currently takes systemPrompt and userPrompt strings.
      // We will combine history into the system prompt or user prompt for now if the function signature is strict,
      // BUT ideally, we should update the router to support messages array. 
      // For now, let's inject history into the system prompt as a "Conversation History" block to be safe without changing shared code.

      const historyText = chatHistory.length > 0
        ? `\n\nRecent Conversation History:\n${chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}`
        : "";

      response = await generateCompletion(
        modelConfig,
        systemPrompt + historyText, // Inject history into system prompt
        userPrompt
      );
    } catch (completionError) {
      console.error("Completion generation failed:", completionError);
      throw new Error(`Failed to generate response: ${completionError.message}`);
    }

    // Auto-update title if new session (Simple heuristic: First 6 words of query)
    if (isNewSession) {
      const newTitle = query.split(' ').slice(0, 6).join(' ') + (query.split(' ').length > 6 ? '...' : '');
      await supabase
        .from("chat_sessions")
        .update({ title: newTitle })
        .eq("id", currentSessionId);
    }

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
    const sources = matches ? matches.map((m: { id: number; similarity: number; metadata?: unknown }) => ({
      chunk_id: m.id,
      similarity: m.similarity,
      metadata: m.metadata || {},
    })) : [];

    // Insert assistant message into chat_messages table for persistence
    const { error: insertAssistantError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        course_id: course_id,
        session_id: currentSessionId,
        role: "assistant",
        content: response,
        model_used: modelConfig.model,
        provider: modelConfig.provider,
        tokens_used: {
          input: Math.ceil((systemPrompt.length + userPrompt.length) / 4), // Rough estimate
          output: Math.ceil(response.length / 4), // Rough estimate
        },
        credits_deducted: isEnterprise ? 0 : CREDIT_COST,
        sources: sources,
      });

    if (insertAssistantError) {
      console.error("Failed to save assistant message:", insertAssistantError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({
        response,
        session_id: currentSessionId, // Return session ID so frontend can update URL/State
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
