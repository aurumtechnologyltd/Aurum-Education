import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getUserTier,
  getStudyPlanModel,
  generateCompletion,
  logAIUsage,
  type PlanTier,
} from "../_shared/model-router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CourseData {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  credits: number | null;
  syllabusContent: string;
  assignments: {
    title: string;
    type: string;
    due_date: string;
    weight: number | null;
  }[];
  resources: string[];
}

interface Preferences {
  total_weekly_hours: number;
  session_length_minutes: number;
  course_priorities: Record<string, "high" | "normal" | "low">;
}

interface StudySession {
  courseId: string;
  courseName: string;
  courseColor: string;
  day: string;
  startTime: string;
  duration: number;
  activityType: string;
  title: string;
  description: string;
  resources: string[];
  icon: string;
}

interface WeekSchedule {
  week: number;
  dateRange: string;
  totalHours: number;
  studySessions: StudySession[];
  upcomingDeadlines: { course: string; assessment: string; date: string }[];
}

interface StudyPlanResponse {
  semester: string;
  totalWeeks: number;
  courses: { courseId: string; name: string; weeklyHoursAllocated: number }[];
  weeklySchedule: WeekSchedule[];
}

async function generateStudyPlan(
  semesterName: string,
  semesterStart: string,
  semesterEnd: string,
  totalWeeks: number,
  courses: CourseData[],
  preferences: Preferences,
  modelConfig: { provider: string; model: string; maxTokens: number; temperature: number }
): Promise<StudyPlanResponse> {
  const coursesInfo = courses
    .map((course, idx) => {
      const priority = preferences.course_priorities[course.id] || "normal";
      const assessmentsInfo =
        course.assignments.length > 0
          ? course.assignments
              .map(
                (a) =>
                  `    - ${a.title} (${a.type}, Due: ${a.due_date}, Weight: ${a.weight || "N/A"}%)`
              )
              .join("\n")
          : "    No assessments found";
      const resourcesInfo =
        course.resources.length > 0
          ? course.resources.join(", ")
          : "No resources";

      return `${idx + 1}. ${course.name} (${course.code || "No code"}, ${course.credits || 3} credits, Priority: ${priority.toUpperCase()})
   Course ID: ${course.id}
   Color: ${course.color || "#3b82f6"}
   Syllabus Summary: ${course.syllabusContent.slice(0, 1500)}${course.syllabusContent.length > 1500 ? "..." : ""}
   Assessments:
${assessmentsInfo}
   Resources: ${resourcesInfo}`;
    })
    .join("\n\n");

  const systemPrompt = `You are an expert academic planner. You create detailed, conflict-free study schedules. Always respond with valid JSON only, no markdown code blocks or explanations.`;

  const userPrompt = `Create a semester-wide study plan for a student taking ${courses.length} courses.

Semester: ${semesterName}, ${semesterStart} to ${semesterEnd}, ${totalWeeks} weeks

Courses:
${coursesInfo}

Student Preferences:
- Total study hours per week: ${preferences.total_weekly_hours} hours
- Preferred session length: ${preferences.session_length_minutes} minutes
- Study style: Balanced across all days

Generate a JSON study plan with the following structure. Return ONLY valid JSON, no markdown:

{
  "semester": "${semesterName}",
  "totalWeeks": ${totalWeeks},
  "courses": [
    {"courseId": "uuid", "name": "Course Name", "weeklyHoursAllocated": 8}
  ],
  "weeklySchedule": [
    {
      "week": 1,
      "dateRange": "Jan 15-21",
      "totalHours": ${preferences.total_weekly_hours},
      "studySessions": [
        {
          "courseId": "uuid",
          "courseName": "Course Name",
          "courseColor": "#3b82f6",
          "day": "Monday",
          "startTime": "18:00",
          "duration": ${preferences.session_length_minutes},
          "activityType": "lecture",
          "title": "Watch Lectures 1-2",
          "description": "Review introductory material and take notes",
          "resources": ["filename.pdf"],
          "icon": "🎥"
        }
      ],
      "upcomingDeadlines": [
        {"course": "Course Name", "assessment": "Quiz 1", "date": "Jan 18"}
      ]
    }
  ]
}

CRITICAL Requirements:
1. NO time conflicts - each session must have a unique day+startTime combination
2. Distribute ${preferences.total_weekly_hours} hours across the week evenly
3. Allocate MORE hours to HIGH priority courses, FEWER to LOW priority
4. Increase study hours for courses with approaching deadlines
5. Balance daily workload (don't schedule 10 hours on Monday and 0 on Tuesday)
6. Space related activities (e.g., lecture on Monday, practice problems on Tuesday)
7. Include review sessions before exams
8. Use realistic study times (typically 8:00-22:00)
9. Activity types: lecture, reading, practice, lab, review, assignment, project
10. Use icons: 🎥 lecture, 📖 reading, ✏️ practice, 💻 lab, 🔄 review, 📝 assignment, 🎯 project

Generate a complete schedule for ALL ${totalWeeks} weeks. Each week should have multiple sessions across different days.

Return ONLY the JSON object, no explanations or markdown formatting.`;

  console.log(`Generating study plan with ${modelConfig.model} (${modelConfig.provider})`);

  const content = await generateCompletion(
    modelConfig as any,
    systemPrompt,
    userPrompt,
    { jsonMode: modelConfig.provider !== "gemini" } // Gemini handles JSON differently
  );

  // Clean up response - remove markdown code blocks if present
  let cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  cleanContent = cleanContent.trim();

  try {
    return JSON.parse(cleanContent);
  } catch {
    console.error("Failed to parse AI response:", cleanContent);
    throw new Error("Failed to parse study plan from AI response");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { semester_id, user_id, preferences } = await req.json();

    if (!semester_id || !user_id || !preferences) {
      throw new Error("semester_id, user_id, and preferences are required");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user token matches user_id
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user || user.id !== user_id) {
      throw new Error("Unauthorized");
    }

    // Get user's subscription tier for model routing
    const userTier = await getUserTier(supabase, user.id);
    const modelConfig = getStudyPlanModel(userTier);
    const isEnterprise = userTier === "enterprise";
    
    console.log(`User ${user.id} tier: ${userTier}, using model: ${modelConfig.model} (${modelConfig.provider})`);

    // HIGH-005: Rate limiting - 10 requests per minute for study plans (more expensive)
    const { data: withinRateLimit } = await supabase.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "generate-study-plan",
      p_max_requests: 10,
      p_window_seconds: 60,
    });

    if (!withinRateLimit) {
      return new Response(
        JSON.stringify({
          error: "Rate limited",
          message: "Too many study plan requests. Please wait a moment and try again.",
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }

    // Enterprise tier bypasses credit checks
    const CREDIT_COST = 10;
    if (!isEnterprise) {
      const { data: creditCheck, error: creditError } = await supabase.rpc(
        "check_and_deduct_credits",
        {
          p_user_id: user_id,
          p_amount: CREDIT_COST,
        }
      );

      if (creditError) {
        throw new Error(`Failed to check credits: ${creditError.message}`);
      }

      if (!creditCheck) {
        // Get current balance for error message
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("credit_balance")
          .eq("user_id", user_id)
          .single();

        const balance = subscription?.credit_balance || 0;
        return new Response(
          JSON.stringify({
            error: "Insufficient credits",
            message: `You need ${CREDIT_COST} credits to generate a study plan. You have ${balance} credits remaining.`,
            balance,
            required: CREDIT_COST,
          }),
          {
            status: 402, // Payment Required
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch semester details
    const { data: semester, error: semesterError } = await supabase
      .from("semesters")
      .select("*")
      .eq("id", semester_id)
      .single();

    if (semesterError || !semester) {
      throw new Error(`Semester not found: ${semesterError?.message}`);
    }

    // Calculate total weeks
    const startDate = new Date(semester.start_date);
    const endDate = new Date(semester.end_date);
    const totalWeeks = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Fetch all courses for this semester
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .eq("semester_id", semester_id)
      .eq("user_id", user_id);

    if (coursesError) {
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }

    if (!courses || courses.length === 0) {
      throw new Error("No courses found for this semester");
    }

    // Fetch syllabi and assignments for each course
    const courseData: CourseData[] = await Promise.all(
      courses.map(async (course) => {
        // Fetch syllabus document chunks
        const { data: documents } = await supabase
          .from("documents")
          .select("id, file_name")
          .eq("course_id", course.id)
          .eq("document_type", "syllabus");

        let syllabusContent = "";
        if (documents && documents.length > 0) {
          const { data: chunks } = await supabase
            .from("document_chunks")
            .select("content")
            .eq("document_id", documents[0].id)
            .order("id", { ascending: true })
            .limit(10);

          if (chunks) {
            syllabusContent = chunks.map((c) => c.content).join("\n");
          }
        }

        // Fetch assignments
        const { data: assignments } = await supabase
          .from("assignments")
          .select("title, type, due_date, weight")
          .eq("course_id", course.id)
          .order("due_date", { ascending: true });

        // Fetch study resources
        const { data: resources } = await supabase
          .from("documents")
          .select("file_name")
          .eq("course_id", course.id)
          .eq("document_type", "study_resource");

        return {
          id: course.id,
          name: course.name,
          code: course.code,
          color: course.color,
          credits: course.credits,
          syllabusContent: syllabusContent || "No syllabus uploaded",
          assignments: assignments || [],
          resources: resources?.map((r) => r.file_name) || [],
        };
      })
    );

    // Generate study plan with AI using tier-appropriate model
    const studyPlan = await generateStudyPlan(
      semester.name,
      semester.start_date,
      semester.end_date,
      totalWeeks,
      courseData,
      preferences,
      modelConfig
    );

    // Log AI usage for cost tracking
    await logAIUsage(supabase, {
      userId: user.id,
      modelName: modelConfig.model,
      featureType: "study_plan",
      inputTokens: Math.ceil(JSON.stringify(courseData).length / 4), // Rough estimate
      outputTokens: Math.ceil(JSON.stringify(studyPlan).length / 4), // Rough estimate
      tier: userTier as PlanTier,
    });

    // Archive any existing active plans for this semester
    await supabase
      .from("study_plans")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("semester_id", semester_id)
      .eq("user_id", user_id)
      .eq("status", "active");

    // Save preferences
    const { error: prefError } = await supabase
      .from("study_plan_preferences")
      .upsert(
        {
          user_id,
          semester_id,
          total_weekly_hours: preferences.total_weekly_hours,
          session_length_minutes: preferences.session_length_minutes,
          course_priorities: preferences.course_priorities,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,semester_id" }
      );

    if (prefError) {
      console.error("Failed to save preferences:", prefError);
    }

    // Create new study plan
    const { data: newPlan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        user_id,
        semester_id,
        status: "active",
        plan_json: studyPlan,
      })
      .select()
      .single();

    if (planError || !newPlan) {
      throw new Error(`Failed to create study plan: ${planError?.message}`);
    }

    // Create individual study sessions
    const sessions: {
      plan_id: string;
      course_id: string;
      week_number: number;
      day: string;
      start_time: string;
      duration_minutes: number;
      activity_type: string;
      title: string;
      description: string;
      resources: string[];
      icon: string;
    }[] = [];

    for (const week of studyPlan.weeklySchedule) {
      for (const session of week.studySessions) {
        sessions.push({
          plan_id: newPlan.id,
          course_id: session.courseId,
          week_number: week.week,
          day: session.day,
          start_time: session.startTime,
          duration_minutes: session.duration,
          activity_type: session.activityType,
          title: session.title,
          description: session.description,
          resources: session.resources,
          icon: session.icon,
        });
      }
    }

    if (sessions.length > 0) {
      const { error: sessionsError } = await supabase
        .from("study_sessions")
        .insert(sessions);

      if (sessionsError) {
        console.error("Failed to create sessions:", sessionsError);
      }
    }

    // Create weekly progress records
    const weeklyProgress = studyPlan.weeklySchedule.map((week) => ({
      plan_id: newPlan.id,
      week_number: week.week,
      date_range: week.dateRange,
      planned_hours: week.totalHours,
      completed_hours: 0,
      is_completed: false,
    }));

    if (weeklyProgress.length > 0) {
      const { error: progressError } = await supabase
        .from("study_plan_weekly_progress")
        .insert(weeklyProgress);

      if (progressError) {
        console.error("Failed to create weekly progress:", progressError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan_id: newPlan.id,
        plan: studyPlan,
        model: modelConfig.model,
        provider: modelConfig.provider,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Generate study plan error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
