import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Pencil, Trash2, MessageSquare, ListTodo, FileText, BarChart3 } from 'lucide-react'
import type { Course, Document, Assignment, Milestone } from '@/types/database'

// Tab Components
import { OverviewTab } from '@/components/features/OverviewTab'
import { ChatTab } from '@/components/features/ChatTab'
import { AssignmentsTab } from '@/components/features/AssignmentsTab'
import { DocumentsTab } from '@/components/features/DocumentsTab'
import { CourseEditModal, getCourseIcon } from '@/components/features/CourseEditModal'
import { DeleteCourseDialog } from '@/components/features/DeleteCourseDialog'

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  const fetchCourseData = async () => {
    if (!courseId) return
    setLoading(true)

    // Fetch course details
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (courseData) {
      setCourse(courseData)

      // Fetch related data in parallel
      const [docsResult, assignmentsResult] = await Promise.all([
        supabase.from('documents').select('*').eq('course_id', courseId).order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').eq('course_id', courseId).order('due_date', { ascending: true }),
      ])

      if (docsResult.data) setDocuments(docsResult.data)
      if (assignmentsResult.data) {
        setAssignments(assignmentsResult.data)
        
        // Fetch milestones for these assignments
        const assignmentIds = assignmentsResult.data.map(a => a.id)
        if (assignmentIds.length > 0) {
          const { data: milestonesData } = await supabase
            .from('milestones')
            .select('*')
            .in('assignment_id', assignmentIds)
            .order('date', { ascending: true })
          
          if (milestonesData) setMilestones(milestonesData)
        }
      }
    }

    setLoading(false)
  }

  const refreshDocuments = async () => {
    if (!courseId) return
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    if (data) setDocuments(data)
  }

  const refreshAssignments = async () => {
    if (!courseId) return
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true })
    if (data) {
      setAssignments(data)
      
      // Also refresh milestones
      const assignmentIds = data.map(a => a.id)
      if (assignmentIds.length > 0) {
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select('*')
          .in('assignment_id', assignmentIds)
          .order('date', { ascending: true })
        
        if (milestonesData) setMilestones(milestonesData)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium mb-2">Course not found</h2>
        <p className="text-muted-foreground mb-4">This course may have been deleted.</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  const CourseIcon = getCourseIcon(course.icon)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: course.color || '#2563eb' }}
          >
            <CourseIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{course.name}</h1>
            <p className="text-muted-foreground">
              {course.code && `${course.code} • `}
              {course.instructor || 'No instructor'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setEditModalOpen(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <CourseEditModal
        course={course}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={(updatedCourse) => {
          setCourse(updatedCourse)
          // Dispatch event to notify sidebar to refresh
          window.dispatchEvent(new CustomEvent('course-updated'))
        }}
      />

      {/* Delete Dialog */}
      <DeleteCourseDialog
        course={course}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <ListTodo className="w-4 h-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab 
            course={course}
            assignments={assignments}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatTab 
            courseId={course.id} 
            hasDocuments={documents.some(d => d.document_type === 'syllabus' && d.processed)} 
          />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentsTab 
            courseId={course.id}
            assignments={assignments}
            milestones={milestones}
            onRefresh={refreshAssignments}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab 
            courseId={course.id}
            documents={documents}
            onUploadComplete={refreshDocuments}
            onProcessingComplete={() => {
              refreshDocuments()
              refreshAssignments()
            }}
            onOpenAssignmentsTab={() => {
              // Switch to assignments tab
              const tabsList = document.querySelector('[role="tablist"]')
              const assignmentsTab = tabsList?.querySelector('[value="assignments"]') as HTMLElement
              assignmentsTab?.click()
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

