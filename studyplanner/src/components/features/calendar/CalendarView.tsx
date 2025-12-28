import { useMemo, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/types/database'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

interface CalendarViewProps {
  events: CalendarEvent[]
  view: View
  date: Date
  onViewChange: (view: View) => void
  onDateChange: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
}

// Custom event component for better styling
function EventComponent({ event }: { event: CalendarEvent }) {
  const isSynced = event.isSynced
  const isCompleted = event.isCompleted

  return (
    <div
      className={cn(
        'h-full px-1.5 py-0.5 text-xs rounded overflow-hidden',
        isCompleted && 'opacity-60 line-through'
      )}
      style={{
        backgroundColor: event.color,
        color: getContrastColor(event.color),
      }}
    >
      <div className="flex items-center gap-1">
        {isSynced && <span className="text-[10px]">✓</span>}
        <span className="truncate font-medium">{event.title}</span>
      </div>
      {event.courseName && (
        <div className="truncate text-[10px] opacity-80">
          {event.courseCode || event.courseName}
        </div>
      )}
    </div>
  )
}

// Agenda event component
function AgendaEventComponent({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: event.color }}
      />
      <div className="min-w-0">
        <div className={cn('font-medium', event.isCompleted && 'line-through opacity-60')}>
          {event.title}
        </div>
        {event.courseName && (
          <div className="text-sm text-muted-foreground">
            {event.courseCode || event.courseName}
          </div>
        )}
        {event.location && (
          <div className="text-sm text-muted-foreground">{event.location}</div>
        )}
      </div>
    </div>
  )
}

// Helper to determine if text should be light or dark
function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

// Custom toolbar removed - we use our own header

export function CalendarView({
  events,
  view,
  date,
  onViewChange,
  onDateChange,
  onSelectEvent,
  onSelectSlot,
}: CalendarViewProps) {
  const { components, formats, style } = useMemo(() => ({
    components: {
      event: EventComponent,
      agenda: {
        event: AgendaEventComponent,
      },
      toolbar: () => null, // Hide default toolbar, we use our own
    },
    formats: {
      eventTimeRangeFormat: () => '',
      timeGutterFormat: (date: Date) => format(date, 'h a'),
      dayHeaderFormat: (date: Date) => format(date, 'EEE d'),
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
      agendaDateFormat: (date: Date) => format(date, 'EEE, MMM d'),
      agendaTimeFormat: (date: Date) => format(date, 'h:mm a'),
      agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
    },
    style: {
      height: 'calc(100vh - 280px)',
      minHeight: '500px',
    },
  }), [])

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (onSelectSlot && slotInfo.action === 'click') {
        // For click, create a 1-hour slot
        onSelectSlot({
          start: slotInfo.start,
          end: addMinutes(slotInfo.start, 60),
        })
      } else if (onSelectSlot && slotInfo.action === 'select') {
        onSelectSlot(slotInfo)
      }
    },
    [onSelectSlot]
  )

  const eventStyleGetter = useCallback((_event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
      },
    }
  }, [])

  const dayPropGetter = useCallback((date: Date) => {
    const today = new Date()
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()

    return {
      className: cn(isToday && 'bg-primary/5'),
    }
  }, [])

  return (
    <div className="calendar-wrapper">
      <Calendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={onViewChange}
        onNavigate={onDateChange}
        onSelectEvent={onSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        components={components}
        formats={formats}
        style={style}
        eventPropGetter={eventStyleGetter}
        dayPropGetter={dayPropGetter}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        step={30}
        timeslots={2}
        min={new Date(1970, 1, 1, 6, 0, 0)}
        max={new Date(1970, 1, 1, 23, 0, 0)}
        showMultiDayTimes
        messages={{
          today: 'Today',
          previous: 'Back',
          next: 'Next',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          noEventsInRange: 'No events in this range.',
        }}
      />
      <style>{`
        .calendar-wrapper .rbc-calendar {
          font-family: inherit;
        }
        .calendar-wrapper .rbc-header {
          padding: 8px 4px;
          font-weight: 500;
          font-size: 0.875rem;
        }
        .calendar-wrapper .rbc-month-view {
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-wrapper .rbc-month-row {
          min-height: 100px;
        }
        .calendar-wrapper .rbc-date-cell {
          padding: 4px 8px;
          font-size: 0.875rem;
        }
        .calendar-wrapper .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
        .calendar-wrapper .rbc-today {
          background-color: hsl(var(--primary) / 0.08);
        }
        .calendar-wrapper .rbc-event {
          padding: 0;
          border: none;
          background: transparent;
        }
        .calendar-wrapper .rbc-event:focus {
          outline: none;
        }
        .calendar-wrapper .rbc-show-more {
          font-size: 0.75rem;
          color: hsl(var(--primary));
          font-weight: 500;
          background: transparent;
          padding: 2px 4px;
        }
        .calendar-wrapper .rbc-time-view {
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-wrapper .rbc-time-header {
          border-bottom: 1px solid hsl(var(--border));
        }
        .calendar-wrapper .rbc-time-content {
          border-top: none;
        }
        .calendar-wrapper .rbc-time-gutter {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
        .calendar-wrapper .rbc-timeslot-group {
          min-height: 60px;
        }
        .calendar-wrapper .rbc-current-time-indicator {
          background-color: hsl(var(--primary));
          height: 2px;
        }
        .calendar-wrapper .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -5px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: hsl(var(--primary));
        }
        .calendar-wrapper .rbc-agenda-view {
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-wrapper .rbc-agenda-view table {
          border-collapse: collapse;
        }
        .calendar-wrapper .rbc-agenda-view tbody > tr > td {
          padding: 12px;
          border-bottom: 1px solid hsl(var(--border));
        }
        .calendar-wrapper .rbc-agenda-date-cell,
        .calendar-wrapper .rbc-agenda-time-cell {
          font-size: 0.875rem;
          white-space: nowrap;
          color: hsl(var(--muted-foreground));
        }
        .calendar-wrapper .rbc-agenda-event-cell {
          width: 100%;
        }
        .calendar-wrapper .rbc-day-slot .rbc-event {
          border: none;
        }
        .calendar-wrapper .rbc-allday-cell {
          display: none;
        }
        .calendar-wrapper .rbc-time-header-content > .rbc-row {
          min-height: auto;
        }
        
        /* Dark mode adjustments */
        .dark .calendar-wrapper .rbc-header {
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
        }
        .dark .calendar-wrapper .rbc-month-view,
        .dark .calendar-wrapper .rbc-time-view,
        .dark .calendar-wrapper .rbc-agenda-view {
          border-color: hsl(var(--border));
        }
        .dark .calendar-wrapper .rbc-day-bg,
        .dark .calendar-wrapper .rbc-month-row {
          border-color: hsl(var(--border));
        }
        .dark .calendar-wrapper .rbc-time-content,
        .dark .calendar-wrapper .rbc-time-header-content {
          border-color: hsl(var(--border));
        }
        .dark .calendar-wrapper .rbc-timeslot-group {
          border-color: hsl(var(--border));
        }
        .dark .calendar-wrapper .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.15);
        }
        
        /* Mobile styles */
        @media (max-width: 640px) {
          .calendar-wrapper .rbc-month-row {
            min-height: 60px;
          }
          .calendar-wrapper .rbc-date-cell {
            padding: 2px 4px;
            font-size: 0.75rem;
          }
          .calendar-wrapper .rbc-header {
            padding: 4px 2px;
            font-size: 0.75rem;
          }
          .calendar-wrapper .rbc-show-more {
            font-size: 0.625rem;
          }
        }
      `}</style>
    </div>
  )
}

