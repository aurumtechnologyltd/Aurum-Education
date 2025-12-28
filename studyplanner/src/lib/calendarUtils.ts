import {
  addWeeks,
  setDay,
  set,
  addMinutes,
  parseISO,
  startOfDay,
} from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { RRule, rrulestr } from 'rrule'
import type {
  StudySession,
  Assignment,
  CustomEvent,
  CalendarEvent,
  CalendarEventType,
  Course,
  Milestone,
} from '@/types/database'

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/**
 * Calculate the absolute datetime for a study session based on semester start date
 */
export function getSessionDateTime(
  session: StudySession,
  semesterStartDate: Date,
  timezone: string = 'UTC'
): Date {
  const dayOffset = DAY_MAP[session.day] ?? 0
  
  // Get the start of the week for the session's week number
  const weekStart = addWeeks(startOfDay(semesterStartDate), session.week_number - 1)
  
  // Find the correct day in this week
  const sessionDate = setDay(weekStart, dayOffset, { weekStartsOn: 0 })
  
  // Parse the time
  const [hours, minutes] = session.start_time.split(':').map(Number)
  
  // Set the time
  const dateTime = set(sessionDate, { hours, minutes, seconds: 0, milliseconds: 0 })
  
  // Convert to the user's timezone
  return fromZonedTime(dateTime, timezone)
}

/**
 * Get the end datetime for a study session
 */
export function getSessionEndDateTime(
  session: StudySession,
  semesterStartDate: Date,
  timezone: string = 'UTC'
): Date {
  const startDateTime = getSessionDateTime(session, semesterStartDate, timezone)
  return addMinutes(startDateTime, session.duration_minutes)
}

/**
 * Convert a study session to a CalendarEvent
 */
export function studySessionToCalendarEvent(
  session: StudySession,
  semesterStartDate: Date,
  timezone: string = 'UTC'
): CalendarEvent {
  const course = session.course
  const start = getSessionDateTime(session, semesterStartDate, timezone)
  const end = getSessionEndDateTime(session, semesterStartDate, timezone)
  
  return {
    id: `session-${session.id}`,
    title: session.title,
    start,
    end,
    allDay: false,
    type: 'study_session',
    color: course?.color || '#3b82f6', // Blue default
    courseId: session.course_id,
    courseName: course?.name,
    courseCode: course?.code || undefined,
    description: session.description || undefined,
    originalId: session.id,
    originalType: 'study_session',
    isSynced: !!session.calendar_event_id,
    weekNumber: session.week_number,
    activityType: session.activity_type,
    isCompleted: session.is_completed ?? false,
  }
}

/**
 * Convert an assignment to a CalendarEvent
 */
export function assignmentToCalendarEvent(
  assignment: Assignment,
  course?: Course
): CalendarEvent {
  const dueDate = parseISO(assignment.due_date)
  
  return {
    id: `assignment-${assignment.id}`,
    title: assignment.title,
    start: dueDate,
    end: addMinutes(dueDate, 60), // 1 hour duration for display
    allDay: false,
    type: 'assessment',
    color: getAssessmentColor(assignment.type),
    courseId: assignment.course_id,
    courseName: course?.name,
    courseCode: course?.code || undefined,
    description: assignment.description || undefined,
    originalId: assignment.id,
    originalType: 'assessment',
    isSynced: !!assignment.calendar_event_id,
    weight: assignment.weight || undefined,
    assignmentType: assignment.type,
  }
}

/**
 * Convert a milestone to a CalendarEvent
 */
export function milestoneToCalendarEvent(
  milestone: Milestone,
  assignment?: Assignment,
  course?: Course
): CalendarEvent {
  const milestoneDate = parseISO(milestone.date)
  
  return {
    id: `milestone-${milestone.id}`,
    title: milestone.title,
    start: milestoneDate,
    end: addMinutes(milestoneDate, 60),
    allDay: false,
    type: 'milestone',
    color: '#8b5cf6', // Purple for milestones
    courseId: assignment?.course_id,
    courseName: course?.name,
    courseCode: course?.code || undefined,
    description: assignment ? `For: ${assignment.title}` : undefined,
    originalId: milestone.id,
    originalType: 'milestone',
    isCompleted: milestone.is_completed || false,
  }
}

/**
 * Convert a custom event to a CalendarEvent
 */
export function customEventToCalendarEvent(
  event: CustomEvent,
  course?: Course
): CalendarEvent {
  return {
    id: `custom-${event.id}`,
    title: event.title,
    start: parseISO(event.start_time),
    end: parseISO(event.end_time),
    allDay: event.is_all_day,
    type: 'custom_event',
    color: event.color,
    courseId: event.course_id || undefined,
    courseName: course?.name,
    courseCode: course?.code || undefined,
    location: event.location || undefined,
    description: event.description || undefined,
    originalId: event.id,
    originalType: 'custom_event',
    isSynced: !!event.calendar_event_id,
    recurrenceRule: event.recurrence_rule || undefined,
    isRecurring: !!event.recurrence_rule,
  }
}

/**
 * Get color for assessment type
 */
export function getAssessmentColor(type: string): string {
  switch (type) {
    case 'Exam':
      return '#ef4444' // Red
    case 'Project':
      return '#a855f7' // Purple
    case 'Assignment':
      return '#f97316' // Orange
    default:
      return '#6b7280' // Gray
  }
}

/**
 * Expand recurring events within a date range using RRULE
 */
export function expandRecurringEvents(
  event: CustomEvent,
  rangeStart: Date,
  rangeEnd: Date,
  course?: Course
): CalendarEvent[] {
  if (!event.recurrence_rule) {
    return [customEventToCalendarEvent(event, course)]
  }

  try {
    const rule = rrulestr(event.recurrence_rule, {
      dtstart: parseISO(event.start_time),
    })
    
    const occurrences = rule.between(rangeStart, rangeEnd, true)
    const eventDuration = parseISO(event.end_time).getTime() - parseISO(event.start_time).getTime()
    
    return occurrences.map((occurrence, index) => ({
      id: `custom-${event.id}-${index}`,
      title: event.title,
      start: occurrence,
      end: new Date(occurrence.getTime() + eventDuration),
      allDay: event.is_all_day,
      type: 'custom_event' as CalendarEventType,
      color: event.color,
      courseId: event.course_id || undefined,
      courseName: course?.name,
      courseCode: course?.code || undefined,
      location: event.location || undefined,
      description: event.description || undefined,
      originalId: event.id,
      originalType: 'custom_event' as CalendarEventType,
      isSynced: !!event.calendar_event_id,
      recurrenceRule: event.recurrence_rule || undefined,
      isRecurring: true,
    }))
  } catch (error) {
    console.error('Failed to parse recurrence rule:', error)
    return [customEventToCalendarEvent(event, course)]
  }
}

/**
 * Build an RRULE string from user-friendly options
 */
export function buildRRule(options: {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval?: number
  count?: number
  until?: Date
  byweekday?: number[]
}): string {
  const freqMap = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
    yearly: RRule.YEARLY,
  }
  
  const rule = new RRule({
    freq: freqMap[options.frequency],
    interval: options.interval || 1,
    count: options.count,
    until: options.until,
    byweekday: options.byweekday,
  })
  
  return rule.toString()
}

/**
 * Parse an RRULE string to user-friendly options
 */
export function parseRRule(rruleString: string): {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  count?: number
  until?: Date
  byweekday?: number[]
} | null {
  try {
    const rule = rrulestr(rruleString)
    const options = rule.origOptions
    
    const freqMap: Record<number, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
      [RRule.DAILY]: 'daily',
      [RRule.WEEKLY]: 'weekly',
      [RRule.MONTHLY]: 'monthly',
      [RRule.YEARLY]: 'yearly',
    }
    
    return {
      frequency: freqMap[options.freq as number] || 'weekly',
      interval: options.interval || 1,
      count: options.count || undefined,
      until: options.until || undefined,
      byweekday: options.byweekday as number[] | undefined,
    }
  } catch {
    return null
  }
}

/**
 * Get human-readable recurrence description
 */
export function getRecurrenceDescription(rruleString: string): string {
  try {
    const rule = rrulestr(rruleString)
    return rule.toText()
  } catch {
    return 'Custom recurrence'
  }
}

/**
 * Get event type display name
 */
export function getEventTypeLabel(type: CalendarEventType): string {
  switch (type) {
    case 'assessment':
      return 'Assessment'
    case 'study_session':
      return 'Study Session'
    case 'custom_event':
      return 'Event'
    case 'milestone':
      return 'Milestone'
    default:
      return 'Event'
  }
}

/**
 * Check if two date ranges overlap
 */
export function doRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Format time for display (e.g., "9:00 AM")
 */
export function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Calculate duration in a human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

