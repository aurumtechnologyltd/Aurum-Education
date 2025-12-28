import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Loader2, Palette } from 'lucide-react'
import { format, setHours, setMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import { RecurrenceSelector } from './RecurrenceSelector'
import type { CalendarEvent, Course, CustomEventType, CustomEvent } from '@/types/database'

type EditScope = 'single' | 'all' | 'future'

const EVENT_TYPES: { value: CustomEventType; label: string }[] = [
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Office Hours', label: 'Office Hours' },
  { value: 'Study Group', label: 'Study Group' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Other', label: 'Other' },
]

const PRESET_COLORS = [
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#6366f1', // Indigo
]

interface EditEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  originalEvent?: CustomEvent
  courses: Course[]
  onSave: (
    updates: {
      title: string
      description: string | null
      event_type?: CustomEventType
      course_id: string | null
      start_time: Date
      end_time: Date
      is_all_day: boolean
      location: string | null
      color: string
      recurrence_rule: string | null
    },
    scope: EditScope
  ) => Promise<void>
}

export function EditEventModal({
  open,
  onOpenChange,
  event,
  originalEvent,
  courses,
  onSave,
}: EditEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<CustomEventType>('Personal')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState('10:00')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [color, setColor] = useState('#22c55e')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  const [editScope, setEditScope] = useState<EditScope>('single')
  const [error, setError] = useState<string | null>(null)

  const isRecurring = event?.isRecurring
  const isCustomEvent = event?.type === 'custom_event'
  const isStudySession = event?.type === 'study_session'

  // Populate form when event changes
  useEffect(() => {
    if (event && open) {
      setTitle(event.title)
      setDescription(event.description || '')
      setStartDate(event.start)
      setStartTime(format(event.start, 'HH:mm'))
      setEndDate(event.end)
      setEndTime(format(event.end, 'HH:mm'))
      setIsAllDay(event.allDay || false)
      setLocation(event.location || '')
      setColor(event.color)
      setRecurrenceRule(event.recurrenceRule || null)
      setCourseId(event.courseId || null)
      setEditScope('single')
      setError(null)

      // For custom events, also set event type from original
      if (originalEvent) {
        setEventType(originalEvent.event_type)
      }
    }
  }, [event, originalEvent, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!startDate || !endDate) {
      setError('Start and end dates are required')
      return
    }

    // Build datetime values
    let startDateTime: Date
    let endDateTime: Date

    if (isAllDay) {
      startDateTime = startDate
      endDateTime = endDate
    } else {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      startDateTime = setMinutes(setHours(startDate, startHour), startMin)
      endDateTime = setMinutes(setHours(endDate, endHour), endMin)
    }

    if (startDateTime >= endDateTime) {
      setError('End time must be after start time')
      return
    }

    setLoading(true)
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || null,
          event_type: isCustomEvent ? eventType : undefined,
          course_id: courseId,
          start_time: startDateTime,
          end_time: endDateTime,
          is_all_day: isAllDay,
          location: location.trim() || null,
          color,
          recurrence_rule: recurrenceRule,
        },
        isRecurring ? editScope : 'single'
      )
      onOpenChange(false)
    } catch (err) {
      setError('Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {isStudySession ? 'Study Session' : 'Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recurring event scope */}
          {isRecurring && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">This is a recurring event</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editScope"
                    value="single"
                    checked={editScope === 'single'}
                    onChange={() => setEditScope('single')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Edit this event only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editScope"
                    value="future"
                    checked={editScope === 'future'}
                    onChange={() => setEditScope('future')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Edit this and future events</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editScope"
                    value="all"
                    checked={editScope === 'all'}
                    onChange={() => setEditScope('all')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Edit all events in the series</span>
                </label>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          {/* Event Type & Course (only for custom events) */}
          {isCustomEvent && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as CustomEventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course (optional)</Label>
                <Select
                  value={courseId || 'none'}
                  onValueChange={(v) => setCourseId(v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code || course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* All Day Toggle (only for custom events) */}
          {isCustomEvent && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={isAllDay}
                onCheckedChange={(checked) => setIsAllDay(checked === true)}
              />
              <Label htmlFor="allDay" className="font-normal cursor-pointer">
                All day event
              </Label>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d') : 'Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        if (date && (!endDate || endDate < date)) {
                          setEndDate(date)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {!isAllDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-28"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>End</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d') : 'Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {!isAllDay && (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-28"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room, building, or meeting link"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this event..."
              rows={3}
            />
          </div>

          {/* Color (only for custom events) */}
          {isCustomEvent && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color
              </Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color === c
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Recurrence (only for custom events) */}
          {isCustomEvent && (
            <RecurrenceSelector
              value={recurrenceRule}
              onChange={setRecurrenceRule}
              startDate={startDate}
            />
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

