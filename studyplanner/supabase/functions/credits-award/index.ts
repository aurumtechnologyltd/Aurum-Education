import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    // This endpoint should be called by service role or webhook
    // For security, we'll require service role key in header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const serviceKey = authHeader.replace("Bearer ", "");
    if (serviceKey !== SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Unauthorized - service role key required");
    }

    const {
      user_id,
      amount,
      type,
      description,
      reference_id,
    } = await req.json();

    if (!user_id || !amount || !type) {
      throw new Error("user_id, amount, and type are required");
    }

    // Validate type
    const validTypes = [
      "signup_bonus",
      "monthly_allocation",
      "chat",
      "study_plan",
      "referral_bonus",
      "referral_reward",
      "rollover_expired",
    ];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(", ")}`);
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use RPC function to award credits
    const { data, error } = await supabase.rpc("award_credits", {
      p_user_id: user_id,
      p_amount: amount,
      p_type: type,
      p_description: description || null,
      p_reference_id: reference_id || null,
    });

    if (error) {
      throw new Error(`Failed to award credits: ${error.message}`);
    }

    // Get updated balance
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("credit_balance, credit_cap")
      .eq("user_id", user_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        balance: subscription?.credit_balance || 0,
        cap: subscription?.credit_cap || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Credits award error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

