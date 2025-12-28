import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Pause, Play, Square, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudySession, Course } from '@/types/database'
import { getCourseIcon } from './CourseEditModal'

interface StudyTimerModalProps {
  session: StudySession
  course?: Course
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (actualDuration: number, rating?: number, notes?: string) => void
}

export function StudyTimerModal({
  session,
  course,
  open,
  onOpenChange,
  onComplete,
}: StudyTimerModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(session.duration_minutes * 60)
  const [isPaused, setIsPaused] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [showEndForm, setShowEndForm] = useState(false)
  
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  // Reset state when session changes
  useEffect(() => {
    setTimeRemaining(session.duration_minutes * 60)
    setIsPaused(false)
    setIsRunning(false)
    setElapsedTime(0)
    setRating(null)
    setNotes('')
    setShowEndForm(false)
  }, [session.id, session.duration_minutes])

  // Timer logic
  useEffect(() => {
    if (!isRunning || isPaused) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setShowEndForm(true)
          setIsRunning(false)
          return 0
        }
        return prev - 1
      })
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isPaused])

  const handleStart = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now()
      setIsRunning(true)
    }
    setIsPaused(false)
  }, [isRunning])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    pausedTimeRef.current = Date.now()
  }, [])

  const handleEnd = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setShowEndForm(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const actualMinutes = Math.round(elapsedTime / 60)
    onComplete(actualMinutes, rating || undefined, notes || undefined)
  }, [elapsedTime, rating, notes, onComplete])

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((session.duration_minutes * 60 - timeRemaining) / (session.duration_minutes * 60)) * 100

  const CourseIcon = getCourseIcon(course?.icon ?? null)

  // Start immediately when opened
  useEffect(() => {
    if (open && !isRunning && !showEndForm) {
      handleStart()
    }
  }, [open, isRunning, showEndForm, handleStart])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: course?.color || '#3b82f6' }}
            >
              <CourseIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{session.title}</p>
              <p className="text-sm font-normal text-muted-foreground truncate">
                {course?.name || 'Study Session'}
              </p>
            </div>
            <span className="text-2xl">{session.icon}</span>
          </DialogTitle>
        </DialogHeader>

        {!showEndForm ? (
          <div className="py-8">
            {/* Timer Display */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center">
                {/* Progress ring */}
                <svg className="w-48 h-48 -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                    className="text-primary transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-mono font-bold">
                    {formatTimerDisplay(timeRemaining)}
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    {isPaused ? 'Paused' : isRunning ? 'Studying' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {isPaused ? (
                <Button size="lg" onClick={handleStart} className="gap-2">
                  <Play className="w-5 h-5" />
                  Resume
                </Button>
              ) : isRunning ? (
                <Button size="lg" variant="outline" onClick={handlePause} className="gap-2">
                  <Pause className="w-5 h-5" />
                  Pause
                </Button>
              ) : (
                <Button size="lg" onClick={handleStart} className="gap-2">
                  <Play className="w-5 h-5" />
                  Start
                </Button>
              )}
              
              {isRunning && (
                <Button size="lg" variant="destructive" onClick={handleEnd} className="gap-2">
                  <Square className="w-5 h-5" />
                  End
                </Button>
              )}
            </div>

            {/* Elapsed time */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Time elapsed: {formatTimerDisplay(elapsedTime)}
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="text-center">
              <p className="text-lg font-medium">Session Complete!</p>
              <p className="text-muted-foreground">
                You studied for {Math.round(elapsedTime / 60)} minutes
              </p>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>How was this session? (optional)</Label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      rating && rating >= star
                        ? 'text-yellow-500'
                        : 'text-muted-foreground hover:text-yellow-400'
                    )}
                  >
                    <Star
                      className="w-8 h-8"
                      fill={rating && rating >= star ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="What did you learn? Any thoughts?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              Complete Session
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

