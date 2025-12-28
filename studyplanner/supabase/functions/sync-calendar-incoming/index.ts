import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Refresh Google access token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch changes from Google Calendar using sync token
async function fetchCalendarChanges(
  accessToken: string,
  syncToken?: string
): Promise<{ events: any[]; nextSyncToken: string }> {
  let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?";
  
  if (syncToken) {
    url += `syncToken=${encodeURIComponent(syncToken)}`;
  } else {
    // Initial sync - only get events from today onwards
    const timeMin = new Date().toISOString();
    url += `timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 410) {
    // Sync token invalid, need full sync
    throw new Error("FULL_SYNC_REQUIRED");
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch events: ${error}`);
  }

  const data = await response.json();
  return {
    events: data.items || [],
    nextSyncToken: data.nextSyncToken,
  };
}

// Find Aurum event by Google Calendar event ID
async function findAurumEvent(
  supabase: any,
  calendarEventId: string
): Promise<{ type: string; id: string } | null> {
  // Check custom_events
  const { data: customEvent } = await supabase
    .from("custom_events")
    .select("id")
    .eq("calendar_event_id", calendarEventId)
    .single();

  if (customEvent) {
    return { type: "custom_event", id: customEvent.id };
  }

  // Check assignments
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id")
    .eq("calendar_event_id", calendarEventId)
    .single();

  if (assignment) {
    return { type: "assessment", id: assignment.id };
  }

  // Check study_sessions
  const { data: session } = await supabase
    .from("study_sessions")
    .select("id")
    .eq("calendar_event_id", calendarEventId)
    .single();

  if (session) {
    return { type: "study_session", id: session.id };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Handle webhook notification from Google Calendar
    const headers = Object.fromEntries(req.headers.entries());
    const xGoogChannelId = headers["x-goog-channel-id"];
    const xGoogResourceState = headers["x-goog-resource-state"];

    let user_id: string | undefined;

    // If this is a webhook notification (has Google headers)
    if (xGoogChannelId && xGoogResourceState) {
      // Verify it's a sync notification (not sync_start or sync_expired)
      if (xGoogResourceState === "exists" || xGoogResourceState === "not_exists") {
        // Find user by channel_id
        const { data: webhook } = await supabase
          .from("calendar_webhooks")
          .select("user_id")
          .eq("channel_id", xGoogChannelId)
          .single();

        if (!webhook) {
          return new Response(
            JSON.stringify({ error: "Webhook not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        user_id = webhook.user_id;
      } else {
        // sync_start or sync_expired - just acknowledge
        return new Response(
          JSON.stringify({ success: true, message: "Webhook acknowledged" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Manual call
      const body = await req.json().catch(() => ({}));
      user_id = body.user_id;
    }

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Check if two-way sync is enabled
    const { data: syncSettings } = await supabase
      .from("calendar_sync_settings")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!syncSettings?.two_way_sync) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Two-way sync is not enabled",
          synced: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile with refresh token
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!profile?.google_refresh_token) {
      throw new Error("Google Calendar not connected");
    }

    // Refresh access token
    const accessToken = await refreshAccessToken(profile.google_refresh_token);

    // Fetch changes from Google Calendar
    let changes;
    try {
      changes = await fetchCalendarChanges(
        accessToken,
        syncSettings.last_sync_token
      );
    } catch (err: any) {
      if (err.message === "FULL_SYNC_REQUIRED") {
        // Clear sync token and do full sync
        await supabase
          .from("calendar_sync_settings")
          .update({ last_sync_token: null })
          .eq("user_id", user_id);

        changes = await fetchCalendarChanges(accessToken);
      } else {
        throw err;
      }
    }

    let updatedCount = 0;
    let deletedCount = 0;
    let conflictCount = 0;

    for (const event of changes.events) {
      try {
        // Find the corresponding Aurum event
        const aurumEvent = await findAurumEvent(supabase, event.id);

        if (!aurumEvent) {
          // Event not from Aurum, skip
          continue;
        }

        if (event.status === "cancelled") {
          // Event was deleted in Google Calendar
          // We don't auto-delete, but notify the user
          await supabase.from("notifications").insert({
            user_id,
            title: "Calendar event deleted externally",
            body: `An event was deleted in Google Calendar. Check your Aurum calendar.`,
            event_type: aurumEvent.type,
            event_id: aurumEvent.id,
          });
          deletedCount++;
          continue;
        }

        // Extract updated data from Google event
        const updatedData: any = {};
        
        if (event.summary) {
          // Clean up emoji prefixes we add
          updatedData.title = event.summary
            .replace(/^📚\s*/, "")
            .replace(/^📖\s*/, "")
            .trim();
        }

        if (event.description) {
          // Extract description, removing our metadata
          const descLines = event.description.split("\n");
          const cleanDesc = descLines
            .filter(
              (line: string) =>
                !line.startsWith("Course:") &&
                !line.startsWith("Type:") &&
                !line.startsWith("Weight:") &&
                !line.startsWith("Activity:") &&
                !line.startsWith("Week ")
            )
            .join("\n")
            .trim();
          if (cleanDesc) {
            updatedData.description = cleanDesc;
          }
        }

        if (event.start) {
          if (event.start.dateTime) {
            updatedData.start_time = event.start.dateTime;
          }
        }

        if (event.end) {
          if (event.end.dateTime) {
            updatedData.end_time = event.end.dateTime;
          }
        }

        if (event.location) {
          updatedData.location = event.location;
        }

        // Apply updates based on event type
        if (aurumEvent.type === "custom_event") {
          const { error } = await supabase
            .from("custom_events")
            .update({
              ...updatedData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", aurumEvent.id);

          if (!error) {
            updatedCount++;
          }
        } else if (aurumEvent.type === "assessment") {
          // For assessments, only update description and due_date
          const assessmentUpdate: any = {
            updated_at: new Date().toISOString(),
          };
          if (updatedData.description) {
            assessmentUpdate.description = updatedData.description;
          }
          if (updatedData.start_time) {
            assessmentUpdate.due_date = updatedData.start_time;
          }

          const { error } = await supabase
            .from("assignments")
            .update(assessmentUpdate)
            .eq("id", aurumEvent.id);

          if (!error) {
            updatedCount++;
          }
        } else if (aurumEvent.type === "study_session") {
          // For study sessions, only update description
          // Time changes would require complex week/day recalculation
          if (updatedData.description) {
            const { error } = await supabase
              .from("study_sessions")
              .update({
                description: updatedData.description,
                updated_at: new Date().toISOString(),
              })
              .eq("id", aurumEvent.id);

            if (!error) {
              updatedCount++;
            }
          } else {
            // Time was changed - create conflict notification
            await supabase.from("notifications").insert({
              user_id,
              title: "Study session time changed externally",
              body: `A study session time was changed in Google Calendar. Review in Aurum to apply changes.`,
              event_type: aurumEvent.type,
              event_id: aurumEvent.id,
            });
            conflictCount++;
          }
        }
      } catch (err) {
        console.error(`Failed to process event ${event.id}:`, err);
      }
    }

    // Update sync token
    if (changes.nextSyncToken) {
      await supabase
        .from("calendar_sync_settings")
        .update({
          last_sync_token: changes.nextSyncToken,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        deleted: deletedCount,
        conflicts: conflictCount,
        message: `Processed ${changes.events.length} changes from Google Calendar`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Incoming sync error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

