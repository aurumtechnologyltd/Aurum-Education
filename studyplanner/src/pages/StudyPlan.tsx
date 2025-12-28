import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  CalendarDays, 
  Calendar,
  BookOpen, 
  LayoutList, 
  Clock,
  Sparkles,
  RefreshCw,
  Download,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { StudyPlanQuestionnaire } from '@/components/features/StudyPlanQuestionnaire'
import { WeeklyCalendarView } from '@/components/features/WeeklyCalendarView'
import { CourseBreakdownView } from '@/components/features/CourseBreakdownView'
import { TodayView } from '@/components/features/TodayView'
import { TimelineView } from '@/components/features/TimelineView'
import { StudyTimerModal } from '@/components/features/StudyTimerModal'
import { SessionDetailsModal } from '@/components/features/SessionDetailsModal'
import { SessionEditModal } from '@/components/features/SessionEditModal'
import { RescheduleSessionModal } from '@/components/features/RescheduleSessionModal'
import { WeekCelebrationModal } from '@/components/features/WeekCelebrationModal'
import type { 
  Course, 
  StudyPlan as StudyPlanType, 
  StudySession, 
  StudyPlanPreferences,
  StudyPlanWeeklyProgress,
  CoursePriority,
  StudyPlanJSON,
} from '@/types/database'

const LOADING_MESSAGES = [
  'Analyzing all course syllabi...',
  'Identifying deadlines across courses...',
  'Creating conflict-free schedule...',
  'Balancing workload across weeks...',
  'Aligning with your preferences...',
]

export default function StudyPlan() {
  const { user, activeSemester } = useAuth()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(0)
  
  const [courses, setCourses] = useState<Course[]>([])
  const [activePlan, setActivePlan] = useState<StudyPlanType | null>(null)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<StudyPlanWeeklyProgress[]>([])
  const [preferences, setPreferences] = useState<StudyPlanPreferences | null>(null)
  
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
  const [syncPromptOpen, setSyncPromptOpen] = useState(false)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [newSessionCount, setNewSessionCount] = useState(0)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null)
  const [timerSession, setTimerSession] = useState<StudySession | null>(null)
  const [editSession, setEditSession] = useState<StudySession | null>(null)
  const [rescheduleSession, setRescheduleSession] = useState<StudySession | null>(null)
  const [celebrationWeek, setCelebrationWeek] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('weekly')

  // Calculate current week based on semester dates
  const getCurrentWeek = useCallback((totalWeeks: number = 15) => {
    if (!activeSemester) return 1
    const now = new Date()
    const start = new Date(activeSemester.start_date)
    const diffTime = now.getTime() - start.getTime()
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1
    return Math.max(1, Math.min(diffWeeks, totalWeeks))
  }, [activeSemester])

  const fetchData = useCallback(async () => {
    if (!activeSemester || !user) return
    setLoading(true)

    try {
      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('semester_id', activeSemester.id)
        .order('name', { ascending: true })

      if (coursesData) setCourses(coursesData)

      // Fetch active study plan
      const { data: planData } = await supabase
        .from('study_plans')
        .select('*')
        .eq('semester_id', activeSemester.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (planData) {
        setActivePlan(planData)
        setSelectedWeek(getCurrentWeek((planData.plan_json as unknown as StudyPlanJSON)?.totalWeeks || 15))

        // Fetch sessions
        const { data: sessionsData } = await supabase
          .from('study_sessions')
          .select('*, course:courses(*)')
          .eq('plan_id', planData.id)
          .order('week_number', { ascending: true })

        if (sessionsData) setSessions(sessionsData as StudySession[])

        // Fetch weekly progress
        const { data: progressData } = await supabase
          .from('study_plan_weekly_progress')
          .select('*')
          .eq('plan_id', planData.id)
          .order('week_number', { ascending: true })

        if (progressData) setWeeklyProgress(progressData as StudyPlanWeeklyProgress[])
      } else {
        setActivePlan(null)
        setSessions([])
        setWeeklyProgress([])
      }

      // Fetch preferences
      const { data: prefsData } = await supabase
        .from('study_plan_preferences')
        .select('*')
        .eq('semester_id', activeSemester.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (prefsData) setPreferences(prefsData as StudyPlanPreferences)
      else setPreferences(null)

    } catch (error) {
      console.error('Error fetching study plan data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeSemester, user, getCurrentWeek])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Rotate loading messages during generation
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(() => {
      setLoadingMessage(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [generating])

  const handleGenerate = async (prefs: {
    total_weekly_hours: number
    session_length_minutes: number
    course_priorities: Record<string, CoursePriority>
  }) => {
    if (!activeSemester || !user) return

    setGenerating(true)
    setLoadingMessage(0)
    setQuestionnaireOpen(false)

    try {
      const response = await supabase.functions.invoke('generate-study-plan', {
        body: {
          semester_id: activeSemester.id,
          user_id: user.id,
          preferences: prefs,
        },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      toast.success('Study plan generated successfully!')
      await fetchData()
      
      // Check if Google Calendar is connected and prompt for sync
      const { data: profile } = await supabase
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', user.id)
        .single()
      
      if (profile?.google_refresh_token) {
        // Count sessions that will be synced
        const { count } = await supabase
          .from('study_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('plan_id', (await supabase
            .from('study_plans')
            .select('id')
            .eq('semester_id', activeSemester.id)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()).data?.id || '')
        
        setNewSessionCount(count || 0)
        setSyncPromptOpen(true)
      }
    } catch (error) {
      console.error('Failed to generate study plan:', error)
      toast.error('Failed to generate study plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSyncToCalendar = async () => {
    if (!user || !activeSemester) return
    
    setSyncingCalendar(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: {
          user_id: user.id,
          semester_id: activeSemester.id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (error) throw error

      toast.success(data?.message || 'Study sessions synced to Google Calendar!')
      setSyncPromptOpen(false)
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Failed to sync to Google Calendar')
    } finally {
      setSyncingCalendar(false)
    }
  }

  const handleSessionComplete = async (sessionId: string, actualDuration?: number, rating?: number, notes?: string) => {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          is_completed: true,
          actual_duration_minutes: actualDuration,
          rating,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (error) throw error

      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, is_completed: true, actual_duration_minutes: actualDuration ?? null, rating: rating ?? null, notes: notes ?? null }
          : s
      ))

      // Recalculate weekly progress
      await updateWeeklyProgress()
      
      toast.success('Session marked as complete!')
    } catch (error) {
      console.error('Failed to complete session:', error)
      toast.error('Failed to update session')
    }
  }

  const updateWeeklyProgress = async () => {
    if (!activePlan) return

    // Recalculate progress for each week
    const weeklyHours: Record<number, { planned: number; completed: number }> = {}

    sessions.forEach(session => {
      if (!weeklyHours[session.week_number]) {
        weeklyHours[session.week_number] = { planned: 0, completed: 0 }
      }
      weeklyHours[session.week_number].planned += session.duration_minutes / 60
      if (session.is_completed) {
        weeklyHours[session.week_number].completed += (session.actual_duration_minutes || session.duration_minutes) / 60
      }
    })

    // Update in database
    for (const [weekNum, hours] of Object.entries(weeklyHours)) {
      const week = parseInt(weekNum)
      await supabase
        .from('study_plan_weekly_progress')
        .update({
          completed_hours: hours.completed,
          is_completed: hours.completed >= hours.planned * 0.9,
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', activePlan.id)
        .eq('week_number', week)
    }

    // Refresh progress data
    const { data } = await supabase
      .from('study_plan_weekly_progress')
      .select('*')
      .eq('plan_id', activePlan.id)
      .order('week_number', { ascending: true })

    if (data) setWeeklyProgress(data)
  }

  // Mark entire week as complete
  const handleMarkWeekComplete = async (weekNumber: number) => {
    if (!activePlan) return

    try {
      // Mark all sessions in the week as complete
      const weekSessions = sessions.filter(s => s.week_number === weekNumber && !s.is_completed)
      
      for (const session of weekSessions) {
        await supabase
          .from('study_sessions')
          .update({
            is_completed: true,
            actual_duration_minutes: session.duration_minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id)
      }

      // Update local state
      setSessions(prev => prev.map(s => 
        s.week_number === weekNumber 
          ? { ...s, is_completed: true, actual_duration_minutes: s.duration_minutes }
          : s
      ))

      // Mark week progress as complete
      await supabase
        .from('study_plan_weekly_progress')
        .update({
          is_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', activePlan.id)
        .eq('week_number', weekNumber)

      // Refresh progress data
      const { data } = await supabase
        .from('study_plan_weekly_progress')
        .select('*')
        .eq('plan_id', activePlan.id)
        .order('week_number', { ascending: true })

      if (data) setWeeklyProgress(data)

      toast.success(`Week ${weekNumber} marked as complete!`)
      
      // Show celebration modal
      setCelebrationWeek(weekNumber)
    } catch (error) {
      console.error('Failed to mark week complete:', error)
      toast.error('Failed to mark week as complete')
    }
  }

  // Handle session edit
  const handleSessionEdit = async (updates: Partial<StudySession>) => {
    if (!editSession) return

    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editSession.id)

      if (error) throw error

      // Update local state
      setSessions(prev => prev.map(s =>
        s.id === editSession.id ? { ...s, ...updates } : s
      ))

      // Recalculate weekly progress if duration changed
      if (updates.duration_minutes) {
        await updateWeeklyProgress()
      }

      toast.success('Session updated')
    } catch (error) {
      console.error('Failed to update session:', error)
      toast.error('Failed to update session')
      throw error
    }
  }

  // Handle session reschedule
  const handleSessionReschedule = async (updates: { day: string; start_time: string; duration_minutes: number }) => {
    if (!rescheduleSession) return

    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          day: updates.day,
          start_time: updates.start_time,
          duration_minutes: updates.duration_minutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rescheduleSession.id)

      if (error) throw error

      // Update local state
      setSessions(prev => prev.map(s =>
        s.id === rescheduleSession.id 
          ? { ...s, day: updates.day as StudySession['day'], start_time: updates.start_time, duration_minutes: updates.duration_minutes }
          : s
      ))

      // Recalculate weekly progress
      await updateWeeklyProgress()

      toast.success(`Session rescheduled to ${updates.day} at ${updates.start_time}`)
    } catch (error) {
      console.error('Failed to reschedule session:', error)
      toast.error('Failed to reschedule session')
      throw error
    }
  }

  // Handle regenerate with confirmation
  const handleRegenerateClick = () => {
    if (activePlan) {
      setRegenerateConfirmOpen(true)
    } else {
      setQuestionnaireOpen(true)
    }
  }

  const handleRegenerateConfirm = () => {
    setRegenerateConfirmOpen(false)
    setQuestionnaireOpen(true)
  }

  // Export study plan
  const handleExport = async (format: 'ical' | 'json') => {
    if (!activePlan || !activeSemester) return

    try {
      if (format === 'json') {
        // Export as JSON
        const exportData = {
          semester: activeSemester.name,
          exportedAt: new Date().toISOString(),
          plan: activePlan.plan_json,
          sessions: sessions.map(s => ({
            week: s.week_number,
            day: s.day,
            time: s.start_time,
            duration: s.duration_minutes,
            title: s.title,
            course: s.course?.name || 'Unknown',
            completed: s.is_completed,
          })),
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `study-plan-${activeSemester.name.toLowerCase().replace(/\s+/g, '-')}.json`
        a.click()
        URL.revokeObjectURL(url)
        
        toast.success('Study plan exported as JSON')
      } else if (format === 'ical') {
        // Export as iCal
        const semesterStart = new Date(activeSemester.start_date)
        
        const icalEvents = sessions.map(session => {
          // Calculate the actual date for this session
          const dayOffset = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(session.day)
          const weekStart = new Date(semesterStart)
          weekStart.setDate(weekStart.getDate() + (session.week_number - 1) * 7)
          
          // Find the correct day in this week
          const currentDay = weekStart.getDay()
          const daysToAdd = (dayOffset - currentDay + 7) % 7
          const sessionDate = new Date(weekStart)
          sessionDate.setDate(sessionDate.getDate() + daysToAdd)
          
          // Parse time
          const [hours, minutes] = session.start_time.split(':').map(Number)
          sessionDate.setHours(hours, minutes, 0, 0)
          
          const endDate = new Date(sessionDate)
          endDate.setMinutes(endDate.getMinutes() + session.duration_minutes)
          
          const formatICalDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
          
          return `BEGIN:VEVENT
DTSTART:${formatICalDate(sessionDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${session.icon} ${session.title}
DESCRIPTION:${session.description || session.title}\\nCourse: ${session.course?.name || 'Study Session'}
UID:${session.id}@studyplanner
END:VEVENT`
        }).join('\n')

        const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Study Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Study Plan - ${activeSemester.name}
${icalEvents}
END:VCALENDAR`

        const blob = new Blob([icalContent], { type: 'text/calendar' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `study-plan-${activeSemester.name.toLowerCase().replace(/\s+/g, '-')}.ics`
        a.click()
        URL.revokeObjectURL(url)
        
        toast.success('Study plan exported as iCal')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export study plan')
    }
  }

  // Calculate on-track/behind status
  const getScheduleStatus = () => {
    if (!activePlan || weeklyProgress.length === 0) {
      return { status: 'unknown' as const, message: 'No data available' }
    }

    const currentWeekNum = getCurrentWeek((activePlan.plan_json as StudyPlanJSON)?.totalWeeks || 15)
    const pastWeeks = weeklyProgress.filter(w => w.week_number < currentWeekNum)
    
    if (pastWeeks.length === 0) {
      return { status: 'on_track' as const, message: 'Just getting started!' }
    }

    const totalPlanned = pastWeeks.reduce((sum, w) => sum + w.planned_hours, 0)
    const totalCompleted = pastWeeks.reduce((sum, w) => sum + w.completed_hours, 0)
    const completionRate = totalPlanned > 0 ? totalCompleted / totalPlanned : 1

    // Current week progress
    const currentWeekProgress = weeklyProgress.find(w => w.week_number === currentWeekNum)
    const currentWeekRate = currentWeekProgress && currentWeekProgress.planned_hours > 0
      ? currentWeekProgress.completed_hours / currentWeekProgress.planned_hours
      : 0

    if (completionRate >= 0.9 && currentWeekRate >= 0.5) {
      return { status: 'on_track' as const, message: 'On track!' }
    } else if (completionRate >= 0.7) {
      return { status: 'slightly_behind' as const, message: 'Slightly behind' }
    } else {
      return { status: 'behind' as const, message: 'Behind schedule' }
    }
  }

  const scheduleStatus = getScheduleStatus()

  // Calculate overall progress
  const overallProgress = (() => {
    if (sessions.length === 0) return { percentage: 0, completed: 0, total: 0 }
    const completed = sessions.filter(s => s.is_completed).length
    return {
      percentage: Math.round((completed / sessions.length) * 100),
      completed,
      total: sessions.length,
    }
  })()

  // Get current week's stats
  const currentWeekStats = (() => {
    const weekSessions = sessions.filter(s => s.week_number === selectedWeek)
    const completed = weekSessions.filter(s => s.is_completed).length
    const totalHours = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60
    const completedHours = weekSessions
      .filter(s => s.is_completed)
      .reduce((sum, s) => sum + (s.actual_duration_minutes || s.duration_minutes), 0) / 60

    return {
      sessions: weekSessions.length,
      completed,
      totalHours: totalHours.toFixed(1),
      completedHours: completedHours.toFixed(1),
      percentage: weekSessions.length > 0 ? Math.round((completed / weekSessions.length) * 100) : 0,
    }
  })()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  // Generation loading state
  if (generating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <div className="relative mb-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <Sparkles className="w-6 h-6 text-primary absolute top-0 right-1/3 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Generating Your Study Plan</h2>
            <p className="text-muted-foreground mb-6 h-6 transition-all">
              {LOADING_MESSAGES[loadingMessage]}
            </p>
            <Progress value={(loadingMessage + 1) * 20} className="h-2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (!activePlan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg text-center border-dashed">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Generate Your Semester Study Plan</CardTitle>
            <CardDescription className="text-base">
              Create a master study schedule for all your courses that prevents time conflicts and adapts to deadlines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm text-left">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <BookOpen className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Schedules study time across all {courses.length} courses</span>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>No overlapping sessions or time conflicts</span>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <LayoutList className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Prioritizes based on upcoming deadlines</span>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <CalendarDays className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Adapts to your weekly availability</span>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="mt-4"
              onClick={() => setQuestionnaireOpen(true)}
              disabled={courses.length === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Semester Study Plan
            </Button>

            {courses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add courses to your semester first to generate a study plan.
              </p>
            )}
          </CardContent>
        </Card>

        <StudyPlanQuestionnaire
          open={questionnaireOpen}
          onOpenChange={setQuestionnaireOpen}
          courses={courses}
          existingPreferences={preferences}
          onGenerate={handleGenerate}
          isGenerating={generating}
        />
      </div>
    )
  }

  // Active plan display
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Plan</h1>
          <p className="text-muted-foreground">
            {activeSemester?.name} • {(activePlan.plan_json as StudyPlanJSON)?.totalWeeks || 15} weeks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Schedule Status Badge */}
          {scheduleStatus.status !== 'unknown' && (
            <Badge 
              variant={scheduleStatus.status === 'on_track' ? 'default' : 'destructive'}
              className={
                scheduleStatus.status === 'on_track' 
                  ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                  : scheduleStatus.status === 'slightly_behind'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                    : 'bg-red-100 text-red-700 hover:bg-red-100'
              }
            >
              {scheduleStatus.status === 'on_track' && <TrendingUp className="w-3 h-3 mr-1" />}
              {scheduleStatus.status === 'slightly_behind' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {scheduleStatus.status === 'behind' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {scheduleStatus.message}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleRegenerateClick}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('ical')}>
                <CalendarDays className="w-4 h-4 mr-2" />
                Export as iCal (.ics)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <Download className="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Select
                value={selectedWeek.toString()}
                onValueChange={(v) => setSelectedWeek(parseInt(v))}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: (activePlan.plan_json as StudyPlanJSON)?.totalWeeks || 15 }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {weeklyProgress.find(w => w.week_number === selectedWeek)?.date_range || ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">
                {overallProgress.percentage}% Complete
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                ({currentWeekStats.completedHours}/{currentWeekStats.totalHours} hrs this week)
              </span>
            </div>
          </div>
          <Progress value={currentWeekStats.percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="weekly">Weekly Calendar</TabsTrigger>
          <TabsTrigger value="courses">Course Breakdown</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-4">
          <WeeklyCalendarView
            sessions={sessions.filter(s => s.week_number === selectedWeek)}
            courses={courses}
            onSessionClick={setSelectedSession}
            onStartSession={setTimerSession}
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <CourseBreakdownView
            courses={courses}
            sessions={sessions}
            selectedWeek={selectedWeek}
            planJson={activePlan.plan_json as unknown as StudyPlanJSON}
          />
        </TabsContent>

        <TabsContent value="today" className="mt-4">
          <TodayView
            sessions={sessions}
            courses={courses}
            onStartSession={setTimerSession}
            onMarkComplete={handleSessionComplete}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView
            weeklyProgress={weeklyProgress}
            sessions={sessions}
            currentWeek={getCurrentWeek((activePlan.plan_json as StudyPlanJSON)?.totalWeeks || 15)}
            planJson={activePlan.plan_json as unknown as StudyPlanJSON}
            onWeekSelect={(week) => {
              setSelectedWeek(week)
              setActiveTab('weekly')
            }}
            onMarkWeekComplete={handleMarkWeekComplete}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <StudyPlanQuestionnaire
        open={questionnaireOpen}
        onOpenChange={setQuestionnaireOpen}
        courses={courses}
        existingPreferences={preferences}
        onGenerate={handleGenerate}
        isGenerating={generating}
      />

      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          course={courses.find(c => c.id === selectedSession.course_id)}
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
          onStartSession={() => {
            setTimerSession(selectedSession)
            setSelectedSession(null)
          }}
          onMarkComplete={() => {
            handleSessionComplete(selectedSession.id)
            setSelectedSession(null)
          }}
          onEdit={() => {
            setEditSession(selectedSession)
            setSelectedSession(null)
          }}
          onReschedule={() => {
            setRescheduleSession(selectedSession)
            setSelectedSession(null)
          }}
        />
      )}

      {timerSession && (
        <StudyTimerModal
          session={timerSession}
          course={courses.find(c => c.id === timerSession.course_id)}
          open={!!timerSession}
          onOpenChange={(open) => !open && setTimerSession(null)}
          onComplete={(actualDuration, rating, notes) => {
            handleSessionComplete(timerSession.id, actualDuration, rating, notes)
            setTimerSession(null)
          }}
        />
      )}

      {/* Session Edit Modal */}
      {editSession && (
        <SessionEditModal
          session={editSession}
          course={courses.find(c => c.id === editSession.course_id)}
          open={!!editSession}
          onOpenChange={(open) => !open && setEditSession(null)}
          onSave={handleSessionEdit}
        />
      )}

      {/* Reschedule Session Modal */}
      {rescheduleSession && (
        <RescheduleSessionModal
          session={rescheduleSession}
          course={courses.find(c => c.id === rescheduleSession.course_id)}
          allSessions={sessions}
          open={!!rescheduleSession}
          onOpenChange={(open) => !open && setRescheduleSession(null)}
          onReschedule={handleSessionReschedule}
        />
      )}

      {/* Week Celebration Modal */}
      {celebrationWeek !== null && activePlan && (
        <WeekCelebrationModal
          open={celebrationWeek !== null}
          onOpenChange={(open) => !open && setCelebrationWeek(null)}
          weekNumber={celebrationWeek}
          weeklyProgress={weeklyProgress}
          sessions={sessions}
          planJson={activePlan.plan_json as unknown as StudyPlanJSON}
          onViewNextWeek={() => {
            setSelectedWeek(celebrationWeek + 1)
            setActiveTab('timeline')
          }}
        />
      )}

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Study Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current study plan. Your existing progress will be archived and you'll start fresh with a new schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync to Calendar Prompt Dialog */}
      <AlertDialog open={syncPromptOpen} onOpenChange={setSyncPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Sync to Google Calendar?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Your study plan has been created! Would you like to sync your{' '}
                <strong>{newSessionCount} study sessions</strong> to Google Calendar?
              </p>
              <p className="text-sm">
                This will add all sessions to your calendar with reminders.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncingCalendar}>
              Maybe Later
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncToCalendar} disabled={syncingCalendar}>
              {syncingCalendar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync to Calendar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

