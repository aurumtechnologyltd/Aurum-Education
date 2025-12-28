import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, BookOpen, Calendar, CheckCircle2, Clock, Loader2, GraduationCap } from 'lucide-react'
import type { Course, Assignment, Milestone, Semester } from '@/types/database'

// Extended type for assignments with grade data
interface AssignmentWithGrade extends Assignment {
  course_id: string
}
import { getCourseIcon, COURSE_FIELD_LIMITS } from '@/components/features/CourseEditModal'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { calculateSemesterGPA, calculateCumulativeGPA, percentageToGPAValue } from '@/lib/gradeCalculations'

const COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
]

export default function Dashboard() {
  const { user, activeSemester, profile } = useAuth()
  const { refresh: refreshSubscription } = useSubscription()
  const [searchParams] = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [upcomingAssignments, setUpcomingAssignments] = useState<(Assignment & { course: Course })[]>([])
  const [thisWeekMilestones, setThisWeekMilestones] = useState<(Milestone & { assignment: Assignment & { course: Course } })[]>([])
  const [allAssignments, setAllAssignments] = useState<AssignmentWithGrade[]>([])

  // Security: Clean OAuth tokens from URL hash immediately
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      const path = window.location.pathname + window.location.search
      window.history.replaceState(null, '', path)
    }
  }, [])
  const [allSemesters, setAllSemesters] = useState<(Semester & { courses: Course[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nameLength, setNameLength] = useState(0)
  const [codeLength, setCodeLength] = useState(0)
  const [instructorLength, setInstructorLength] = useState(0)
  const [credits, setCredits] = useState('')

  useEffect(() => {
    if (activeSemester) {
      fetchData()
    }
  }, [activeSemester])

  // Handle upgrade success
  useEffect(() => {
    const upgrade = searchParams.get('upgrade')
    if (upgrade === 'success') {
      toast.success('Upgrade successful! Your subscription has been activated.')
      refreshSubscription()
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    } else if (upgrade === 'canceled') {
      toast.info('Upgrade canceled. You can try again anytime.')
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams, refreshSubscription])

  const fetchData = async () => {
    if (!activeSemester) return
    setLoading(true)

    // Fetch courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('semester_id', activeSemester.id)
      .order('created_at', { ascending: false })

    if (coursesData) {
      setCourses(coursesData)

      // Fetch upcoming assignments (next 14 days)
      const courseIds = coursesData.map(c => c.id)
      if (courseIds.length > 0) {
        const now = new Date()
        const twoWeeksLater = addDays(now, 14)

        // Fetch ALL assignments for GPA calculation
        const { data: allAssignmentsData } = await supabase
          .from('assignments')
          .select('*')
          .in('course_id', courseIds)

        if (allAssignmentsData) {
          setAllAssignments(allAssignmentsData)
        }

        // Fetch upcoming assignments (next 14 days, not done)
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('*')
          .in('course_id', courseIds)
          .neq('status', 'done')
          .gte('due_date', now.toISOString())
          .lte('due_date', twoWeeksLater.toISOString())
          .order('due_date', { ascending: true })
          .limit(5)

        if (assignmentsData) {
          const withCourse = assignmentsData.map(a => ({
            ...a,
            course: coursesData.find(c => c.id === a.course_id)!
          }))
          setUpcomingAssignments(withCourse)
        }

        // Fetch this week's milestones
        const weekLater = addDays(now, 7)
        const { data: milestonesData } = await supabase
          .from('milestones')
          .select('*, assignment:assignments(*, course:courses(*))')
          .eq('is_completed', false)
          .gte('date', now.toISOString().split('T')[0])
          .lte('date', weekLater.toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5)

        if (milestonesData) {
          // Filter to only milestones for courses in this semester
          const filtered = milestonesData.filter(m => 
            courseIds.includes((m.assignment as Assignment & { course: Course }).course_id)
          ) as (Milestone & { assignment: Assignment & { course: Course } })[]
          setThisWeekMilestones(filtered)
        }
      }

      // Fetch all semesters with courses for cumulative GPA
      if (user) {
        const { data: allSemestersData } = await supabase
          .from('semesters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (allSemestersData) {
          const semestersWithCourses = await Promise.all(
            allSemestersData.map(async (semester) => {
              const { data: semesterCourses } = await supabase
                .from('courses')
                .select('*')
                .eq('semester_id', semester.id)
              return {
                ...semester,
                courses: (semesterCourses || []) as Course[],
              }
            })
          )
          setAllSemesters(semestersWithCourses)
        }
      }
    }

    setLoading(false)
  }

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !activeSemester) return

    const formData = new FormData(e.currentTarget)
    const name = (formData.get('name') as string).trim()
    const code = (formData.get('code') as string).trim()
    const instructor = (formData.get('instructor') as string).trim()
    const creditsValue = credits ? parseInt(credits, 10) : null

    // Validate character limits
    if (name.length > COURSE_FIELD_LIMITS.name) {
      toast.error(`Course name must be ${COURSE_FIELD_LIMITS.name} characters or less`)
      return
    }
    if (code.length > COURSE_FIELD_LIMITS.code) {
      toast.error(`Course code must be ${COURSE_FIELD_LIMITS.code} characters or less`)
      return
    }
    if (instructor.length > COURSE_FIELD_LIMITS.instructor) {
      toast.error(`Instructor name must be ${COURSE_FIELD_LIMITS.instructor} characters or less`)
      return
    }

    setCreating(true)
    const color = COLORS[courses.length % COLORS.length]

    const { error } = await supabase.from('courses').insert({
      user_id: user.id,
      semester_id: activeSemester.id,
      name,
      code: code || null,
      instructor: instructor || null,
      credits: creditsValue,
      color,
    })

    if (error) {
      toast.error('Failed to create course')
    } else {
      toast.success('Course created successfully')
      setDialogOpen(false)
      setNameLength(0)
      setCodeLength(0)
      setInstructorLength(0)
      setCredits('')
      fetchData()
      // Dispatch event to notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('course-updated'))
    }
    setCreating(false)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Exam': return 'bg-red-50 text-red-600 border-red-200'
      case 'Assignment': return 'bg-blue-50 text-blue-600 border-blue-200'
      case 'Project': return 'bg-purple-50 text-purple-600 border-purple-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  // Calculate semester progress based on aggregate assessment completion across all courses
  const semesterProgress = (() => {
    if (allAssignments.length === 0) return 0
    
    // Count completed assessments (status === 'done')
    const completedCount = allAssignments.filter(a => a.status === 'done').length
    const totalCount = allAssignments.length
    
    // Calculate progress as percentage of completed assessments
    const progress = (completedCount / totalCount) * 100
    
    return Math.round(progress)
  })()

  // Recalculate course GPAs from grade percentage if course_gpa_value is null but course_grade_percentage exists
  const coursesWithRecalculatedGPA = courses.map(course => {
    if (course.course_gpa_value === null && course.course_grade_percentage !== null && course.course_grade_percentage !== undefined) {
      // Calculate GPA from percentage
      return {
        ...course,
        course_gpa_value: percentageToGPAValue(course.course_grade_percentage),
      }
    }
    return course
  })

  // Calculate semester GPA using new function
  const semesterGPA = calculateSemesterGPA(coursesWithRecalculatedGPA)
  const semesterGPAData = {
    gpa: semesterGPA > 0 ? semesterGPA.toFixed(2) : null,
    hasGrades: semesterGPA > 0,
    courseCount: coursesWithRecalculatedGPA.filter(c => {
      const hasGPA = c.course_gpa_value !== null && c.course_gpa_value !== undefined
      const hasPercentage = c.course_grade_percentage !== null && c.course_grade_percentage !== undefined
      return hasGPA || hasPercentage
    }).length,
  }

  // Recalculate cumulative GPA with updated course GPAs
  const allSemestersWithRecalculatedGPA = allSemesters.map(semester => ({
    ...semester,
    courses: semester.courses.map(course => {
      if (course.course_gpa_value === null && course.course_grade_percentage !== null && course.course_grade_percentage !== undefined) {
        return {
          ...course,
          course_gpa_value: percentageToGPAValue(course.course_grade_percentage),
        }
      }
      return course
    }),
  }))

  // Calculate cumulative GPA
  const cumulativeGPAResult = calculateCumulativeGPA(allSemestersWithRecalculatedGPA)
  const cumulativeGPAData = {
    gpa: cumulativeGPAResult.cumulativeGPA > 0 ? cumulativeGPAResult.cumulativeGPA.toFixed(2) : null,
    hasGrades: cumulativeGPAResult.cumulativeGPA > 0,
    totalCredits: cumulativeGPAResult.totalCredits,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back {profile?.full_name || 'there'}! Here&apos;s your semester overview.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setNameLength(0)
            setCodeLength(0)
            setInstructorLength(0)
            setCredits('')
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>
                Create a new course for {activeSemester?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                <Label htmlFor="name">Course Name *</Label>
                  <span className="text-xs text-muted-foreground">
                    {nameLength}/{COURSE_FIELD_LIMITS.name}
                  </span>
                </div>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Introduction to Computer Science" 
                  required 
                  maxLength={COURSE_FIELD_LIMITS.name}
                  onChange={(e) => setNameLength(e.target.value.length)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                <Label htmlFor="code">Course Code</Label>
                  <span className="text-xs text-muted-foreground">
                    {codeLength}/{COURSE_FIELD_LIMITS.code}
                  </span>
                </div>
                <Input 
                  id="code" 
                  name="code" 
                  placeholder="CS101" 
                  maxLength={COURSE_FIELD_LIMITS.code}
                  onChange={(e) => setCodeLength(e.target.value.length)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                <Label htmlFor="instructor">Instructor</Label>
                  <span className="text-xs text-muted-foreground">
                    {instructorLength}/{COURSE_FIELD_LIMITS.instructor}
                  </span>
                </div>
                <Input 
                  id="instructor" 
                  name="instructor" 
                  placeholder="Dr. Smith" 
                  maxLength={COURSE_FIELD_LIMITS.instructor}
                  onChange={(e) => setInstructorLength(e.target.value.length)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input 
                  id="credits" 
                  name="credits" 
                  type="number"
                  min="0"
                  max="12"
                  placeholder="3"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Number of credit hours for GPA calculation
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Course'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Semester Progress & GPA */}
      {activeSemester && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Semester Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(semesterProgress)}%</span>
              </div>
              <Progress value={semesterProgress} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{allAssignments.filter(a => a.status === 'done').length} completed</span>
                <span>{allAssignments.length} total assessments</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Semester GPA</p>
                  {semesterGPAData.hasGrades ? (
                    <>
                      <p className="text-2xl font-bold">{semesterGPAData.gpa} <span className="text-sm font-normal text-muted-foreground">/ 4.0</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on {semesterGPAData.courseCount} course{semesterGPAData.courseCount !== 1 ? 's' : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No grades recorded yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Cumulative GPA</p>
                  {cumulativeGPAData.hasGrades ? (
                    <>
                      <p className="text-2xl font-bold">{cumulativeGPAData.gpa} <span className="text-sm font-normal text-muted-foreground">/ 4.0</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cumulativeGPAData.totalCredits} credit{cumulativeGPAData.totalCredits !== 1 ? 's' : ''} earned
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No grades recorded yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Widgets */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* This Week */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">This Week</CardTitle>
              </div>
              <Link to="/study-plan" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            <CardDescription>Milestones due in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {thisWeekMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No milestones this week. You&apos;re all caught up!
              </p>
            ) : (
              <div className="space-y-3">
                {thisWeekMilestones.map(milestone => (
                  <div key={milestone.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {milestone.assignment.course.name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(milestone.date), 'EEE, MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-destructive" />
                <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              </div>
              <Link to="/calendar" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            <CardDescription>Assessments due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming deadlines. Great job staying ahead!
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingAssignments.map(assignment => (
                  <div key={assignment.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: assignment.course.color || '#2563eb' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">{assignment.course.name}</p>
                    </div>
                    <Badge variant="outline" className={getTypeColor(assignment.type)}>
                      {assignment.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Add your first course to get started with your semester
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => {
              const CourseIcon = getCourseIcon(course.icon)
              return (
              <Link key={course.id} to={`/course/${course.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: course.color || '#2563eb' }}
                      >
                          <CourseIcon className="w-5 h-5" />
                      </div>
                      {course.code && (
                        <Badge variant="secondary">{course.code}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                      {course.name}
                    </CardTitle>
                    {course.instructor && (
                      <CardDescription>{course.instructor}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

