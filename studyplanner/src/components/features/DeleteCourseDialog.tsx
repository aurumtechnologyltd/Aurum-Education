import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Course } from '@/types/database'

interface DeleteCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | null
}

export function DeleteCourseDialog({ open, onOpenChange, course }: DeleteCourseDialogProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({
    assessments: 0,
    documents: 0,
  })

  useEffect(() => {
    if (open && course) {
      fetchCounts()
    }
  }, [open, course])

  const fetchCounts = async () => {
    if (!course) return

    const [assessmentsResult, documentsResult] = await Promise.all([
      supabase
        .from('assignments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id),
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id),
    ])

    setCounts({
      assessments: assessmentsResult.count || 0,
      documents: documentsResult.count || 0,
    })
  }

  const handleDelete = async () => {
    if (!course) return

    setLoading(true)
    try {
      // Delete course (cascade delete will handle children)
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id)

      if (error) throw error

      toast.success('Course deleted successfully')
      // Dispatch event to notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('course-updated'))
      onOpenChange(false)
      navigate('/dashboard')
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Failed to delete course')
      setLoading(false)
    }
  }

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this course? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-2">
            Deleting <strong>{course.name}</strong> will remove:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>{counts.assessments} assessment{counts.assessments !== 1 ? 's' : ''}</li>
            <li>{counts.documents} document{counts.documents !== 1 ? 's' : ''}</li>
            <li>All milestones and study plans</li>
            <li>All chat messages</li>
          </ul>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Delete Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

