import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Clock, Target } from 'lucide-react'
import type { Course, StudySession, StudyPlanJSON } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface CourseBreakdownViewProps {
  courses: Course[]
  sessions: StudySession[]
  selectedWeek: number
  planJson: StudyPlanJSON
}

export function CourseBreakdownView({
  courses,
  sessions,
  selectedWeek,
  planJson,
}: CourseBreakdownViewProps) {
  // Calculate stats per course
  const courseStats = courses.map(course => {
    const courseSessions = sessions.filter(s => s.course_id === course.id)
    const weekSessions = courseSessions.filter(s => s.week_number === selectedWeek)
    const completedWeekSessions = weekSessions.filter(s => s.is_completed)
    
    const totalHours = courseSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60
    const completedHours = courseSessions
      .filter(s => s.is_completed)
      .reduce((sum, s) => sum + (s.actual_duration_minutes || s.duration_minutes), 0) / 60
    
    const weekHours = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60
    const completedWeekHours = completedWeekSessions
      .reduce((sum, s) => sum + (s.actual_duration_minutes || s.duration_minutes), 0) / 60

    // Find allocation from plan
    const allocation = planJson.courses.find(c => c.courseId === course.id)
    
    // Find next uncompleted session
    const nextSession = weekSessions.find(s => !s.is_completed)

    return {
      course,
      totalSessions: courseSessions.length,
      completedSessions: courseSessions.filter(s => s.is_completed).length,
      totalHours,
      completedHours,
      weekSessions: weekSessions.length,
      completedWeekSessions: completedWeekSessions.length,
      weekHours,
      completedWeekHours,
      weeklyAllocation: allocation?.weeklyHoursAllocated || 0,
      nextSession,
      overallProgress: courseSessions.length > 0 
        ? Math.round((courseSessions.filter(s => s.is_completed).length / courseSessions.length) * 100)
        : 0,
      weekProgress: weekSessions.length > 0
        ? Math.round((completedWeekSessions.length / weekSessions.length) * 100)
        : 0,
    }
  })

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No courses found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4 pr-4">
        {courseStats.map(({ 
          course, 
          weekSessions, 
          completedWeekSessions, 
          weekHours, 
          completedWeekHours,
          weeklyAllocation,
          nextSession,
          overallProgress,
          weekProgress,
          totalHours,
          completedHours,
        }) => {
          const CourseIcon = getCourseIcon(course.icon)
          
          return (
            <Card key={course.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: course.color || '#3b82f6' }}
                  >
                    <CourseIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{course.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {course.code && (
                        <Badge variant="secondary" className="text-xs">{course.code}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {weeklyAllocation} hrs/week allocated
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* This Week Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">This Week (Week {selectedWeek})</span>
                    <span className="text-sm text-muted-foreground">
                      {completedWeekHours.toFixed(1)}/{weekHours.toFixed(1)} hrs
                    </span>
                  </div>
                  <Progress value={weekProgress} className="h-2" />
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{completedWeekSessions}/{weekSessions} sessions</span>
                    <span>{weekProgress}%</span>
                  </div>
                </div>

                {/* Next Session */}
                {nextSession && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Next Session</p>
                    <div className="flex items-center gap-2">
                      <span>{nextSession.icon}</span>
                      <span className="font-medium text-sm truncate">{nextSession.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{nextSession.day} at {nextSession.start_time}</span>
                      <span>•</span>
                      <span>{nextSession.duration_minutes}min</span>
                    </div>
                  </div>
                )}

                {weekSessions === 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">No sessions this week</p>
                  </div>
                )}

                {/* Expandable overall progress */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="overall" className="border-0">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Overall Progress
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <Progress value={overallProgress} className="h-2" />
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Total Hours</p>
                            <p className="font-medium">{totalHours.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Completed</p>
                            <p className="font-medium">{completedHours.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Progress</p>
                            <p className="font-medium">{overallProgress}%</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}

