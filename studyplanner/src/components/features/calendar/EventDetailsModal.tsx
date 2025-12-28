import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  ExternalLink,
  Repeat,
} from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  getEventTypeLabel,
  formatDuration,
  getRecurrenceDescription,
} from '@/lib/calendarUtils'
import type { CalendarEvent } from '@/types/database'

interface EventDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  onEdit: () => void
  onDelete: () => void
  onMarkComplete?: () => void
}

export function EventDetailsModal({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
  onMarkComplete,
}: EventDetailsModalProps) {
  if (!event) return null

  const duration = differenceInMinutes(event.end, event.start)
  const isAssessment = event.type === 'assessment'
  const isStudySession = event.type === 'study_session'
  const isCustomEvent = event.type === 'custom_event'
  const canEdit = isCustomEvent || isStudySession
  const canDelete = true

  const getTypeColor = () => {
    switch (event.type) {
      case 'assessment':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'study_session':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'custom_event':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'milestone':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: event.color }}
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl leading-tight">
                {event.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className={cn('text-xs', getTypeColor())}>
                  {getEventTypeLabel(event.type)}
                </Badge>
                {isAssessment && event.assignmentType && (
                  <Badge variant="outline" className="text-xs">
                    {event.assignmentType}
                  </Badge>
                )}
                {isStudySession && event.activityType && (
                  <Badge variant="outline" className="text-xs">
                    {event.activityType}
                  </Badge>
                )}
                {event.isRecurring && (
                  <Badge variant="outline" className="text-xs">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                {event.isCompleted && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {format(event.start, 'EEEE, MMMM d, yyyy')}
              </p>
              {!event.allDay && (
                <p className="text-sm text-muted-foreground">
                  {format(event.start, 'h:mm a')} – {format(event.end, 'h:mm a')}
                </p>
              )}
              {event.allDay && (
                <p className="text-sm text-muted-foreground">All day</p>
              )}
            </div>
          </div>

          {/* Duration */}
          {!event.allDay && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{formatDuration(duration)}</p>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{event.location}</p>
                {event.location.startsWith('http') && (
                  <a
                    href={event.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Course */}
          {event.courseName && (
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{event.courseName}</p>
                {event.courseCode && (
                  <p className="text-sm text-muted-foreground">{event.courseCode}</p>
                )}
              </div>
            </div>
          )}

          {/* Recurrence */}
          {event.recurrenceRule && (
            <div className="flex items-start gap-3">
              <Repeat className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium capitalize">
                  {getRecurrenceDescription(event.recurrenceRule)}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{event.description}</p>
              </div>
            </>
          )}

          {/* Assessment-specific info */}
          {isAssessment && event.weight && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="font-medium">{event.weight}%</span>
              </div>
            </>
          )}

          {/* Study session-specific info */}
          {isStudySession && event.weekNumber && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Week</span>
                <span className="font-medium">Week {event.weekNumber}</span>
              </div>
            </>
          )}

          {/* Sync Status */}
          <Separator />
          <div className="flex items-center gap-2 text-sm">
            {event.isSynced ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Synced to Google Calendar</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Not synced</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {isStudySession && !event.isCompleted && onMarkComplete && (
              <Button size="sm" onClick={onMarkComplete}>
                <Check className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

