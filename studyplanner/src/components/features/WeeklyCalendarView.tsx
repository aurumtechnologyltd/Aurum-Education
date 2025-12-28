import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Play, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudySession, Course, DayOfWeek } from '@/types/database'

interface WeeklyCalendarViewProps {
  sessions: StudySession[]
  courses: Course[]
  onSessionClick: (session: StudySession) => void
  onStartSession: (session: StudySession) => void
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes || '00'} ${ampm}`
}

export function WeeklyCalendarView({
  sessions,
  courses,
  onSessionClick,
  onStartSession,
}: WeeklyCalendarViewProps) {
  // Group sessions by day
  const sessionsByDay: Record<DayOfWeek, StudySession[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  }

  sessions.forEach(session => {
    const dayKey = session.day as DayOfWeek
    if (sessionsByDay[dayKey]) {
      sessionsByDay[dayKey].push(session)
    }
  })

  // Sort each day's sessions by time
  Object.keys(sessionsByDay).forEach(day => {
    sessionsByDay[day as DayOfWeek].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))
  })

  const getCourseColor = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.color || '#3b82f6'
  }

  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    return course?.code || course?.name?.slice(0, 12) || 'Unknown'
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No sessions scheduled for this week.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop view - 7 column grid */}
        <div className="hidden lg:grid grid-cols-7 divide-x">
          {DAYS.map(day => (
            <div key={day} className="min-h-[400px]">
              {/* Day header */}
              <div className="p-3 border-b bg-muted/30 text-center">
                <p className="font-medium text-sm">{day}</p>
                <p className="text-xs text-muted-foreground">
                  {sessionsByDay[day].length} sessions
                </p>
              </div>
              
              {/* Sessions */}
              <ScrollArea className="h-[350px]">
                <div className="p-2 space-y-2">
                  {sessionsByDay[day].map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      courseColor={getCourseColor(session.course_id)}
                      courseName={getCourseName(session.course_id)}
                      onClick={() => onSessionClick(session)}
                      onStart={() => onStartSession(session)}
                      compact
                    />
                  ))}
                  {sessionsByDay[day].length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No sessions
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>

        {/* Mobile/Tablet view - List */}
        <div className="lg:hidden">
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {DAYS.map(day => {
                const daySessions = sessionsByDay[day]
                if (daySessions.length === 0) return null
                
                return (
                  <div key={day} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-medium">{day}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {daySessions.length} sessions
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {daySessions.map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          courseColor={getCourseColor(session.course_id)}
                          courseName={getCourseName(session.course_id)}
                          onClick={() => onSessionClick(session)}
                          onStart={() => onStartSession(session)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

interface SessionCardProps {
  session: StudySession
  courseColor: string
  courseName: string
  onClick: () => void
  onStart: () => void
  compact?: boolean
}

function SessionCard({ session, courseColor, courseName, onClick, onStart, compact }: SessionCardProps) {
  const getStatusIcon = () => {
    if (session.is_completed) {
      return <Check className="w-3 h-3 text-green-600" />
    }
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border cursor-pointer transition-all hover:shadow-sm',
        session.is_completed ? 'bg-muted/50 opacity-75' : 'bg-card hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <div className="p-2">
        {/* Color bar */}
        <div
          className="h-1 rounded-full mb-2"
          style={{ backgroundColor: courseColor }}
        />
        
        {/* Time and icon */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={cn('text-xs font-medium', compact && 'text-[10px]')}>
            {formatTime(session.start_time)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-sm">{session.icon}</span>
            {getStatusIcon()}
          </div>
        </div>

        {/* Title */}
        <p className={cn(
          'font-medium line-clamp-2',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {session.title}
        </p>

        {/* Course and duration */}
        <div className="flex items-center justify-between mt-1">
          <span className={cn(
            'text-muted-foreground truncate',
            compact ? 'text-[10px]' : 'text-xs'
          )}>
            {courseName}
          </span>
          <span className={cn(
            'text-muted-foreground',
            compact ? 'text-[10px]' : 'text-xs'
          )}>
            {session.duration_minutes}m
          </span>
        </div>

        {/* Start button (only if not completed) */}
        {!session.is_completed && !compact && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full mt-2 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onStart()
            }}
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
        )}
      </div>
    </div>
  )
}

