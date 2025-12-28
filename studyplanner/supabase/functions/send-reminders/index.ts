import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Aurum Education <marc.alleyne@aurumtechnologyltd.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Reminder {
  id: string;
  user_id: string;
  event_type: string;
  event_id: string;
  reminder_time: string;
  reminder_offset_value: number;
  reminder_offset_unit: string;
  method: "popup" | "email";
}

interface EventDetails {
  title: string;
  start_time: string;
  course_name?: string;
  location?: string;
}

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("Resend API key not configured, skipping email");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

// Fetch event details based on type
async function fetchEventDetails(
  supabase: any,
  eventType: string,
  eventId: string
): Promise<EventDetails | null> {
  try {
    switch (eventType) {
      case "assessment": {
        const { data } = await supabase
          .from("assignments")
          .select("title, due_date, course:courses(name)")
          .eq("id", eventId)
          .single();

        if (data) {
          return {
            title: data.title,
            start_time: data.due_date,
            course_name: data.course?.name,
          };
        }
        break;
      }
      case "study_session": {
        const { data } = await supabase
          .from("study_sessions")
          .select("title, start_time, day, week_number, course:courses(name)")
          .eq("id", eventId)
          .single();

        if (data) {
          return {
            title: data.title,
            start_time: data.start_time,
            course_name: data.course?.name,
          };
        }
        break;
      }
      case "custom_event": {
        const { data } = await supabase
          .from("custom_events")
          .select("title, start_time, location, course:courses(name)")
          .eq("id", eventId)
          .single();

        if (data) {
          return {
            title: data.title,
            start_time: data.start_time,
            location: data.location,
            course_name: data.course?.name,
          };
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error fetching event details:", error);
  }

  return null;
}

// Format reminder time for display
function formatReminderTime(value: number, unit: string): string {
  if (value === 1) {
    // Singular form
    return `1 ${unit.slice(0, -1)}`;
  }
  return `${value} ${unit}`;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    // Fetch due reminders that haven't been sent
    const { data: reminders, error: remindersError } = await supabase
      .from("event_reminders")
      .select("*")
      .eq("is_sent", false)
      .lte("reminder_time", now)
      .limit(100);

    if (remindersError) {
      throw new Error(`Failed to fetch reminders: ${remindersError.message}`);
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No reminders to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${reminders.length} reminders`);

    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of reminders as Reminder[]) {
      try {
        // Get user email for email reminders
        let userEmail = "";
        if (reminder.method === "email") {
          const { data: userData } = await supabase.auth.admin.getUserById(
            reminder.user_id
          );
          userEmail = userData?.user?.email || "";
        }

        // Get event details
        const eventDetails = await fetchEventDetails(
          supabase,
          reminder.event_type,
          reminder.event_id
        );

        if (!eventDetails) {
          console.log(`Event not found for reminder ${reminder.id}, marking as sent`);
          await supabase
            .from("event_reminders")
            .update({ is_sent: true, sent_at: now })
            .eq("id", reminder.id);
          continue;
        }

        const reminderText = formatReminderTime(
          reminder.reminder_offset_value,
          reminder.reminder_offset_unit
        );

        if (reminder.method === "popup") {
          // Create in-app notification
          const notificationBody = eventDetails.course_name
            ? `${eventDetails.title} for ${eventDetails.course_name}`
            : eventDetails.title;

          await supabase.from("notifications").insert({
            user_id: reminder.user_id,
            title: `Reminder: ${reminderText} until ${eventDetails.title}`,
            body: notificationBody,
            event_type: reminder.event_type,
            event_id: reminder.event_id,
          });

          console.log(`Created notification for reminder ${reminder.id}`);
        } else if (reminder.method === "email" && userEmail) {
          // Send email notification
          const subject = `Reminder: ${eventDetails.title} in ${reminderText}`;
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Upcoming Event Reminder</h2>
              <p>Your event <strong>${eventDetails.title}</strong> is coming up in ${reminderText}.</p>
              ${eventDetails.course_name ? `<p><strong>Course:</strong> ${eventDetails.course_name}</p>` : ""}
              ${eventDetails.location ? `<p><strong>Location:</strong> ${eventDetails.location}</p>` : ""}
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                This reminder was sent by Aurum Education.
              </p>
            </div>
          `;

          const emailSent = await sendEmail(userEmail, subject, html);
          if (emailSent) {
            console.log(`Sent email for reminder ${reminder.id} to ${userEmail}`);
          } else {
            // Fallback to popup notification if email fails
            await supabase.from("notifications").insert({
              user_id: reminder.user_id,
              title: `Reminder: ${reminderText} until ${eventDetails.title}`,
              body: `Email notification failed. ${eventDetails.title}${eventDetails.course_name ? ` for ${eventDetails.course_name}` : ""}`,
              event_type: reminder.event_type,
              event_id: reminder.event_id,
            });
          }
        }

        // Mark reminder as sent
        await supabase
          .from("event_reminders")
          .update({ is_sent: true, sent_at: now })
          .eq("id", reminder.id);

        sentCount++;
      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: reminders.length,
        sent: sentCount,
        failed: failedCount,
        message: `Processed ${reminders.length} reminders`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send reminders error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

