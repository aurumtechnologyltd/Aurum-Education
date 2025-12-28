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
    const { referral_code, user_email } = await req.json();

    if (!referral_code || typeof referral_code !== "string") {
      throw new Error("referral_code is required");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if referral code exists
    const { data: referrerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("referral_code", referral_code.toUpperCase())
      .single();

    if (profileError || !referrerProfile) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Invalid referral code",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // HIGH-002: Check for self-referral if user email is provided
    if (user_email) {
      // Get the referrer's auth user to check email
      const { data: authData } = await supabase.auth.admin.getUserById(
        referrerProfile.id
      );

      if (authData?.user?.email?.toLowerCase() === user_email.toLowerCase()) {
        return new Response(
          JSON.stringify({
            valid: false,
            message: "You cannot use your own referral code",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        referrer_id: referrerProfile.id,
        referrer_name: referrerProfile.full_name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Referral validate error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

