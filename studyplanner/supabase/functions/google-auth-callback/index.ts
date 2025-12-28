import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
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
    const body = await req.json();
    const { code, user_id, redirect_uri } = body;

    if (!code) {
      throw new Error("Authorization code is required");
    }

    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!redirect_uri) {
      throw new Error("redirect_uri is required");
    }

    console.log("Exchanging code for tokens with redirect_uri:", redirect_uri);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange error:", error);
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    const { refresh_token, access_token } = tokenData;

    if (!refresh_token) {
      console.error("No refresh token in response:", tokenData);
      throw new Error("No refresh token received from Google. Make sure 'prompt=consent' and 'access_type=offline' are set.");
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Store refresh token in user profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ google_refresh_token: refresh_token })
      .eq("id", user_id);

    if (updateError) {
      throw new Error(`Failed to store refresh token: ${updateError.message}`);
    }

    // Register webhook for two-way sync
    try {
      // Use the Supabase project URL for the webhook endpoint
      // The webhook URL should be publicly accessible
      const webhookUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/sync-calendar-incoming`;
      const channelId = `aurum-calendar-${user_id}-${Date.now()}`;
      
      // Calculate expiration (7 days from now, Google's max)
      const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const webhookResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/watch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: channelId,
            type: "web_hook",
            address: webhookUrl,
            expiration: expiration,
          }),
        }
      );

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        const resourceId = webhookData.resourceId;

        // Store webhook info in database
        // Note: calendar_webhooks table needs to be created via migration
        const { error: webhookDbError } = await supabase.from("calendar_webhooks").upsert({
          user_id: user_id,
          channel_id: channelId,
          resource_id: resourceId,
          expiration: new Date(expiration).toISOString(),
        }, {
          onConflict: "user_id"
        });

        if (webhookDbError) {
          console.warn("Failed to store webhook info (non-critical):", webhookDbError);
        } else {
          console.log("Webhook registered successfully:", channelId);
        }
      } else {
        const errorText = await webhookResponse.text();
        console.warn("Failed to register webhook (non-critical):", errorText);
        // Don't throw - webhook registration failure shouldn't block OAuth
      }
    } catch (webhookError) {
      console.warn("Webhook registration error (non-critical):", webhookError);
      // Don't throw - webhook registration failure shouldn't block OAuth
    }

    console.log("Google Calendar connected successfully for user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google Calendar connected successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Google auth callback error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
