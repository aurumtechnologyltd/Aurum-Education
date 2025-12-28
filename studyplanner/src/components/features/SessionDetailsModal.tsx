import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Check, Clock, FileText, Star, Pencil, Calendar } from 'lucide-react'
import type { StudySession, Course } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface SessionDetailsModalProps {
  session: StudySession
  course?: Course
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartSession: () => void
  onMarkComplete: () => void
  onEdit?: () => void
  onReschedule?: () => void
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes || '00'} ${ampm}`
}

const ACTIVITY_LABELS: Record<string, string> = {
  lecture: 'Watch Lecture',
  reading: 'Reading',
  practice: 'Practice Problems',
  lab: 'Lab Work',
  review: 'Review Session',
  assignment: 'Assignment Work',
  project: 'Project Work',
}

export function SessionDetailsModal({
  session,
  course,
  open,
  onOpenChange,
  onStartSession,
  onMarkComplete,
  onEdit,
  onReschedule,
}: SessionDetailsModalProps) {
  const CourseIcon = getCourseIcon(course?.icon ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: course?.color || '#3b82f6' }}
            >
              <CourseIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="text-xl">{session.icon}</span>
                <span className="truncate">{session.title}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {course?.name || 'Study Session'}
              </DialogDescription>
            </div>
            {/* Edit button in header */}
            {!session.is_completed && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            {session.is_completed ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <Check className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Scheduled
              </Badge>
            )}
            <Badge variant="outline">
              {ACTIVITY_LABELS[session.activity_type] || session.activity_type}
            </Badge>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Day</p>
              <p className="font-medium">{session.day}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">{formatTime(session.start_time)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{session.duration_minutes} minutes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Week</p>
              <p className="font-medium">Week {session.week_number}</p>
            </div>
          </div>

          {session.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{session.description}</p>
              </div>
            </>
          )}

          {session.resources && Array.isArray(session.resources) && session.resources.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Resources</p>
                <div className="flex flex-wrap gap-2">
                  {(session.resources as string[]).map((resource: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="font-normal">
                      <FileText className="w-3 h-3 mr-1" />
                      {resource}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Completion details if completed */}
          {session.is_completed && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Session Summary</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {session.actual_duration_minutes && (
                    <div>
                      <p className="text-muted-foreground">Actual Duration</p>
                      <p className="font-medium">{session.actual_duration_minutes} minutes</p>
                    </div>
                  )}
                  {session.rating && (
                    <div>
                      <p className="text-muted-foreground">Rating</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= session.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {session.notes && (
                  <div>
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm mt-1 p-2 bg-muted/50 rounded">{session.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!session.is_completed && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onMarkComplete}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
              <Button className="flex-1" onClick={onStartSession}>
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </div>
            {onReschedule && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={onReschedule}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Reschedule
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

