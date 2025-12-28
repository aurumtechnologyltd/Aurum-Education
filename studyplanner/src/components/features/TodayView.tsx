import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Check, Clock, Sun, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudySession, Course, DayOfWeek } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface TodayViewProps {
  sessions: StudySession[]
  courses: Course[]
  onStartSession: (session: StudySession) => void
  onMarkComplete: (sessionId: string) => void
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

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

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function TodayView({
  sessions,
  courses,
  onStartSession,
  onMarkComplete,
}: TodayViewProps) {
  const today = DAY_MAP[new Date().getDay()]
  const currentMinutes = getCurrentMinutes()

  // Filter to today's sessions and sort by time
  const todaySessions = sessions
    .filter(s => s.day === today)
    .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))

  // Find next uncompleted session
  const nextSessionIndex = todaySessions.findIndex(
    s => !s.is_completed && parseTime(s.start_time) >= currentMinutes - 60
  )

  const getCourse = (courseId: string) => courses.find(c => c.id === courseId)

  if (todaySessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Sessions Today</h3>
          <p className="text-muted-foreground">
            Enjoy your day! Check back tomorrow for scheduled study sessions.
          </p>
        </CardContent>
      </Card>
    )
  }

  const completedCount = todaySessions.filter(s => s.is_completed).length
  const totalHours = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sun className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{today}</p>
                <p className="text-sm text-muted-foreground">
                  {todaySessions.length} sessions • {totalHours.toFixed(1)} hours
                </p>
              </div>
            </div>
            <Badge variant={completedCount === todaySessions.length ? 'default' : 'secondary'}>
              {completedCount}/{todaySessions.length} completed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {todaySessions.map((session, index) => {
            const course = getCourse(session.course_id)
            const CourseIcon = getCourseIcon(course?.icon ?? null)
            const isNext = index === nextSessionIndex
            const isPast = parseTime(session.start_time) < currentMinutes - session.duration_minutes

            return (
              <div key={session.id}>
                {index > 0 && <Separator className="my-0" />}
                <div
                  className={cn(
                    'py-4 flex items-start gap-4',
                    session.is_completed && 'opacity-60',
                    isNext && 'bg-primary/5 -mx-6 px-6 border-l-4 border-primary'
                  )}
                >
                  {/* Time */}
                  <div className="w-16 flex-shrink-0 text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      isPast && !session.is_completed && 'text-destructive'
                    )}>
                      {formatTime(session.start_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.duration_minutes}m
                    </p>
                  </div>

                  {/* Course icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: course?.color || '#3b82f6' }}
                  >
                    <CourseIcon className="w-5 h-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn(
                          'font-medium',
                          session.is_completed && 'line-through'
                        )}>
                          <span className="mr-2">{session.icon}</span>
                          {session.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {course?.name}
                        </p>
                      </div>

                      {/* Status/Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {session.is_completed ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        ) : (
                          <>
                            {isNext && (
                              <Badge className="bg-primary">Up Next</Badge>
                            )}
                            <Button
                              size="sm"
                              variant={isNext ? 'default' : 'outline'}
                              onClick={() => onStartSession(session)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onMarkComplete(session.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {session.description && !session.is_completed && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Tomorrow Preview */}
      {(() => {
        const tomorrow = DAY_MAP[(new Date().getDay() + 1) % 7]
        const tomorrowSessions = sessions.filter(s => s.day === tomorrow)
        
        if (tomorrowSessions.length === 0) return null

        const tomorrowHours = tomorrowSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60

        return (
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tomorrow ({tomorrow})</p>
                  <p className="text-xs text-muted-foreground">
                    {tomorrowSessions.length} sessions • {tomorrowHours.toFixed(1)} hours scheduled
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}

