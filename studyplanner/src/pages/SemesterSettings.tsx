import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { SemesterEditModal } from '@/components/features/SemesterEditModal'
import type { Course, Assignment } from '@/types/database'

export default function SemesterSettings() {
  const navigate = useNavigate()
  const { activeSemester, semesters, refreshSemesters } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [_loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (activeSemester) {
      fetchSemesterData()
    }
  }, [activeSemester])

  const fetchSemesterData = async () => {
    if (!activeSemester) return
    setLoading(true)

    // Fetch courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('semester_id', activeSemester.id)

    if (coursesData) {
      setCourses(coursesData)

      // Fetch assignments for progress calculation
      const courseIds = coursesData.map(c => c.id)
      if (courseIds.length > 0) {
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('*')
          .in('course_id', courseIds)

        if (assignmentsData) {
          setAssignments(assignmentsData)
        }
      }
    }

    setLoading(false)
  }

  // Calculate semester progress based on assessment completion
  const semesterProgress = (() => {
    if (assignments.length === 0) return 0
    const completedCount = assignments.filter(a => a.status === 'done').length
    return Math.round((completedCount / assignments.length) * 100)
  })()

  const handleDelete = async () => {
    if (!activeSemester) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', activeSemester.id)

      if (error) throw error

      toast.success('Semester deleted successfully')
      await refreshSemesters()

      // Redirect based on remaining semesters
      if (semesters.length <= 1) {
        navigate('/setup')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error deleting semester:', error)
      toast.error('Failed to delete semester')
      setDeleting(false)
    }
  }

  if (!activeSemester) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Semester Settings</h1>
          <p className="text-muted-foreground mt-1">
            No active semester selected
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Semester Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your current semester settings
        </p>
      </div>

      {/* Semester Information */}
      <Card>
        <CardHeader>
          <CardTitle>Semester Information</CardTitle>
          <CardDescription>
            Current semester details and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Semester Name</span>
              <span className="text-sm">{activeSemester.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Start Date</span>
              <span className="text-sm">{format(new Date(activeSemester.start_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">End Date</span>
              <span className="text-sm">{format(new Date(activeSemester.end_date), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Semester Progress</span>
                <span className="text-sm text-muted-foreground">{semesterProgress}%</span>
              </div>
              <Progress value={semesterProgress} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{assignments.filter(a => a.status === 'done').length} completed</span>
                <span>{assignments.length} total assessments</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Edit or delete this semester
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Semester
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Semester
            </Button>
          </div>

          {/* Delete Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Deleting this semester will permanently remove {courses.length} course{courses.length !== 1 ? 's' : ''} and all associated data including assessments, documents, milestones, and chat messages. This action cannot be undone.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <SemesterEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        semester={activeSemester}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Semester</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this semester? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Deleting <strong>{activeSemester.name}</strong> will remove:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>{courses.length} course{courses.length !== 1 ? 's' : ''}</li>
              <li>All assessments and milestones</li>
              <li>All documents and chat messages</li>
              <li>All study plans</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete Semester
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

