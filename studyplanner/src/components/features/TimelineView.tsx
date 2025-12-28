import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudySession, StudyPlanWeeklyProgress, StudyPlanJSON } from '@/types/database'

interface TimelineViewProps {
  weeklyProgress: StudyPlanWeeklyProgress[]
  sessions: StudySession[]
  currentWeek: number
  planJson: StudyPlanJSON
  onWeekSelect: (week: number) => void
  onMarkWeekComplete?: (weekNumber: number) => void
}

type WeekStatus = 'completed' | 'current' | 'upcoming' | 'behind'

export function TimelineView({
  weeklyProgress,
  sessions,
  currentWeek,
  planJson,
  onWeekSelect,
  onMarkWeekComplete,
}: TimelineViewProps) {
  const getWeekStatus = (weekNumber: number, progress: StudyPlanWeeklyProgress | undefined): WeekStatus => {
    if (weekNumber < currentWeek) {
      // Past week - check if completed
      if (progress?.is_completed || (progress && progress.completed_hours >= progress.planned_hours * 0.9)) {
        return 'completed'
      }
      return 'behind'
    }
    if (weekNumber === currentWeek) {
      return 'current'
    }
    return 'upcoming'
  }

  const getStatusIcon = (status: WeekStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'current':
        return <Circle className="w-5 h-5 text-blue-600 fill-blue-100" />
      case 'behind':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'upcoming':
        return <Clock className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: WeekStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'current':
        return 'bg-blue-50 border-blue-200'
      case 'behind':
        return 'bg-red-50 border-red-200'
      case 'upcoming':
        return 'bg-muted/30'
    }
  }

  const getStatusBadge = (status: WeekStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
      case 'current':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Current Week</Badge>
      case 'behind':
        return <Badge variant="destructive">Behind Schedule</Badge>
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>
    }
  }

  // Group sessions by week
  const sessionsByWeek: Record<number, StudySession[]> = {}
  sessions.forEach(session => {
    if (!sessionsByWeek[session.week_number]) {
      sessionsByWeek[session.week_number] = []
    }
    sessionsByWeek[session.week_number].push(session)
  })

  // Build weeks array
  const weeks = Array.from({ length: planJson.totalWeeks }, (_, i) => {
    const weekNumber = i + 1
    const progress = weeklyProgress.find(p => p.week_number === weekNumber)
    const weekSessions = sessionsByWeek[weekNumber] || []
    const status = getWeekStatus(weekNumber, progress)
    const planWeek = planJson.weeklySchedule.find(w => w.week === weekNumber)

    return {
      weekNumber,
      progress,
      sessions: weekSessions,
      status,
      dateRange: planWeek?.dateRange || progress?.date_range || `Week ${weekNumber}`,
      deadlines: planWeek?.upcomingDeadlines || [],
      completedSessions: weekSessions.filter(s => s.is_completed).length,
      totalSessions: weekSessions.length,
    }
  })

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <Accordion 
            type="single" 
            collapsible 
            defaultValue={`week-${currentWeek}`}
          >
            {weeks.map(week => (
              <AccordionItem 
                key={week.weekNumber} 
                value={`week-${week.weekNumber}`}
                className="border-b last:border-b-0"
              >
                <AccordionTrigger 
                  className={cn(
                    'px-4 py-3 hover:no-underline',
                    getStatusColor(week.status)
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(week.status)}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Week {week.weekNumber}</span>
                        <span className="text-sm text-muted-foreground">{week.dateRange}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(week.status)}
                        <span className="text-xs text-muted-foreground">
                          {week.completedSessions}/{week.totalSessions} sessions
                        </span>
                        {week.progress && (
                          <span className="text-xs text-muted-foreground">
                            • {week.progress.completed_hours.toFixed(1)}/{week.progress.planned_hours.toFixed(1)} hrs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  {/* Progress bar */}
                  {week.progress && (
                    <div className="mb-4">
                      <Progress 
                        value={week.progress.planned_hours > 0 
                          ? (week.progress.completed_hours / week.progress.planned_hours) * 100 
                          : 0
                        } 
                        className="h-2" 
                      />
                    </div>
                  )}

                  {/* Deadlines */}
                  {week.deadlines.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Deadlines</p>
                      <div className="flex flex-wrap gap-2">
                        {week.deadlines.map((deadline, idx) => (
                          <Badge key={idx} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {deadline.course}: {deadline.assessment} ({deadline.date})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions table */}
                  {week.sessions.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Session</TableHead>
                            <TableHead>Day</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {week.sessions
                            .sort((a, b) => {
                              const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                              const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
                              if (dayDiff !== 0) return dayDiff
                              return a.start_time.localeCompare(b.start_time)
                            })
                            .map(session => (
                              <TableRow key={session.id} className={session.is_completed ? 'bg-muted/30' : ''}>
                                <TableCell>
                                  {session.is_completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{session.icon}</span>
                                    <span className={cn(
                                      'truncate max-w-[200px]',
                                      session.is_completed && 'line-through text-muted-foreground'
                                    )}>
                                      {session.title}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{session.day}</TableCell>
                                <TableCell className="text-muted-foreground">{session.start_time}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {session.duration_minutes}m
                                </TableCell>
                              </TableRow>
                            ))
                          }
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sessions scheduled for this week
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => onWeekSelect(week.weekNumber)}
                    >
                      View in Calendar
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    {week.status !== 'completed' && week.status !== 'upcoming' && onMarkWeekComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => onMarkWeekComplete(week.weekNumber)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Mark Week Complete
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

