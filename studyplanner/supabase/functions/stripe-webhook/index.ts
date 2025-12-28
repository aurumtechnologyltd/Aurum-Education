import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Stripe client
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Store processed event IDs to prevent duplicate processing
const processedEvents = new Set<string>();

// Credit allocation by tier
const CREDIT_ALLOCATIONS = {
  free: { monthly: 50, cap: 50 },
  pro: { monthly: 500, cap: 1000 },
  pro_plus: { monthly: 2000, cap: 4000 },
  enterprise: { monthly: Infinity, cap: Infinity },
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    const body = await req.text();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify webhook signature cryptographically using Stripe SDK
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for duplicate events
    if (processedEvents.has(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processed
    processedEvents.add(event.id);

    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata || {};

        if (!metadata.user_id || !metadata.plan_tier) {
          console.error("Missing metadata in checkout session");
          break;
        }

        // Get subscription from Stripe
        const subscriptionId = session.subscription;
        if (!subscriptionId) {
          console.error("No subscription ID in checkout session");
          break;
        }

        const subResponse = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          {
            headers: {
              Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            },
          }
        );

        if (!subResponse.ok) {
          throw new Error("Failed to fetch subscription from Stripe");
        }

        const subscription = await subResponse.json();
        const customerId = subscription.customer;

        // Determine credit allocation
        const planTier = metadata.plan_tier as keyof typeof CREDIT_ALLOCATIONS;
        const allocation = CREDIT_ALLOCATIONS[planTier];

        // Create or update subscription record
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: metadata.user_id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan_tier: planTier,
              billing_interval: metadata.billing_interval || "monthly",
              status: subscription.status === "active" ? "active" : "trialing",
              credit_balance: allocation.monthly,
              credit_cap: allocation.cap,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (subError) {
          console.error("Failed to update subscription:", subError);
          break;
        }

        // Award monthly credits
        if (allocation.monthly > 0 && allocation.monthly !== Infinity) {
          await supabase.rpc("award_credits", {
            p_user_id: metadata.user_id,
            p_amount: allocation.monthly,
            p_type: "monthly_allocation",
            p_description: `Monthly credit allocation for ${planTier} plan`,
            p_reference_id: null,
          });
        }

        console.log(
          `Subscription created for user ${metadata.user_id}, plan: ${planTier}`
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("user_id, plan_tier")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!subData) {
          console.error(`No subscription found for customer ${customerId}`);
          break;
        }

        const planTier = subData.plan_tier as keyof typeof CREDIT_ALLOCATIONS;
        const allocation = CREDIT_ALLOCATIONS[planTier];

        // Update subscription status
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status:
              subscription.status === "active"
                ? "active"
                : subscription.status === "past_due"
                ? "past_due"
                : "canceled",
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            credit_cap: allocation.cap,
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("Failed to update subscription:", updateError);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!subData) {
          console.error(`No subscription found for customer ${customerId}`);
          break;
        }

        // Downgrade to free tier
        const { error: downgradeError } = await supabase
          .from("subscriptions")
          .update({
            plan_tier: "free",
            billing_interval: null,
            status: "canceled",
            stripe_subscription_id: null,
            credit_cap: 50,
            // Keep existing credit balance but cap it
          })
          .eq("stripe_customer_id", customerId);

        if (downgradeError) {
          console.error("Failed to downgrade subscription:", downgradeError);
        }

        // Cap credits at free tier limit
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("credit_balance")
          .eq("user_id", subData.user_id)
          .single();

        if (currentSub && currentSub.credit_balance > 50) {
          await supabase
            .from("subscriptions")
            .update({ credit_balance: 50 })
            .eq("user_id", subData.user_id);
        }

        console.log(`Subscription canceled for user ${subData.user_id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) {
          break;
        }

        // Find user by Stripe customer ID
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("user_id, plan_tier, credit_balance, credit_cap")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!subData) {
          console.error(`No subscription found for customer ${customerId}`);
          break;
        }

        const planTier = subData.plan_tier as keyof typeof CREDIT_ALLOCATIONS;
        const allocation = CREDIT_ALLOCATIONS[planTier];

        // Award monthly credits with rollover logic
        if (allocation.monthly > 0 && allocation.monthly !== Infinity) {
          const currentBalance = subData.credit_balance || 0;
          const newBalance = Math.min(
            currentBalance + allocation.monthly,
            allocation.cap
          );

          // Update balance
          await supabase
            .from("subscriptions")
            .update({ credit_balance: newBalance })
            .eq("user_id", subData.user_id);

          // Log transaction
          await supabase.rpc("award_credits", {
            p_user_id: subData.user_id,
            p_amount: allocation.monthly,
            p_type: "monthly_allocation",
            p_description: `Monthly credit allocation for ${planTier} plan`,
            p_reference_id: null,
          });

          // Log expired credits if any
          const expired = currentBalance + allocation.monthly - allocation.cap;
          if (expired > 0) {
            await supabase.rpc("award_credits", {
              p_user_id: subData.user_id,
              p_amount: -expired,
              p_type: "rollover_expired",
              p_description: `Expired credits exceeding rollover cap`,
              p_reference_id: null,
            });
          }
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by Stripe customer ID
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!subData) {
          break;
        }

        // Update subscription status to past_due
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log(`Payment failed for user ${subData.user_id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

