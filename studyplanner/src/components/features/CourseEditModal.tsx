import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Course } from '@/types/database'

// Import all available icons
import {
  BookOpen,
  GraduationCap,
  Atom,
  Calculator,
  Globe,
  Palette,
  Music,
  Code,
  FlaskConical,
  Scale,
  Heart,
  Briefcase,
  TrendingUp,
  Languages,
  History,
  type LucideIcon,
} from 'lucide-react'

// Course icon options
export const COURSE_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'book-open', icon: BookOpen, label: 'Book' },
  { id: 'graduation-cap', icon: GraduationCap, label: 'Graduation' },
  { id: 'atom', icon: Atom, label: 'Science' },
  { id: 'calculator', icon: Calculator, label: 'Math' },
  { id: 'globe', icon: Globe, label: 'Geography' },
  { id: 'palette', icon: Palette, label: 'Art' },
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'code', icon: Code, label: 'Programming' },
  { id: 'flask-conical', icon: FlaskConical, label: 'Chemistry' },
  { id: 'scale', icon: Scale, label: 'Law' },
  { id: 'heart', icon: Heart, label: 'Health' },
  { id: 'briefcase', icon: Briefcase, label: 'Business' },
  { id: 'trending-up', icon: TrendingUp, label: 'Economics' },
  { id: 'languages', icon: Languages, label: 'Languages' },
  { id: 'history', icon: History, label: 'History' },
]

// Helper to get icon component by ID
export function getCourseIcon(iconId: string | null): LucideIcon {
  const found = COURSE_ICONS.find(i => i.id === iconId)
  return found?.icon || BookOpen
}

// Character limits for course fields
export const COURSE_FIELD_LIMITS = {
  name: 60,
  code: 20,
  instructor: 50,
} as const

interface CourseEditModalProps {
  course: Course
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updatedCourse: Course) => void
}

export function CourseEditModal({ course, open, onOpenChange, onSave }: CourseEditModalProps) {
  const [name, setName] = useState(course.name)
  const [code, setCode] = useState(course.code || '')
  const [instructor, setInstructor] = useState(course.instructor || '')
  const [credits, setCredits] = useState(course.credits?.toString() || '')
  const [selectedIcon, setSelectedIcon] = useState(course.icon || 'book-open')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Course name is required')
      return
    }

    // Validate character limits
    if (name.length > COURSE_FIELD_LIMITS.name) {
      toast.error(`Course name must be ${COURSE_FIELD_LIMITS.name} characters or less`)
      return
    }
    if (code.length > COURSE_FIELD_LIMITS.code) {
      toast.error(`Course code must be ${COURSE_FIELD_LIMITS.code} characters or less`)
      return
    }
    if (instructor.length > COURSE_FIELD_LIMITS.instructor) {
      toast.error(`Instructor name must be ${COURSE_FIELD_LIMITS.instructor} characters or less`)
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .update({
          name: name.trim(),
          code: code.trim() || null,
          instructor: instructor.trim() || null,
          credits: credits ? parseInt(credits, 10) : null,
          icon: selectedIcon,
        })
        .eq('id', course.id)
        .select()
        .single()

      if (error) throw error

      toast.success('Course updated successfully')
      onSave(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Failed to update course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update your course details and choose an icon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Course Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">Course Name</Label>
              <span className="text-xs text-muted-foreground">
                {name.length}/{COURSE_FIELD_LIMITS.name}
              </span>
            </div>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= COURSE_FIELD_LIMITS.name) {
                  setName(value)
                }
              }}
              placeholder="e.g., Introduction to Psychology"
              maxLength={COURSE_FIELD_LIMITS.name}
            />
          </div>

          {/* Course Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="code">Course Code</Label>
              <span className="text-xs text-muted-foreground">
                {code.length}/{COURSE_FIELD_LIMITS.code}
              </span>
            </div>
            <Input
              id="code"
              value={code}
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= COURSE_FIELD_LIMITS.code) {
                  setCode(value)
                }
              }}
              placeholder="e.g., PSY 101"
              maxLength={COURSE_FIELD_LIMITS.code}
            />
          </div>

          {/* Instructor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="instructor">Instructor</Label>
              <span className="text-xs text-muted-foreground">
                {instructor.length}/{COURSE_FIELD_LIMITS.instructor}
              </span>
            </div>
            <Input
              id="instructor"
              value={instructor}
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= COURSE_FIELD_LIMITS.instructor) {
                  setInstructor(value)
                }
              }}
              placeholder="e.g., Dr. Jane Smith"
              maxLength={COURSE_FIELD_LIMITS.instructor}
            />
          </div>

          {/* Credits */}
          <div className="space-y-2">
            <Label htmlFor="credits">Credits</Label>
            <Input
              id="credits"
              type="number"
              min="0"
              max="12"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="e.g., 3"
            />
            <p className="text-xs text-muted-foreground">
              Number of credit hours for GPA calculation
            </p>
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Course Icon</Label>
            <div className="grid grid-cols-5 gap-2">
              {COURSE_ICONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedIcon(id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-accent',
                    selectedIcon === id
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-muted/50'
                  )}
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

