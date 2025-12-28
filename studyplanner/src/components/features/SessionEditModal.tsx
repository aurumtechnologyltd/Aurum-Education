import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, X, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudySession, Course, DayOfWeek } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface SessionEditModalProps {
  session: StudySession
  course?: Course
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: Partial<StudySession>) => Promise<void>
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const ACTIVITY_TYPES = [
  { value: 'lecture', label: 'Lecture', icon: '🎥' },
  { value: 'reading', label: 'Reading', icon: '📖' },
  { value: 'practice', label: 'Practice', icon: '✏️' },
  { value: 'lab', label: 'Lab Work', icon: '💻' },
  { value: 'review', label: 'Review', icon: '🔄' },
  { value: 'assignment', label: 'Assignment', icon: '📝' },
  { value: 'project', label: 'Project Work', icon: '🎯' },
  { value: 'other', label: 'Other', icon: '📚' },
]

// Generate time options in 30-min increments
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

function formatTimeDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes || '00'} ${ampm}`
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = parseTime(startTime)
  const endMinutes = startMinutes + durationMinutes
  const hours = Math.floor(endMinutes / 60) % 24
  const mins = endMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = parseTime(startTime)
  let endMinutes = parseTime(endTime)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60 // Handle overnight sessions
  }
  return endMinutes - startMinutes
}

export function SessionEditModal({
  session,
  course,
  open,
  onOpenChange,
  onSave,
}: SessionEditModalProps) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(session.title)
  const [description, setDescription] = useState(session.description || '')
  const [activityType, setActivityType] = useState(session.activity_type)
  const [day, setDay] = useState<string>(session.day)
  const [startTime, setStartTime] = useState(session.start_time)
  const [endTime, setEndTime] = useState(calculateEndTime(session.start_time, session.duration_minutes))
  const [resources, setResources] = useState<string[]>(
    Array.isArray(session.resources) ? (session.resources as string[]) : []
  )
  const [newResource, setNewResource] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when session changes
  useEffect(() => {
    setTitle(session.title)
    setDescription(session.description || '')
    setActivityType(session.activity_type)
    setDay(session.day)
    setStartTime(session.start_time)
    setEndTime(calculateEndTime(session.start_time, session.duration_minutes))
    setResources(Array.isArray(session.resources) ? (session.resources as string[]) : [])
    setNewResource('')
    setErrors({})
  }, [session])

  const duration = calculateDuration(startTime, endTime)
  const activityInfo = ACTIVITY_TYPES.find(a => a.value === activityType)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less'
    }

    if (description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    if (duration < 30) {
      newErrors.time = 'Session must be at least 30 minutes'
    } else if (duration > 480) {
      newErrors.time = 'Session cannot exceed 8 hours'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddResource = () => {
    if (newResource.trim()) {
      setResources(prev => [...prev, newResource.trim()])
      setNewResource('')
    }
  }

  const handleRemoveResource = (index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        activity_type: activityType,
        day,
        start_time: startTime,
        duration_minutes: duration,
        resources,
        icon: activityInfo?.icon || '📚',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save session:', error)
    } finally {
      setSaving(false)
    }
  }

  const CourseIcon = getCourseIcon(course?.icon ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: course?.color || '#3b82f6' }}
            >
              <CourseIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle>Edit Session</DialogTitle>
              <DialogDescription>
                {course?.name || 'Study Session'} • Week {session.week_number}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title"
              maxLength={100}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you study in this session?"
              rows={3}
              maxLength={500}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          {/* Activity Type */}
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day and Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={day} onValueChange={(v) => setDay(v as DayOfWeek)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue>{formatTimeDisplay(startTime)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {TIME_OPTIONS.map(time => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue>{formatTimeDisplay(endTime)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {TIME_OPTIONS.map(time => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration Display */}
          <div className={cn(
            "p-3 rounded-lg border",
            errors.time ? "bg-destructive/10 border-destructive" : "bg-muted/50"
          )}>
            {errors.time ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{errors.time}</span>
              </div>
            ) : (
              <p className="text-sm">
                <span className="font-medium">Duration:</span> {Math.floor(duration / 60)}h {duration % 60}m ({duration} minutes)
              </p>
            )}
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <Label>Resources</Label>
            <div className="flex gap-2">
              <Input
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                placeholder="Add a resource (e.g., Chapter 5, lecture-notes.pdf)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddResource()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddResource}
                disabled={!newResource.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {resources.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {resources.map((resource, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {resource}
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Non-editable info */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Cannot be changed:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Week number: Week {session.week_number}</li>
              <li>Course: {course?.name || 'Unknown'}</li>
              {session.is_completed && <li className="text-orange-600">This session is already completed</li>}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !!session.is_completed}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

