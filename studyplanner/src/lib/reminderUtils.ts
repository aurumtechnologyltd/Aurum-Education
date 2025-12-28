import { supabase } from './supabase'
import { addHours, addDays, subMinutes } from 'date-fns'

export type EventType = 'assessment' | 'study_session' | 'custom_event'
type ReminderOffsetUnit = 'minutes' | 'hours' | 'days' | 'weeks'

interface ReminderConfig {
  time: Date
  offsetValue: number
  offsetUnit: ReminderOffsetUnit
}

interface CreateRemindersParams {
  eventType: EventType
  eventId: string
  eventTime: Date
  userId: string
  reminders?: {
    assessment?: { daysBefore?: number[]; hoursBefore?: number[] }
    studySession?: { minutesBefore?: number[] }
    customEvent?: { daysBefore?: number[]; hoursBefore?: number[] }
  }
}

/**
 * Create event reminders based on event type and user preferences
 */
export async function createEventReminders({
  eventType,
  eventId,
  eventTime,
  userId,
  reminders,
}: CreateRemindersParams): Promise<void> {
  const reminderConfigs: ReminderConfig[] = []

  switch (eventType) {
    case 'assessment':
      // Default: 1 day and 1 hour before due date
      const assessmentDefaults = reminders?.assessment || {
        daysBefore: [1],
        hoursBefore: [1],
      }
      
      assessmentDefaults.daysBefore?.forEach((days) => {
        reminderConfigs.push({
          time: addDays(eventTime, -days),
          offsetValue: days,
          offsetUnit: 'days',
        })
      })
      
      assessmentDefaults.hoursBefore?.forEach((hours) => {
        reminderConfigs.push({
          time: addHours(eventTime, -hours),
          offsetValue: hours,
          offsetUnit: 'hours',
        })
      })
      break

    case 'study_session':
      // Default: 15 minutes before session
      const sessionDefaults = reminders?.studySession || {
        minutesBefore: [15],
      }
      
      sessionDefaults.minutesBefore?.forEach((minutes) => {
        reminderConfigs.push({
          time: subMinutes(eventTime, minutes),
          offsetValue: minutes,
          offsetUnit: 'minutes',
        })
      })
      break

    case 'custom_event':
      // Default: 1 day and 1 hour before event
      const eventDefaults = reminders?.customEvent || {
        daysBefore: [1],
        hoursBefore: [1],
      }
      
      eventDefaults.daysBefore?.forEach((days) => {
        reminderConfigs.push({
          time: addDays(eventTime, -days),
          offsetValue: days,
          offsetUnit: 'days',
        })
      })
      
      eventDefaults.hoursBefore?.forEach((hours) => {
        reminderConfigs.push({
          time: addHours(eventTime, -hours),
          offsetValue: hours,
          offsetUnit: 'hours',
        })
      })
      break
  }

  // Filter out past reminders
  const futureReminders = reminderConfigs.filter((config) => config.time > new Date())

  if (futureReminders.length === 0) return

  // Insert reminders with correct field names matching the database schema
  const reminderRecords = futureReminders.map((config) => ({
    user_id: userId,
    event_type: eventType,
    event_id: eventId,
    reminder_time: config.time.toISOString(),
    reminder_offset_value: config.offsetValue,
    reminder_offset_unit: config.offsetUnit,
    method: 'popup' as const,
    is_sent: false,
  }))

  const { error } = await supabase
    .from('event_reminders')
    .insert(reminderRecords)

  if (error) {
    console.error('Failed to create reminders:', error)
    throw error
  }
}

