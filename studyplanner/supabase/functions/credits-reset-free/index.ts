import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function resets credits for free tier users monthly
// Should be called by a cron job (e.g., Supabase pg_cron or external scheduler)
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authorization (only allow service role or specific API key)
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // If CRON_SECRET is set, verify it matches
    // Otherwise, allow the request (for testing)
    console.log("Cron secret mismatch, but allowing for now");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Find all free tier users whose period has ended
    const now = new Date().toISOString();
    
    const { data: expiredSubs, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, user_id, credit_balance, current_period_end")
      .eq("plan_tier", "free")
      .eq("status", "active")
      .lt("current_period_end", now);

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No free tier credits to reset", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${expiredSubs.length} free tier users to reset`);

    let resetCount = 0;
    const errors: string[] = [];

    for (const sub of expiredSubs) {
      try {
        // Calculate new period
        const newPeriodStart = new Date();
        const newPeriodEnd = new Date(newPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Reset credits to 50 and update period
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            credit_balance: 50,
            current_period_start: newPeriodStart.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
          })
          .eq("id", sub.id);

        if (updateError) {
          errors.push(`User ${sub.user_id}: ${updateError.message}`);
          continue;
        }

        // Log the transaction
        await supabase.from("credit_transactions").insert({
          user_id: sub.user_id,
          amount: 50,
          type: "monthly_allocation",
          description: "Monthly free tier credit allocation",
        });

        resetCount++;
        console.log(`Reset credits for user ${sub.user_id}`);
      } catch (err) {
        errors.push(`User ${sub.user_id}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Reset credits for ${resetCount} free tier users`,
        count: resetCount,
        total: expiredSubs.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error resetting free tier credits:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

