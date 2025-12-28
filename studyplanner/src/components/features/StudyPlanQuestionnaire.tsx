import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Clock, Timer, Target, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Course, CoursePriority, StudyPlanPreferences } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface StudyPlanQuestionnaireProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courses: Course[]
  existingPreferences?: StudyPlanPreferences | null
  onGenerate: (preferences: {
    total_weekly_hours: number
    session_length_minutes: number
    course_priorities: Record<string, CoursePriority>
  }) => Promise<void>
  isGenerating: boolean
}

type HoursPreset = 'light' | 'moderate' | 'intensive' | 'custom'
type SessionPreset = 'short' | 'medium' | 'long'

const HOURS_PRESETS: Record<HoursPreset, { label: string; description: string; value: number }> = {
  light: { label: 'Light', description: '20-30 hrs/week', value: 25 },
  moderate: { label: 'Moderate', description: '30-40 hrs/week', value: 35 },
  intensive: { label: 'Intensive', description: '40-50 hrs/week', value: 45 },
  custom: { label: 'Custom', description: 'Set your own', value: 0 },
}

const SESSION_PRESETS: Record<SessionPreset, { label: string; description: string; value: number }> = {
  short: { label: 'Short', description: '30-45 min', value: 45 },
  medium: { label: 'Medium', description: '60 min', value: 60 },
  long: { label: 'Long', description: '90-120 min', value: 90 },
}

const PRIORITY_OPTIONS: { value: CoursePriority; label: string; color: string }[] = [
  { value: 'high', label: 'High Priority', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'low', label: 'Low Priority', color: 'bg-slate-100 text-slate-700 border-slate-200' },
]

export function StudyPlanQuestionnaire({
  open,
  onOpenChange,
  courses,
  existingPreferences,
  onGenerate,
  isGenerating,
}: StudyPlanQuestionnaireProps) {
  const [step, setStep] = useState(1)
  
  // Initialize with existing preferences or defaults
  const getInitialHoursPreset = (): HoursPreset => {
    if (!existingPreferences) return 'moderate'
    const hours = existingPreferences.total_weekly_hours
    if (hours >= 20 && hours <= 30) return 'light'
    if (hours > 30 && hours <= 40) return 'moderate'
    if (hours > 40 && hours <= 50) return 'intensive'
    return 'custom'
  }

  const getInitialSessionPreset = (): SessionPreset => {
    if (!existingPreferences) return 'medium'
    const mins = existingPreferences.session_length_minutes
    if (mins <= 45) return 'short'
    if (mins <= 60) return 'medium'
    return 'long'
  }

  const [hoursPreset, setHoursPreset] = useState<HoursPreset>(getInitialHoursPreset())
  const [customHours, setCustomHours] = useState(
    existingPreferences?.total_weekly_hours?.toString() || '35'
  )
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>(getInitialSessionPreset())
  const [coursePriorities, setCoursePriorities] = useState<Record<string, CoursePriority>>(
    (existingPreferences?.course_priorities as Record<string, CoursePriority>) || 
    Object.fromEntries(courses.map(c => [c.id, 'normal' as CoursePriority]))
  )

  const totalHours = hoursPreset === 'custom' 
    ? parseInt(customHours) || 35 
    : HOURS_PRESETS[hoursPreset].value

  const sessionMinutes = SESSION_PRESETS[sessionPreset].value

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleGenerate = async () => {
    await onGenerate({
      total_weekly_hours: totalHours,
      session_length_minutes: sessionMinutes,
      course_priorities: coursePriorities,
    })
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Clock className="w-6 h-6" />
              <div>
                <h3 className="font-semibold text-lg">Total Weekly Study Time</h3>
                <p className="text-sm text-muted-foreground">
                  How many hours per week for studying (all courses)?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(HOURS_PRESETS) as [HoursPreset, typeof HOURS_PRESETS[HoursPreset]][]).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setHoursPreset(key)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    hoursPreset === key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-sm text-muted-foreground">{preset.description}</div>
                </button>
              ))}
            </div>

            {hoursPreset === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customHours">Hours per week</Label>
                <Input
                  id="customHours"
                  type="number"
                  min="10"
                  max="80"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  className="w-32"
                />
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-medium">Selected:</span> {totalHours} hours/week
                {courses.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}(~{Math.round(totalHours / courses.length)} hrs/course)
                  </span>
                )}
              </p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Timer className="w-6 h-6" />
              <div>
                <h3 className="font-semibold text-lg">Session Length</h3>
                <p className="text-sm text-muted-foreground">
                  Preferred study session length?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(SESSION_PRESETS) as [SessionPreset, typeof SESSION_PRESETS[SessionPreset]][]).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setSessionPreset(key)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-center transition-all',
                    sessionPreset === key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-sm text-muted-foreground">{preset.description}</div>
                </button>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-medium">Selected:</span> {sessionMinutes} minute sessions
                <span className="text-muted-foreground">
                  {' '}(~{Math.round((totalHours * 60) / sessionMinutes)} sessions/week)
                </span>
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Target className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Course Priorities</h3>
                <p className="text-sm text-muted-foreground">
                  Select the priority below
                </p>
              </div>
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              <div className="space-y-3 pr-2">
                {courses.map((course) => {
                  const CourseIcon = getCourseIcon(course.icon)
                  const currentPriority = coursePriorities[course.id] || 'normal'
                  
                  return (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: course.color || '#2563eb' }}
                      >
                        <CourseIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{course.name}</p>
                        {course.code && (
                          <p className="text-xs text-muted-foreground">{course.code}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Select
                          value={currentPriority}
                          onValueChange={(value: CoursePriority) => setCoursePriorities(prev => ({
                            ...prev,
                            [course.id]: value
                          }))}
                        >
                          <SelectTrigger 
                            className={cn(
                              'w-[110px] h-8 text-xs',
                              currentPriority === 'high' && 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
                              currentPriority === 'normal' && 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
                              currentPriority === 'low' && 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.value === 'high' ? 'High' : option.value === 'low' ? 'Low' : 'Normal'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 flex-shrink-0">
              <div className="flex gap-4 text-sm flex-wrap">
                <div>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                    {Object.values(coursePriorities).filter(p => p === 'high').length} High
                  </Badge>
                </div>
                <div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                    {Object.values(coursePriorities).filter(p => p === 'normal').length} Normal
                  </Badge>
                </div>
                <div>
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                    {Object.values(coursePriorities).filter(p => p === 'low').length} Low
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Generate Study Plan</DialogTitle>
          <DialogDescription>
            Step {step} of 3
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {renderStep()}
        </div>

        {/* Fixed footer with buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isGenerating}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Plan'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

