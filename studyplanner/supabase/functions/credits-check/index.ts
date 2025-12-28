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
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { amount, action } = await req.json();

    if (!amount || typeof amount !== "number") {
      throw new Error("amount is required and must be a number");
    }

    if (action === "check") {
      // Just check balance without deducting
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credit_balance, plan_tier")
        .eq("user_id", user.id)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ has_credits: false, balance: 0 }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Enterprise tier bypass
      if (subscription.plan_tier === "enterprise") {
        return new Response(
          JSON.stringify({ has_credits: true, balance: Infinity }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const hasCredits = (subscription.credit_balance || 0) >= amount;

      return new Response(
        JSON.stringify({
          has_credits: hasCredits,
          balance: subscription.credit_balance || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (action === "deduct") {
      // Use RPC function for atomic deduction
      const { data, error } = await supabase.rpc("check_and_deduct_credits", {
        p_user_id: user.id,
        p_amount: amount,
      });

      if (error) {
        throw new Error(`Failed to deduct credits: ${error.message}`);
      }

      // Get updated balance
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credit_balance")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: data,
          balance: subscription?.credit_balance || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      throw new Error("action must be 'check' or 'deduct'");
    }
  } catch (error) {
    console.error("Credits check error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

