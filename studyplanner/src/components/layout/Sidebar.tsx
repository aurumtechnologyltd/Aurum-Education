import { useEffect, useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  LayoutDashboard, 
  Calendar, 
  Settings,
  ChevronDown,
  Plus,
  Check,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getCourseIcon } from '@/components/features/CourseEditModal'
import { CreateSemesterModal } from '@/components/features/CreateSemesterModal'
import type { Course } from '@/types/database'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/study-plan', icon: ClipboardList, label: 'Study Plan' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/semester-settings', icon: Settings, label: 'Semester Settings' },
]

export function Sidebar() {
  const { activeSemester, semesters, setActiveSemester, user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [createSemesterOpen, setCreateSemesterOpen] = useState(false)

  const fetchCourses = useCallback(async () => {
    if (!activeSemester) return
    
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('semester_id', activeSemester.id)
      .order('name', { ascending: true })
    
    if (data) setCourses(data)
  }, [activeSemester])

  useEffect(() => {
    if (activeSemester && user) {
      fetchCourses()
    }
  }, [activeSemester, user, fetchCourses])

  // Listen for course updates
  useEffect(() => {
    const handleCourseUpdate = () => {
      if (activeSemester && user) {
        fetchCourses()
      }
    }

    window.addEventListener('course-updated', handleCourseUpdate)
    return () => {
      window.removeEventListener('course-updated', handleCourseUpdate)
    }
  }, [activeSemester, user, fetchCourses])

  return (
    <aside className="w-64 border-r border-border bg-muted/10 flex flex-col h-screen sticky top-0">
      {/* Logo & Semester Dropdown */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        <img src="/Aurum Education Logo Transparent.png" alt="Aurum Education" className="w-11 h-11 object-contain" />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg tracking-tight">Aurum Education</h1>
          {semesters.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                  <span className="truncate">{activeSemester?.name || 'Select Semester'}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0 group-hover:translate-y-0.5 transition-transform" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {semesters.map((semester) => (
                  <DropdownMenuItem
                    key={semester.id}
                    onClick={() => setActiveSemester(semester)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{semester.name}</span>
                    {activeSemester?.id === semester.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreateSemesterOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Semester
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => setCreateSemesterOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Create Semester</span>
            </button>
          )}
        </div>
      </div>

      <CreateSemesterModal open={createSemesterOpen} onOpenChange={setCreateSemesterOpen} />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 h-10',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              )}
            </NavLink>
          ))}
        </nav>

        {courses.length > 0 && (
          <>
            <Separator className="my-4" />

            {/* Courses Quick Access */}
            <div className="space-y-1">
              <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Courses
              </p>
              {courses.map((course) => {
                const CourseIcon = getCourseIcon(course.icon)
                return (
                  <NavLink key={course.id} to={`/course/${course.id}`}>
                    {({ isActive }) => (
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-start gap-3 h-10 min-w-0',
                          isActive && 'bg-accent text-accent-foreground'
                        )}
                        title={course.name}
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: course.color || '#2563eb' }}
                        >
                          <CourseIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="truncate min-w-0 flex-1 text-left">{course.name}</span>
                      </Button>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Aurum Education
        </p>
      </div>
    </aside>
  )
}
