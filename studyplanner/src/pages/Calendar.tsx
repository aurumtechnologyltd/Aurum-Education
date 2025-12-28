import { useEffect, useState, useCallback, useMemo } from 'react'
import type { View } from 'react-big-calendar'
import { Views } from 'react-big-calendar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react'
import {
  CalendarView,
  CreateEventModal,
  EditEventModal,
  EventDetailsModal,
  DeleteEventDialog,
} from '@/components/features/calendar'
import {
  studySessionToCalendarEvent,
  assignmentToCalendarEvent,
  milestoneToCalendarEvent,
  expandRecurringEvents,
} from '@/lib/calendarUtils'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
} from 'date-fns'
import { toast } from 'sonner'
import { useSyncCalendar } from '@/hooks/useSyncCalendar'
import { createEventReminders } from '@/lib/reminderUtils'
import type {
  Course,
  Assignment,
  CustomEvent,
  CalendarEvent as CalendarEventType,
  StudySession,
  StudyPlan,
  Milestone,
  CustomEventType as CustomEventTypeEnum,
} from '@/types/database'

type ViewOption = 'month' | 'week' | 'day' | 'agenda'

export default function CalendarPage() {
  const { user, activeSemester } = useAuth()
  const { syncCalendar } = useSyncCalendar()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewOption>('month')
  const [events, setEvents] = useState<CalendarEventType[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createInitialDate, setCreateInitialDate] = useState<Date | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventType | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCustomEvent, setEditingCustomEvent] = useState<CustomEvent | null>(null)

  // Convert view to react-big-calendar View type
  const rbcView: View = useMemo(() => {
    switch (view) {
      case 'month':
        return Views.MONTH
      case 'week':
        return Views.WEEK
      case 'day':
        return Views.DAY
      case 'agenda':
        return Views.AGENDA
      default:
        return Views.MONTH
    }
  }, [view])

  // Calculate date range based on current view
  const getDateRange = useCallback(() => {
    switch (view) {
      case 'month': {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        return {
          start: startOfWeek(monthStart),
          end: endOfWeek(monthEnd),
        }
      }
      case 'week':
        return {
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        }
      case 'day':
        return {
          start: currentDate,
          end: currentDate,
        }
      case 'agenda':
        return {
          start: currentDate,
          end: addMonths(currentDate, 1),
        }
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        }
    }
  }, [currentDate, view])

  const fetchEvents = useCallback(async () => {
    if (!activeSemester || !user) return
    setLoading(true)

    try {
      const { start, end } = getDateRange()

      // Fetch courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('semester_id', activeSemester.id)

      if (coursesData) {
        setCourses(coursesData as Course[])
      }

      const courseIds = coursesData?.map((c) => c.id) || []
      const courseMap = new Map(coursesData?.map((c) => [c.id, c as Course]) || [])

      // Fetch data in parallel
      const [assignmentsResult, customEventsResult, studyPlanResult] = await Promise.all([
        // Assignments
        courseIds.length > 0
          ? supabase
        .from('assignments')
        .select('*')
        .in('course_id', courseIds)
              .gte('due_date', start.toISOString())
              .lte('due_date', end.toISOString())
          : { data: [] },
        // Custom events
        supabase
          .from('custom_events')
          .select('*, course:courses(*)')
          .eq('user_id', user.id)
          .or(`start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()}`),
        // Study plan for sessions
      supabase
          .from('study_plans')
          .select('*')
          .eq('semester_id', activeSemester.id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
      ])

      const calendarEvents: CalendarEventType[] = []

    // Add assignments
    if (assignmentsResult.data) {
        assignmentsResult.data.forEach((a) => {
          const course = courseMap.get(a.course_id)
          calendarEvents.push(assignmentToCalendarEvent(a as Assignment, course))
        })
      }

      // Add custom events (with recurrence expansion)
      if (customEventsResult.data) {
        customEventsResult.data.forEach((e) => {
          const course = e.course as Course | null
          const expanded = expandRecurringEvents(e as CustomEvent, start, end, course || undefined)
          calendarEvents.push(...expanded)
        })
      }

      // Add study sessions if we have an active plan
      if (studyPlanResult.data) {
        const plan = studyPlanResult.data as StudyPlan
        const semesterStart = parseISO(activeSemester.start_date)

        const { data: sessionsData } = await supabase
          .from('study_sessions')
          .select('*, course:courses(*)')
          .eq('plan_id', plan.id)

        if (sessionsData) {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          sessionsData.forEach((s) => {
            const event = studySessionToCalendarEvent(
              s as StudySession,
              semesterStart,
              timezone
            )
            // Only include if within range
            if (event.start >= start && event.start <= end) {
              calendarEvents.push(event)
            }
          })
        }
      }

      // Fetch milestones
      const assignmentIds = assignmentsResult.data?.map((a) => a.id) || []
      if (assignmentIds.length > 0) {
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select('*, assignment:assignments(*)')
          .in('assignment_id', assignmentIds)
          .eq('is_completed', false)

        if (milestonesData) {
          milestonesData.forEach((m) => {
            const assignment = m.assignment as Assignment | null
            const course = assignment ? courseMap.get(assignment.course_id) : undefined
            calendarEvents.push(
              milestoneToCalendarEvent(m as Milestone, assignment || undefined, course)
            )
          })
        }
      }

      setEvents(calendarEvents)
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      toast.error('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [activeSemester, user, getDateRange])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Navigation handlers
  const handleNavigate = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      if (direction === 'today') {
        setCurrentDate(new Date())
        return
      }

      const delta = direction === 'next' ? 1 : -1

      switch (view) {
        case 'month':
          setCurrentDate((d) => (delta > 0 ? addMonths(d, 1) : subMonths(d, 1)))
          break
        case 'week':
          setCurrentDate((d) => (delta > 0 ? addWeeks(d, 1) : subWeeks(d, 1)))
          break
        case 'day':
          setCurrentDate((d) => (delta > 0 ? addDays(d, 1) : subDays(d, 1)))
          break
        case 'agenda':
          setCurrentDate((d) => (delta > 0 ? addMonths(d, 1) : subMonths(d, 1)))
          break
      }
    },
    [view]
  )

  // Event handlers
  const handleSelectEvent = useCallback((event: CalendarEventType) => {
    setSelectedEvent(event)
    setDetailsModalOpen(true)
  }, [])

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setCreateInitialDate(slotInfo.start)
    setCreateModalOpen(true)
  }, [])

  const handleCreateEvent = async (eventData: {
    title: string
    description: string | null
    event_type: CustomEventTypeEnum
    course_id: string | null
    start_time: Date
    end_time: Date
    is_all_day: boolean
    location: string | null
    color: string
    recurrence_rule: string | null
  }) => {
    if (!user) return

    const { error } = await supabase.from('custom_events').insert({
      user_id: user.id,
      title: eventData.title,
      description: eventData.description,
      event_type: eventData.event_type,
      course_id: eventData.course_id,
      start_time: eventData.start_time.toISOString(),
      end_time: eventData.end_time.toISOString(),
      is_all_day: eventData.is_all_day,
      location: eventData.location,
      color: eventData.color,
      recurrence_rule: eventData.recurrence_rule,
    })

    if (error) {
      toast.error('Failed to create event')
      throw error
    }

    toast.success('Event created')
    
    // Create reminders for the new event
    if (user) {
      try {
        const { data: newEvent } = await supabase
          .from('custom_events')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (newEvent && eventData.start_time) {
          await createEventReminders({
            eventType: 'custom_event',
            eventId: newEvent.id,
            eventTime: eventData.start_time,
            userId: user.id,
          })
        }
      } catch (reminderError) {
        console.error('Failed to create reminders:', reminderError)
      }
    }
    
    fetchEvents()
    // Auto-sync to calendar if connected
    await syncCalendar()
  }

  const handleEditClick = async () => {
    if (!selectedEvent) return

    if (selectedEvent.type === 'custom_event') {
      // Fetch the full custom event
      const { data } = await supabase
        .from('custom_events')
        .select('*')
        .eq('id', selectedEvent.originalId)
        .single()

      if (data) {
        setEditingCustomEvent(data as CustomEvent)
      }
    }

    setDetailsModalOpen(false)
    setEditModalOpen(true)
  }

  const handleEditEvent = async (
    updates: {
      title: string
      description: string | null
      event_type?: CustomEventTypeEnum
      course_id: string | null
      start_time: Date
      end_time: Date
      is_all_day: boolean
      location: string | null
      color: string
      recurrence_rule: string | null
    },
    _scope: 'single' | 'all' | 'future'
  ) => {
    if (!selectedEvent) return

    if (selectedEvent.type === 'custom_event') {
      const { error } = await supabase
        .from('custom_events')
        .update({
          title: updates.title,
          description: updates.description,
          event_type: updates.event_type,
          course_id: updates.course_id,
          start_time: updates.start_time.toISOString(),
          end_time: updates.end_time.toISOString(),
          is_all_day: updates.is_all_day,
          location: updates.location,
          color: updates.color,
          recurrence_rule: updates.recurrence_rule,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.originalId)

      if (error) {
        toast.error('Failed to update event')
        throw error
      }
    } else if (selectedEvent.type === 'study_session') {
      // For study sessions, only update time-related fields
      const { error } = await supabase
        .from('study_sessions')
        .update({
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.originalId)

      if (error) {
        toast.error('Failed to update session')
        throw error
      }
    }

    toast.success('Event updated')
    setEditingCustomEvent(null)
    fetchEvents()
  }

  const handleDeleteClick = () => {
    setDetailsModalOpen(false)
    setDeleteDialogOpen(true)
  }

  const handleDeleteEvent = async (_option: 'single' | 'all' | 'future') => {
    if (!selectedEvent) return

    if (selectedEvent.type === 'custom_event') {
      const { error } = await supabase
        .from('custom_events')
        .delete()
        .eq('id', selectedEvent.originalId)

      if (error) {
        toast.error('Failed to delete event')
        throw error
      }
    } else if (selectedEvent.type === 'assessment') {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', selectedEvent.originalId)

      if (error) {
        toast.error('Failed to delete assessment')
        throw error
      }
    } else if (selectedEvent.type === 'study_session') {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', selectedEvent.originalId)

      if (error) {
        toast.error('Failed to delete session')
        throw error
      }
    }

    toast.success('Event deleted')
    setSelectedEvent(null)
    fetchEvents()
    // Auto-sync to calendar if connected
    await syncCalendar()
  }

  const handleMarkComplete = async () => {
    if (!selectedEvent || selectedEvent.type !== 'study_session') return

    const { error } = await supabase
      .from('study_sessions')
      .update({
        is_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedEvent.originalId)

    if (error) {
      toast.error('Failed to mark complete')
      return
    }

    toast.success('Session marked complete')
    setDetailsModalOpen(false)
    setSelectedEvent(null)
    fetchEvents()
  }

  const handleSyncCalendar = async () => {
    if (!user || !activeSemester) return

    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.functions.invoke('sync-calendar', {
        body: {
          user_id: user.id,
          semester_id: activeSemester.id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (error) throw error
      toast.success('Calendar synced to Google')
      fetchEvents()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Failed to sync calendar')
    } finally {
      setSyncing(false)
    }
  }

  // Get title based on current view and date
  const getTitle = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      case 'week':
        return format(currentDate, "'Week of' MMM d, yyyy")
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'agenda':
        return format(currentDate, 'MMMM yyyy')
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage your schedule and events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncCalendar} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
        </Button>
        </div>
      </div>

      {/* Calendar Card */}
        <Card>
        <CardContent className="p-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                onClick={() => handleNavigate('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                onClick={() => handleNavigate('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('today')}
              >
                Today
              </Button>
              <h2 className="text-lg font-semibold ml-2">{getTitle()}</h2>
            </div>

            {/* View Selector */}
            <Select
              value={view}
              onValueChange={(v) => setView(v as ViewOption)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="agenda">Agenda</SelectItem>
              </SelectContent>
            </Select>
            </div>

          {/* Calendar */}
          <CalendarView
            events={events}
            view={rbcView}
            date={currentDate}
            onViewChange={(v) => {
              const viewMap: Record<View, ViewOption> = {
                month: 'month',
                week: 'week',
                day: 'day',
                agenda: 'agenda',
                work_week: 'week',
              }
              setView(viewMap[v] || 'month')
            }}
            onDateChange={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
          </CardContent>
        </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">Assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Study Session</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Custom Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-muted-foreground">Milestone</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        courses={courses}
        onSave={handleCreateEvent}
        initialDate={createInitialDate}
      />

      <EventDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        event={selectedEvent}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onMarkComplete={
          selectedEvent?.type === 'study_session' && !selectedEvent?.isCompleted
            ? handleMarkComplete
            : undefined
        }
      />

      <EditEventModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) setEditingCustomEvent(null)
        }}
        event={selectedEvent}
        originalEvent={editingCustomEvent || undefined}
        courses={courses}
        onSave={handleEditEvent}
      />

      <DeleteEventDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        event={selectedEvent}
        onConfirm={handleDeleteEvent}
      />
    </div>
  )
}
