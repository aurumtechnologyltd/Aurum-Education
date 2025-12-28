import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("VITE_APP_URL") || Deno.env.get("APP_URL") || "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Price IDs should be set as environment variables
const PRICE_IDS = {
  pro_monthly: Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID")!,
  pro_yearly: Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID")!,
  pro_plus_monthly: Deno.env.get("STRIPE_PRO_PLUS_MONTHLY_PRICE_ID")!,
  pro_plus_yearly: Deno.env.get("STRIPE_PRO_PLUS_YEARLY_PRICE_ID")!,
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

    const { plan_tier, billing_interval } = await req.json();

    if (!plan_tier || !billing_interval) {
      throw new Error("plan_tier and billing_interval are required");
    }

    // Validate plan tier
    if (!["pro", "pro_plus"].includes(plan_tier)) {
      throw new Error("Invalid plan_tier. Must be 'pro' or 'pro_plus'");
    }

    // Validate billing interval
    if (!["monthly", "yearly"].includes(billing_interval)) {
      throw new Error("Invalid billing_interval. Must be 'monthly' or 'yearly'");
    }

    // Get price ID
    const priceKey = `${plan_tier}_${billing_interval}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      throw new Error(`Price ID not configured for ${priceKey}`);
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const stripeResponse = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email || "",
          metadata: JSON.stringify({ user_id: user.id }),
        }),
      });

      if (!stripeResponse.ok) {
        const error = await stripeResponse.text();
        throw new Error(`Failed to create Stripe customer: ${error}`);
      }

      const customer = await stripeResponse.json();
      customerId = customer.id;

      // Update subscription record
      await supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
        });
    }

    // Create Stripe checkout session
    const checkoutResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: customerId,
          mode: "subscription",
          line_items: JSON.stringify([
            {
              price: priceId,
              quantity: 1,
            },
          ]),
          success_url: `${APP_URL}/dashboard?upgrade=success`,
          cancel_url: `${APP_URL}/pricing?upgrade=canceled`,
          metadata: JSON.stringify({
            user_id: user.id,
            email: user.email,
            plan_tier,
            billing_interval,
          }),
        }),
      }
    );

    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.text();
      throw new Error(`Failed to create checkout session: ${error}`);
    }

    const session = await checkoutResponse.json();

    return new Response(
      JSON.stringify({
        session_id: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

