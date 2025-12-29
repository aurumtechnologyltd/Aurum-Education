/**
 * Model Router - Tier-based AI model routing for Aurum Education
 * 
 * Routes requests to different AI providers based on user subscription tier:
 * - Free (Auditor): GPT-5 Nano for chat/study plans
 * - Pro/Pro+ (Scholar/Dean's List): Gemini 3 Flash for chat/study plans
 * - All tiers: Claude Haiku 4.5 for syllabus extraction
 * - All tiers: OpenAI text-embedding-3-small for RAG embeddings
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Environment variables
// Environment variables
const getOpenAiKey = () => Deno.env.get("OPENAI_API_KEY")!;
const getGeminiKey = () => Deno.env.get("GEMINI_API_KEY")!;
const getAnthropicKey = () => Deno.env.get("ANTHROPIC_API_KEY")!;

// Model identifiers
export const MODELS = {
  // OpenAI
  GPT_5_NANO: "gpt-5-nano",
  EMBEDDING: "text-embedding-3-small",

  // Google Gemini
  GEMINI_3_FLASH: "gemini-3-flash-preview",

  // Anthropic
  CLAUDE_HAIKU: "claude-3-5-haiku-latest",
} as const;

export type PlanTier = "free" | "pro" | "pro_plus" | "enterprise";

export interface ModelConfig {
  provider: "openai" | "gemini" | "anthropic";
  model: string;
  maxTokens: number;
  temperature: number;
}

// Cost per 1M tokens for each model (in USD)
const MODEL_COSTS = {
  "gpt-5-nano": { input: 0.10, output: 0.20 },
  "gemini-3-flash-preview": { input: 0.075, output: 0.30 },
  "claude-3-5-haiku-latest": { input: 0.25, output: 1.25 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
} as const;

export type FeatureType = "chat" | "study_plan" | "extraction" | "embedding";

export interface AIUsageLog {
  userId: string;
  modelName: string;
  featureType: FeatureType;
  inputTokens?: number;
  outputTokens?: number;
  tier: PlanTier;
}

/**
 * Calculate cost in USD based on token usage
 */
export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[modelName as keyof typeof MODEL_COSTS];
  if (!costs) return 0;

  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;

  return inputCost + outputCost;
}

/**
 * Log AI usage to the database for cost tracking
 */
export async function logAIUsage(
  supabase: SupabaseClient,
  log: AIUsageLog
): Promise<void> {
  try {
    const cost = calculateCost(
      log.modelName,
      log.inputTokens || 0,
      log.outputTokens || 0
    );

    await supabase.rpc("log_ai_usage", {
      p_user_id: log.userId,
      p_model_name: log.modelName,
      p_feature_type: log.featureType,
      p_input_tokens: log.inputTokens || null,
      p_output_tokens: log.outputTokens || null,
      p_cost_usd: cost || null,
      p_tier: log.tier,
      p_request_metadata: null,
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error("Failed to log AI usage:", error);
  }
}

/**
 * Get user's subscription tier from the database
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanTier> {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("plan_tier")
    .eq("user_id", userId)
    .single();

  // If no subscription record exists or error occurred, default to free tier
  if (error || !subscription?.plan_tier) {
    return "free";
  }

  return subscription.plan_tier as PlanTier;
}

/**
 * Get the appropriate model configuration for chat/RAG based on user tier
 */
export function getChatModel(tier: PlanTier): ModelConfig {
  if (tier === "free") {
    return {
      provider: "openai",
      model: MODELS.GPT_5_NANO,
      maxTokens: 1000,
      temperature: 0.7,
    };
  }

  // Pro, Pro+, Enterprise get Gemini 3 Flash
  return {
    provider: "gemini",
    model: MODELS.GEMINI_3_FLASH,
    maxTokens: 2048,
    temperature: 0.7,
  };
}

/**
 * Get the appropriate model configuration for study plan generation based on user tier
 */
export function getStudyPlanModel(tier: PlanTier): ModelConfig {
  if (tier === "free") {
    return {
      provider: "openai",
      model: MODELS.GPT_5_NANO,
      maxTokens: 16000,
      temperature: 0.7,
    };
  }

  // Pro, Pro+, Enterprise get Gemini 3 Flash
  return {
    provider: "gemini",
    model: MODELS.GEMINI_3_FLASH,
    maxTokens: 32000,
    temperature: 0.7,
  };
}

/**
 * Get the model configuration for syllabus extraction (Claude Haiku for all tiers)
 */
export function getExtractionModel(): ModelConfig {
  return {
    provider: "anthropic",
    model: MODELS.CLAUDE_HAIKU,
    maxTokens: 4096,
    temperature: 0.3,
  };
}

/**
 * Generate a chat completion using OpenAI API
 */
export async function generateOpenAICompletion(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: options.temperature ?? 0.7,
    max_completion_tokens: options.maxTokens ?? 1000,
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate a chat completion using Google Gemini API
 */
export async function generateGeminiCompletion(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const contents = [
    {
      role: "user",
      parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
    },
  ];

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 2048,
  };

  if (options.jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": getGeminiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();

  // Extract text from Gemini response structure
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Invalid Gemini response structure");
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Generate a chat completion using Anthropic Claude API
 */
export async function generateAnthropicCompletion(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": getAnthropicKey(),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();

  // Extract text from Claude response structure
  if (!data.content?.[0]?.text) {
    throw new Error("Invalid Anthropic response structure");
  }

  return data.content[0].text;
}

/**
 * Universal completion function that routes to the appropriate provider
 */
export async function generateCompletion(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
  options: { jsonMode?: boolean } = {}
): Promise<string> {
  switch (config.provider) {
    case "openai":
      return generateOpenAICompletion(config.model, systemPrompt, userPrompt, {
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        jsonMode: options.jsonMode,
      });

    case "gemini":
      return generateGeminiCompletion(config.model, systemPrompt, userPrompt, {
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        jsonMode: options.jsonMode,
      });

    case "anthropic":
      return generateAnthropicCompletion(config.model, systemPrompt, userPrompt, {
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Generate embeddings using OpenAI (used for all tiers)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.EMBEDDING,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.EMBEDDING,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

