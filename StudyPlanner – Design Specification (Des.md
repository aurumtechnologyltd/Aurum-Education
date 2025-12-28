Aurum Education – Design Specification (Design System)
Framework: React (Vite) + Tailwind CSS + shadcn/ui (Radix Primitives).
Theme Strategy: Clean, academic, distraction-free.
Typography: Inter (Sans) or System Default.

1. Color Palette & Theming (Tailwind + CSS Variables)
The agent should configure tailwind.config.js and globals.css with these semantic tokens.
​

Base Colors (Slate/Zinc Neutral)
Background: bg-background (White / #0f172a dark)

Foreground: text-foreground (Slate-950 / Slate-50 dark)

Muted: bg-muted (Slate-100 / Slate-800) → Used for sidebars, cards backgrounds.

Border: border-border (Slate-200 / Slate-800)

Brand Colors (Academic Blue & Success Green)
Primary: bg-primary (Blue-600 / #2563eb) → CTA Buttons, Active States.

Secondary: bg-secondary (Slate-200 / Slate-800) → Cancel/Back buttons.

Accent: bg-accent (Blue-50 / Blue-900/20) → Selected rows, hover states.

Destructive: bg-destructive (Red-500) → Delete actions.

Semantic Assignments (Assignments & Milestones)
Exam: text-red-600 bg-red-50 border-red-200

Essay: text-blue-600 bg-blue-50 border-blue-200

Project: text-purple-600 bg-purple-50 border-purple-200

Homework: text-slate-600 bg-slate-50 border-slate-200

2. Typography Scale (Inter)
Use standard Tailwind prose classes.
​

H1 (Page Title): text-3xl font-bold tracking-tight (Dashboard headers).

H2 (Section): text-xl font-semibold (Course names, Card headers).

H3 (Sub-section): text-lg font-medium (Assignment titles).

Body: text-sm text-muted-foreground (Descriptions, dates).

Label: text-xs font-medium uppercase tracking-wider text-muted-foreground (Table headers, badges).

3. Component Specification (shadcn/ui Mappings)
Instruction to Agent: "Install these specific shadcn/ui components via CLI (npx shadcn-ui@latest add [component]) and use them exactly as described below."
​

3.1 Layout & Containers
Card: Use Card, CardHeader, CardTitle, CardContent for widgets (Upcoming Deadlines, Course Cards).

Sidebar: Custom aside element using Button variant="ghost" for navigation items (w-64 border-r bg-muted/10).

Separator: Use Separator to divide timeline sections.

ScrollArea: Use ScrollArea for the Chat Interface (Tab 1) and Timeline lists.

3.2 Actions & Inputs
Button:

Primary: Button (default) for "Add Course", "Generate Plan".

Secondary: Button variant="outline" for "Cancel", "Export".

Ghost: Button variant="ghost" for sidebar links.

Icon: Button size="icon" for edit/delete actions (Trash, Pencil).

Input / Textarea: Standard Input for forms.

Select: Select for "Semester" switcher and "Assignment Type" dropdown.

DatePicker: Popover + Calendar component for Due Dates.

Form: Use react-hook-form + zod + Form components (Label, Item, Message).

3.3 Feedback & Status
Badge: Use Badge for Status ('Pending', 'Completed') and Type ('Exam', 'Essay').

Variant: Create a custom outline variant or utility classes for the semantic colors above.

Progress: Use Progress bar (0-100%) for "Semester Completion".

Toast: Use Sonner or use-toast for "Syllabus processed" alerts.

Skeleton: Use Skeleton for loading states (RAG processing, list loading).

3.4 Data Display
Table: Use Table (Header, Row, Cell) for the Assignments list.

Tabs: Use Tabs, TabsList, TabsTrigger, TabsContent for the Course Detail view (Overview | Assignments | Documents).

Accordion: Use Accordion for FAQ or "Topics" list (if collapsed by week).

Dialog (Modal): Use Dialog for "Upload Syllabus" and "Confirm Study Plan" interactions.

4. Key UI Patterns (Screen-Specific Specs)
4.1 Chat Interface (Tab 1)
Container: flex flex-col h-[600px] border rounded-md.

Message List: ScrollArea taking up flex-1.

User Bubble: bg-primary text-primary-foreground ml-auto rounded-xl rounded-tr-none.

AI Bubble: bg-muted text-foreground mr-auto rounded-xl rounded-tl-none.

Input Area: Fixed at bottom. Input + Button size="icon" (Send).

4.2 Study Plan Timeline (Tab 2)
Layout: Vertical list.

Item:

Left: Checkbox (shadcn Checkbox).

Middle: Text (Title + Date). line-through text-muted-foreground when checked.

Right: Badge (Type).

4.3 Drag-and-Drop Upload (Tab 3)
Zone: div with border-2 border-dashed border-muted-foreground/25 hover:border-primary rounded-lg p-12 text-center.

State: Change background to bg-muted/50 on drag over.