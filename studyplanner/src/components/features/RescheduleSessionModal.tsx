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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudySession, Course, DayOfWeek } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface RescheduleSessionModalProps {
  session: StudySession
  course?: Course
  allSessions: StudySession[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onReschedule: (updates: { day: DayOfWeek; start_time: string; duration_minutes: number }) => Promise<void>
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Generate time options in 30-min increments
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 6; h < 24; h++) {
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
    endMinutes += 24 * 60
  }
  return endMinutes - startMinutes
}

export function RescheduleSessionModal({
  session,
  course,
  allSessions,
  open,
  onOpenChange,
  onReschedule,
}: RescheduleSessionModalProps) {
  const [saving, setSaving] = useState(false)
  const [day, setDay] = useState<string>(session.day)
  const [startTime, setStartTime] = useState(session.start_time)
  const [endTime, setEndTime] = useState(calculateEndTime(session.start_time, session.duration_minutes))
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<StudySession | null>(null)

  // Reset form when session changes
  useEffect(() => {
    setDay(session.day)
    setStartTime(session.start_time)
    setEndTime(calculateEndTime(session.start_time, session.duration_minutes))
    setError(null)
    setConflict(null)
  }, [session])

  const duration = calculateDuration(startTime, endTime)

  // Check for conflicts
  useEffect(() => {
    const newStart = parseTime(startTime)
    const newEnd = newStart + duration

    const conflictingSession = allSessions.find(s => {
      if (s.id === session.id) return false
      if (s.week_number !== session.week_number) return false
      if (s.day !== day) return false

      const existingStart = parseTime(s.start_time)
      const existingEnd = existingStart + s.duration_minutes

      // Check overlap
      return newStart < existingEnd && newEnd > existingStart
    })

    setConflict(conflictingSession || null)
  }, [day, startTime, duration, allSessions, session.id, session.week_number])

  const validate = (): boolean => {
    if (duration < 30) {
      setError('Session must be at least 30 minutes')
      return false
    }
    if (duration > 480) {
      setError('Session cannot exceed 8 hours')
      return false
    }
    setError(null)
    return true
  }

  const handleReschedule = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      await onReschedule({
        day: day as DayOfWeek,
        start_time: startTime,
        duration_minutes: duration,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to reschedule session:', err)
      setError('Failed to reschedule session')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = day !== session.day || 
    startTime !== session.start_time || 
    duration !== session.duration_minutes

  const CourseIcon = getCourseIcon(course?.icon ?? null)

  if (session.is_completed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot Reschedule</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This session has already been completed. You cannot reschedule a completed session.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: course?.color || '#3b82f6' }}
            >
              <CourseIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Reschedule Session
              </DialogTitle>
              <DialogDescription className="mt-1">
                {session.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Schedule */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Schedule</p>
            <p className="font-medium">
              {session.day} at {formatTimeDisplay(session.start_time)} • {session.duration_minutes} min
            </p>
          </div>

          {/* Day Selection */}
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

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-3">
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
            error ? "bg-destructive/10 border-destructive" : "bg-muted/50"
          )}>
            {error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            ) : (
              <p className="text-sm">
                <span className="font-medium">New Duration:</span> {Math.floor(duration / 60)}h {duration % 60}m
              </p>
            )}
          </div>

          {/* Conflict Warning */}
          {conflict && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                This time conflicts with "{conflict.title}" ({formatTimeDisplay(conflict.start_time)} - {formatTimeDisplay(calculateEndTime(conflict.start_time, conflict.duration_minutes))})
              </AlertDescription>
            </Alert>
          )}

          {/* Warning about calendar sync */}
          <p className="text-xs text-muted-foreground">
            This will update your study plan. If you have calendar sync enabled, your calendar event will also be updated.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleReschedule} 
            disabled={saving || !hasChanges || !!error}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rescheduling...
              </>
            ) : (
              'Reschedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

