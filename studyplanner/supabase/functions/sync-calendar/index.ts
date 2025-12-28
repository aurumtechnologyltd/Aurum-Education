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

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  colorId?: string;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

interface SyncSettings {
  sync_assessments: boolean;
  sync_study_sessions: boolean;
  sync_custom_events: boolean;
  two_way_sync: boolean;
}

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

// Create a Google Calendar event
async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<string | null> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to create event:", error);
    return null;
  }

  const data = await response.json();
  return data.id;
}

// Update an existing Google Calendar event
async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEvent
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to update event:", error);
    return false;
  }

  return true;
}

// Delete a Google Calendar event
async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // 404 means event was already deleted, which is fine
  if (response.status === 404) {
    return true;
  }

  return response.ok;
}

// Calculate study session datetime from relative time
function calculateSessionDateTime(
  semesterStartDate: string,
  weekNumber: number,
  day: string,
  startTime: string
): Date {
  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const start = new Date(semesterStartDate);
  // Move to the start of the week containing semester start
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);
  
  // Add weeks
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  
  // Add day offset
  start.setDate(start.getDate() + dayMap[day]);
  
  // Set time
  const [hours, minutes] = startTime.split(":").map(Number);
  start.setHours(hours, minutes, 0, 0);

  return start;
}

// Color mapping for Google Calendar
const colorMap: Record<string, string> = {
  exam: "11", // Red
  Exam: "11",
  assignment: "9", // Blue
  Assignment: "9",
  project: "3", // Purple
  Project: "3",
  study_session: "1", // Lavender
  custom_event: "2", // Sage (green-ish)
  milestone: "5", // Yellow
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, semester_id } = await req.json();

    if (!user_id || !semester_id) {
      throw new Error("user_id and semester_id are required");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user profile with refresh token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }

    if (!profile.google_refresh_token) {
      throw new Error("Google Calendar not connected");
    }

    // Get sync settings
    const { data: syncSettings } = await supabase
      .from("calendar_sync_settings")
      .select("*")
      .eq("user_id", user_id)
      .single();

    const settings: SyncSettings = syncSettings || {
      sync_assessments: true,
      sync_study_sessions: true,
      sync_custom_events: true,
      two_way_sync: false,
    };

    // Get semester for date calculations
    const { data: semester } = await supabase
      .from("semesters")
      .select("*")
      .eq("id", semester_id)
      .single();

    if (!semester) {
      throw new Error("Semester not found");
    }

    // Refresh access token
    const accessToken = await refreshAccessToken(profile.google_refresh_token);
    const timezone = profile.timezone || "UTC";
    const now = new Date().toISOString();

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Get all courses for the semester
    const { data: courses } = await supabase
      .from("courses")
      .select("*")
      .eq("semester_id", semester_id);

    const courseMap = new Map(courses?.map((c) => [c.id, c]) || []);
    const courseIds = courses?.map((c) => c.id) || [];

    // Sync Assessments
    if (settings.sync_assessments && courseIds.length > 0) {
      const { data: assignments } = await supabase
        .from("assignments")
        .select("*")
        .in("course_id", courseIds)
        .gte("due_date", new Date().toISOString());

      for (const assignment of assignments || []) {
        try {
          const course = courseMap.get(assignment.course_id);
          const dueDate = new Date(assignment.due_date);

          const event: CalendarEvent = {
            summary: `📚 ${assignment.title}`,
            description: `Course: ${course?.name || "Unknown"}\nType: ${assignment.type}${
              assignment.weight ? `\nWeight: ${assignment.weight}%` : ""
            }${assignment.description ? `\n\n${assignment.description}` : ""}`,
            start: {
              dateTime: dueDate.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
              timeZone: timezone,
            },
            colorId: colorMap[assignment.type] || "8",
            reminders: {
              useDefault: false,
              overrides: [
                { method: "popup", minutes: 1440 }, // 1 day
                { method: "popup", minutes: 60 }, // 1 hour
              ],
            },
          };

          let eventId: string | null = null;

          if (assignment.calendar_event_id) {
            // Update existing event
            const updated = await updateCalendarEvent(
              accessToken,
              assignment.calendar_event_id,
              event
            );
            if (updated) {
              updatedCount++;
              eventId = assignment.calendar_event_id;
            }
          } else {
            // Create new event
            eventId = await createCalendarEvent(accessToken, event);
            if (eventId) {
              createdCount++;
            }
          }

          if (eventId) {
            await supabase
              .from("assignments")
              .update({ calendar_event_id: eventId, last_synced_at: now })
              .eq("id", assignment.id);
            syncedCount++;
          }
        } catch (err) {
          console.error(`Failed to sync assignment ${assignment.id}:`, err);
          errorCount++;
        }
      }
    }

    // Sync Study Sessions
    if (settings.sync_study_sessions) {
      const { data: studyPlan } = await supabase
        .from("study_plans")
        .select("id")
        .eq("semester_id", semester_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .single();

      if (studyPlan) {
        const { data: sessions } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("plan_id", studyPlan.id);

        for (const session of sessions || []) {
          try {
            const course = courseMap.get(session.course_id);
            const sessionDate = calculateSessionDateTime(
              semester.start_date,
              session.week_number,
              session.day,
              session.start_time
            );

            // Skip past sessions
            if (sessionDate < new Date()) continue;

            const endDate = new Date(
              sessionDate.getTime() + session.duration_minutes * 60 * 1000
            );

            const event: CalendarEvent = {
              summary: `${session.icon || "📖"} ${session.title}`,
              description: `Course: ${course?.name || "Unknown"}\nActivity: ${session.activity_type}\nWeek ${session.week_number}${
                session.description ? `\n\n${session.description}` : ""
              }`,
              start: {
                dateTime: sessionDate.toISOString(),
                timeZone: timezone,
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: timezone,
              },
              colorId: colorMap.study_session,
              reminders: {
                useDefault: false,
                overrides: [{ method: "popup", minutes: 15 }],
              },
            };

            let eventId: string | null = null;

            if (session.calendar_event_id) {
              const updated = await updateCalendarEvent(
                accessToken,
                session.calendar_event_id,
                event
              );
              if (updated) {
                updatedCount++;
                eventId = session.calendar_event_id;
              }
            } else {
              eventId = await createCalendarEvent(accessToken, event);
              if (eventId) {
                createdCount++;
              }
            }

            if (eventId) {
              await supabase
                .from("study_sessions")
                .update({ calendar_event_id: eventId, last_synced_at: now })
                .eq("id", session.id);
              syncedCount++;
            }
          } catch (err) {
            console.error(`Failed to sync session ${session.id}:`, err);
            errorCount++;
          }
        }
      }
    }

    // Sync Custom Events
    if (settings.sync_custom_events) {
      const { data: customEvents } = await supabase
        .from("custom_events")
        .select("*")
        .eq("user_id", user_id)
        .gte("start_time", new Date().toISOString());

      for (const customEvent of customEvents || []) {
        try {
          const course = customEvent.course_id
            ? courseMap.get(customEvent.course_id)
            : null;

          const event: CalendarEvent = {
            summary: customEvent.title,
            description: `${course ? `Course: ${course.name}\n` : ""}Type: ${customEvent.event_type}${
              customEvent.description ? `\n\n${customEvent.description}` : ""
            }`,
            start: customEvent.is_all_day
              ? { date: customEvent.start_time.split("T")[0] }
              : {
                  dateTime: customEvent.start_time,
                  timeZone: timezone,
                },
            end: customEvent.is_all_day
              ? { date: customEvent.end_time.split("T")[0] }
              : {
                  dateTime: customEvent.end_time,
                  timeZone: timezone,
                },
            colorId: colorMap.custom_event,
            location: customEvent.location || undefined,
            reminders: {
              useDefault: true,
            },
          };

          let eventId: string | null = null;

          if (customEvent.calendar_event_id) {
            const updated = await updateCalendarEvent(
              accessToken,
              customEvent.calendar_event_id,
              event
            );
            if (updated) {
              updatedCount++;
              eventId = customEvent.calendar_event_id;
            }
          } else {
            eventId = await createCalendarEvent(accessToken, event);
            if (eventId) {
              createdCount++;
            }
          }

          if (eventId) {
            await supabase
              .from("custom_events")
              .update({ calendar_event_id: eventId, last_synced_at: now })
              .eq("id", customEvent.id);
            syncedCount++;
          }
        } catch (err) {
          console.error(`Failed to sync custom event ${customEvent.id}:`, err);
          errorCount++;
        }
      }
    }

    // Update last sync time
    await supabase
      .from("calendar_sync_settings")
      .update({ last_full_sync_at: now })
      .eq("user_id", user_id);

    // Check and renew webhook if expired or expiring soon
    if (settings.two_way_sync) {
      const { data: webhook } = await supabase
        .from("calendar_webhooks")
        .select("*")
        .eq("user_id", user_id)
        .single();

      const shouldRenew = !webhook || 
        !webhook.expiration || 
        new Date(webhook.expiration) < new Date(Date.now() + 24 * 60 * 60 * 1000); // Renew if expires in < 24h

      if (shouldRenew) {
        try {
          const webhookUrl = `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/sync-calendar-incoming`;
          const channelId = `aurum-calendar-${user_id}-${Date.now()}`;
          const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

          // Stop old webhook if exists
          if (webhook?.resource_id) {
            try {
              await fetch(
                `https://www.googleapis.com/calendar/v3/channels/stop`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: webhook.channel_id,
                    resourceId: webhook.resource_id,
                  }),
                }
              );
            } catch (stopError) {
              console.warn("Failed to stop old webhook:", stopError);
            }
          }

          // Register new webhook
          const webhookResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/watch`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
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
            await supabase.from("calendar_webhooks").upsert({
              user_id: user_id,
              channel_id: channelId,
              resource_id: webhookData.resourceId,
              expiration: new Date(expiration).toISOString(),
            }, {
              onConflict: "user_id"
            });
            console.log("Webhook renewed:", channelId);
          }
        } catch (webhookError) {
          console.warn("Webhook renewal error (non-critical):", webhookError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount,
        message: `Synced ${syncedCount} events (${createdCount} new, ${updatedCount} updated)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync calendar error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
