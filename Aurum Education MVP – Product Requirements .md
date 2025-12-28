StudyPlanner MVP – Product Requirements Document (PRD)
Version: 2.0 (Core RAG Chat Included)
Tech Stack: React (Vite) + Tailwind + Supabase (Auth/DB/Storage/Vectors) + OpenAI (Extraction/Chat).

1. App Overview
One-Liner: An AI-powered semester planner that converts syllabus documents into a structured study plan, calendar events, and an interactive Q&A chatbot.

Core MVP Value Loop:

Upload PDF/DOCX.

Extract assignments & dates.

Chat with the document immediately (RAG).

Plan milestones & sync to calendar.

2. Database Schema (Supabase)
The agent should create these tables. All tables must have RLS enabled (User can only CRUD their own data).

2.1 Core Tables
profiles (extends auth.users)

id (uuid, pk, refs auth.users)

full_name (text)

timezone (text, default 'UTC')

created_at (timestamptz)

semesters

id (uuid, pk)

user_id (uuid, refs profiles.id)

name (text, e.g., "Fall 2025")

start_date (date)

end_date (date)

is_active (bool, default true)

courses

id (uuid, pk)

semester_id (uuid, refs semesters.id)

user_id (uuid, refs profiles.id)

name (text, e.g., "Intro to CS")

code (text, e.g., "CS101")

color (text, hex code)

instructor (text)

2.2 RAG & Documents
documents

id (uuid, pk)

course_id (uuid, refs courses.id)

file_path (text, Supabase Storage path)

file_name (text)

file_type (text, 'pdf'|'docx'|'txt')

processed (bool, default false)

document_chunks (for RAG context)

id (bigint, pk)

document_id (uuid, refs documents.id)

content (text)

embedding (vector(1536)) -- Enable pgvector extension

metadata (jsonb, optional page numbers)

2.3 Planning & Assignments
assignments

id (uuid, pk)

course_id (uuid, refs courses.id)

title (text)

due_date (timestamptz)

type (text: 'exam'|'essay'|'project'|'homework')

weight (float, optional %)

status (text: 'pending'|'completed')

milestones

id (uuid, pk)

assignment_id (uuid, refs assignments.id)

title (text)

date (date)

is_completed (bool)

3. Screen-by-Screen Requirements
3.1 Auth & Onboarding
Screen: Login

UI: Email/Password form + "Sign in with Google" (Supabase Auth UI).

Action: On success, redirect to Dashboard.

Screen: Setup Semester (if no semester exists)

UI: Simple form: "What semester is this?" (Name, Start Date, End Date).

Action: Create semester record → Redirect to Dashboard.

3.2 Dashboard (Home)
UI:

Header: Semester switcher dropdown + "Add Course" button.

Widgets:

"This Week": List of milestones due in next 7 days.

"Upcoming Deadlines": List of assignments due soon.

Course Grid: Cards for each course (Color, Name, Code).

Nav: Sidebar [Dashboard, Calendar, Settings].

3.3 Course Detail View (The Core)
This screen has Tabs to manage the workflow.

Header: Course Name, Color picker, "Settings" gear.

Tab 1: "Overview & Chat" (RAG Q&A - Core MVP)
UI Layout: Split screen or Chat Interface.

Chat Window: Standard chat UI (User bubble, AI bubble).

Empty State: "Ask about your syllabus (e.g., 'When is the midterm?', 'Summarize the grading policy')."

Functionality:

Input: User types query.

Process: Embedding search on document_chunks for this course_id → OpenAI calls with context.

Output: Streamed text answer.

Citation: (Nice to have) "Reference: Page 2 of syllabus.pdf".

Tab 2: "Assignments & Plan"
UI:

List View: Table of assignments (Title, Type, Due Date, Weight).

Action: "Add Assignment" (Manual) or "Review Extracted" (if processing).

Timeline: Visual vertical list of milestones sorted by date.

Checkbox: Mark milestone as done.

Logic:

Assignments are populated automatically after upload extraction.

Milestones are auto-generated based on assignment type (e.g., Essay = Research [-21d], Draft [-14d]).

Tab 3: "Documents"
UI: List of uploaded files.

Action: "Upload Syllabus" button (Drag & drop).

Logic: Upload → Save to Storage → Trigger Edge Function (Extract text → Chunk → Embed → Parse Assignments).

3.4 Calendar View
UI: Full-month calendar grid (react-big-calendar or similar).

Events:

Red: Assignments (Deadlines).

Blue: Milestones (Study tasks).

Action: "Sync to Google Calendar" button (Opens OAuth modal).

4. User Journey & Data Flow
Flow A: The "Happy Path" (Upload → Plan)
User clicks "Add Course" → Enters "History 101".

User uploads syllabus.pdf in the Documents tab.

System (Background):

OCR/Text extraction.

Split: Text sent to (A) Vector Store for Chat, (B) LLM for JSON Extraction.

Create: document_chunks created.

Create: assignments created in DB (status: 'draft').

User receives notification: "Syllabus processed."

User goes to "Overview & Chat" tab → Asks "What are the essay topics?".

System retrieves chunks → Answers user.

User goes to "Assignments" tab → Reviews extracted dates → Clicks "Generate Study Plan".

System creates milestones for each assignment.

5. Technical Constraints for Agent
RAG Model: text-embedding-3-small (OpenAI) + pgvector (Supabase).

Extraction Model: gpt-4o-mini or gpt-4o with Structured Outputs (JSON Schema).

Chat Model: gpt-4o-mini (fast & cheap for chat).

Frontend: Must be responsive (mobile-friendly).

Storage: Secure bucket course_materials.

