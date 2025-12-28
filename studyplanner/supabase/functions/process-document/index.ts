import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";
import pdf from "npm:pdf-parse@1.1.1";
import {
  getExtractionModel,
  generateAnthropicCompletion,
  generateEmbeddings,
  logAIUsage,
  getUserTier,
} from "../_shared/model-router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Chunk text into smaller pieces for embedding
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

// Extract assignments using Claude Haiku 4.5 with structured outputs
async function extractAssignments(
  text: string,
  semesterStart?: string,
  semesterEnd?: string
): Promise<any[]> {
  const modelConfig = getExtractionModel();
  
  console.log(`Extracting assignments with ${modelConfig.model} (${modelConfig.provider})`);

  const semesterContext = semesterStart && semesterEnd
    ? `\n\nSemester Context:
- Semester Start Date: ${semesterStart}
- Semester End Date: ${semesterEnd}
Use these dates to resolve ambiguous dates like "Week 5", "Midterm", "Final Exam", etc.
If a date says "Week 5", calculate it as 5 weeks from the semester start date.
If only a month/day is given without year, use the semester year.
Relative dates like "next Monday" should be calculated from the semester start.`
    : "";

  const examples = `
Examples of common syllabus formats:
1. "Assignment 1: Due Week 3 (September 15)" -> {title: "Assignment 1", due_date: "2024-09-15", type: "Assignment", weight: null}
2. "Midterm Exam - October 20, 2024 - 30%" -> {title: "Midterm Exam", due_date: "2024-10-20", type: "Exam", weight: 30}
3. "Final Project due last day of class" -> {title: "Final Project", due_date: [semester_end], type: "Project", weight: null}
4. "Homework 5: Due Monday, Week 7" -> Calculate Monday of week 7 from semester start
5. "Essay Assignment - Due: TBD" -> Skip if no date can be determined`;

  const systemPrompt = `You are an expert at extracting assignment information from academic syllabi. 
Extract ALL assignments, exams, essays, projects, and homework with their due dates.
${examples}
${semesterContext}

Date Resolution Rules:
- Convert all dates to ISO format (YYYY-MM-DD)
- If only a month is given, use the 15th of that month
- If only "Week X" is given, calculate the date from semester start (Week 1 = first week)
- Relative dates ("next Monday", "two weeks from start") should be calculated
- If year is missing, use the semester year
- If date cannot be determined, skip that assignment

Classification:
- "Assignment": regular assignments, homework, essays, papers
- "Project": projects, group work, presentations, portfolios
- "Exam": exams, tests, quizzes, midterms, finals

Weight/Percentage:
- Extract from grading section if mentioned
- Look for patterns like "30%", "worth 30 points", "30 points"
- If not found, use null

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "assignments": [
    {
      "title": "string",
      "due_date": "YYYY-MM-DD",
      "type": "Assignment" | "Project" | "Exam",
      "weight": number | null
    }
  ]
}`;

  const userPrompt = `Extract all assignments from this syllabus:\n\n${text.slice(0, 15000)}`;

  const response = await generateAnthropicCompletion(
    modelConfig.model,
    systemPrompt,
    userPrompt,
    {
      maxTokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    }
  );

  // Clean up response - remove markdown code blocks if present
  let cleanContent = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  cleanContent = cleanContent.trim();

  try {
    const parsed = JSON.parse(cleanContent);
    return parsed.assignments || [];
  } catch (error) {
    console.error("Failed to parse extraction response:", cleanContent);
    // Try to extract JSON from the response
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.assignments || [];
      } catch {
        console.error("Secondary parse also failed");
      }
    }
    return [];
  }
}

// Extract text from DOCX file using JSZip
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      throw new Error("Could not find document.xml in DOCX file");
    }
    
    // Extract text from <w:t> tags
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = textMatches
      .map((m) => m.replace(/<[^>]*>/g, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    
    return text;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(`Failed to extract text from DOCX: ${(error as Error).message}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();

    if (!document_id) {
      throw new Error("document_id is required");
    }

    console.log(`Processing document: ${document_id}`);

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get document record with course info
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*, courses(*)")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      throw new Error(`Document not found: ${docError?.message}`);
    }

    console.log(`Found document: ${doc.file_name}, type: ${doc.file_type}, document_type: ${doc.document_type}`);

    // Get semester dates for context
    const course = doc.courses as any;
    let semesterStart: string | undefined;
    let semesterEnd: string | undefined;
    
    if (course?.semester_id) {
      const { data: semester } = await supabase
        .from("semesters")
        .select("start_date, end_date")
        .eq("id", course.semester_id)
        .single();
      
      if (semester) {
        semesterStart = semester.start_date;
        semesterEnd = semester.end_date;
      }
    }

    // Skip AI processing for study resources
    if (doc.document_type !== 'syllabus') {
      console.log(`Skipping AI processing for study resource: ${doc.file_name}`);
      
      // Mark as processed without AI extraction
      await supabase
        .from("documents")
        .update({ processed: true })
        .eq("id", doc.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Study resources are not processed for extraction",
          chunks_created: 0,
          assignments_extracted: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("course_materials")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    console.log(`Downloaded file, size: ${fileData.size} bytes`);

    // Extract text based on file type
    let text = "";

    if (doc.file_type === "txt") {
      text = await fileData.text();
    } else if (doc.file_type === "pdf") {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        // pdf-parse works with Buffer or Uint8Array
        const pdfData = await pdf(new Uint8Array(arrayBuffer));
        text = pdfData.text;
        
        // Check if extraction was successful (pdf-parse returns empty text for image-only PDFs)
        if (!text || text.trim().length < 50) {
          throw new Error(
            "This PDF appears to be image-based (scanned). Please use a PDF with selectable text or convert it using OCR first."
          );
        }
      } catch (error) {
        console.error("PDF parsing error:", error);
        const errorMessage = (error as Error).message;
        if (errorMessage.includes("image") || errorMessage.includes("scanned")) {
          throw new Error(
            "Could not extract text from PDF. This PDF may be image-based (scanned). Please upload a PDF with selectable text or convert it using OCR."
          );
        }
        throw new Error(`Failed to parse PDF: ${errorMessage}`);
      }
    } else if (doc.file_type === "docx") {
      const arrayBuffer = await fileData.arrayBuffer();
      text = await extractTextFromDocx(arrayBuffer);
    }

    console.log(`Extracted ${text.length} characters from document`);

    if (!text || text.length < 50) {
      throw new Error(
        "Could not extract sufficient text from the document. Please try uploading a text file."
      );
    }

    // Step 1: Chunk the text and generate embeddings using OpenAI
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);

    // Store chunks with embeddings
    const chunkRecords = chunks.map((content, i) => ({
      document_id: doc.id,
      content,
      embedding: JSON.stringify(embeddings[i]),
      metadata: { chunk_index: i },
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunksError) {
      console.error("Failed to insert chunks:", chunksError);
    }

    // Step 2: Extract assignments using Claude Haiku 4.5 with semester context
    const extractionModel = getExtractionModel();
    const assignments = await extractAssignments(text, semesterStart, semesterEnd);
    console.log(`Extracted ${assignments.length} assignments`);

    // Log AI usage for extraction (get user from course)
    if (course?.user_id) {
      const userTier = await getUserTier(supabase, course.user_id);
      await logAIUsage(supabase, {
        userId: course.user_id,
        modelName: extractionModel.model,
        featureType: "extraction",
        inputTokens: Math.ceil(text.length / 4), // Rough estimate
        outputTokens: Math.ceil(JSON.stringify(assignments).length / 4),
        tier: userTier,
      });
      
      // Also log embedding usage
      await logAIUsage(supabase, {
        userId: course.user_id,
        modelName: "text-embedding-3-small",
        featureType: "embedding",
        inputTokens: Math.ceil(chunks.join("").length / 4),
        tier: userTier,
      });
    }

    // Insert assignments
    let assignmentsInserted = 0;
    if (assignments.length > 0) {
      const assignmentRecords = assignments.map((a) => ({
        course_id: doc.course_id,
        title: a.title,
        due_date: new Date(a.due_date).toISOString(),
        type: a.type,
        weight: a.weight,
        status: "pending",
      }));

      const { error: assignmentsError } = await supabase
        .from("assignments")
        .insert(assignmentRecords);

      if (assignmentsError) {
        console.error("Failed to insert assignments:", assignmentsError);
      } else {
        assignmentsInserted = assignments.length;
      }
    }

    // Mark document as processed
    await supabase
      .from("documents")
      .update({ processed: true })
      .eq("id", doc.id);

    // HIGH-001: Check if this is the user's first syllabus and award referrer reward
    if (course?.user_id) {
      try {
        // Check if user was referred and referrer hasn't been rewarded yet
        const { data: referral } = await supabase
          .from("referrals")
          .select("*")
          .eq("referee_id", course.user_id)
          .eq("status", "pending")
          .single();

        if (referral && !referral.referrer_rewarded) {
          // Check if this is the user's first syllabus (count = 1 after this upload)
          const { count: syllabusCount } = await supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .eq("document_type", "syllabus")
            .eq("processed", true)
            .in("course_id", 
              supabase
                .from("courses")
                .select("id")
                .eq("user_id", course.user_id)
            );

          // If this is first syllabus (count will be 1 or low), award referrer
          if (syllabusCount !== null && syllabusCount <= 1) {
            // Award referrer 100 credits
            await supabase.rpc("award_credits_internal", {
              p_user_id: referral.referrer_id,
              p_amount: 100,
              p_type: "referral_reward",
              p_description: `Referral reward - ${course.user_id} uploaded first syllabus`,
              p_respect_cap: false,
            });

            // Mark referral as completed
            await supabase
              .from("referrals")
              .update({
                status: "completed",
                referrer_rewarded: true,
                syllabus_uploaded_at: new Date().toISOString(),
              })
              .eq("id", referral.id);

            console.log(`Awarded referral reward to ${referral.referrer_id}`);
          }
        }
      } catch (refError) {
        // Don't fail the request if referral reward fails
        console.error("Failed to process referral reward:", refError);
      }
    }

    // Determine if extraction was partial (chunks created but no assignments)
    const isPartial = chunks.length > 0 && assignmentsInserted === 0;

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        assignments_extracted: assignmentsInserted,
        partial: isPartial,
        model: extractionModel.model,
        provider: extractionModel.provider,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Process document error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
