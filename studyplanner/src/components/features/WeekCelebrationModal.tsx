import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Trophy, 
  Star, 
  Zap, 
  Flame, 
  Clock, 
  CheckCircle2,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import type { StudySession, StudyPlanWeeklyProgress, StudyPlanJSON } from '@/types/database'

interface WeekCelebrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekNumber: number
  weeklyProgress: StudyPlanWeeklyProgress[]
  sessions: StudySession[]
  planJson: StudyPlanJSON
  onViewNextWeek: () => void
}

interface Achievement {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}

export function WeekCelebrationModal({
  open,
  onOpenChange,
  weekNumber,
  weeklyProgress,
  sessions,
  planJson,
  onViewNextWeek,
}: WeekCelebrationModalProps) {
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(true)

  // Stop confetti after 5 seconds
  useEffect(() => {
    if (open) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Current week stats
  const currentWeekProgress = weeklyProgress.find(w => w.week_number === weekNumber)
  const weekSessions = sessions.filter(s => s.week_number === weekNumber)
  const completedSessions = weekSessions.filter(s => s.is_completed)
  // totalHours = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60 - available if needed
  const completedHours = completedSessions.reduce(
    (sum, s) => sum + (s.actual_duration_minutes || s.duration_minutes), 0
  ) / 60
  const completionRate = weekSessions.length > 0 
    ? Math.round((completedSessions.length / weekSessions.length) * 100) 
    : 0

  // Calculate average rating
  const ratingsTotal = completedSessions.reduce((sum, s) => sum + (s.rating || 0), 0)
  const sessionsWithRatings = completedSessions.filter(s => s.rating).length
  const averageRating = sessionsWithRatings > 0 
    ? (ratingsTotal / sessionsWithRatings).toFixed(1) 
    : null

  // Calculate streak (consecutive 90%+ weeks)
  const calculateStreak = (): number => {
    let streak = 0
    for (let i = weekNumber; i >= 1; i--) {
      const wp = weeklyProgress.find(w => w.week_number === i)
      const wSessions = sessions.filter(s => s.week_number === i)
      const wCompleted = wSessions.filter(s => s.is_completed)
      const rate = wSessions.length > 0 ? wCompleted.length / wSessions.length : 0
      if (rate >= 0.9 || wp?.is_completed) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const streak = calculateStreak()

  // Determine achievements
  const achievements = useMemo<Achievement[]>(() => {
    const result: Achievement[] = []

    if (completionRate === 100) {
      result.push({
        icon: <Trophy className="w-6 h-6" />,
        title: 'Perfect Week!',
        description: 'You completed 100% of your sessions',
        color: 'text-yellow-500',
      })
    } else if (completionRate >= 90) {
      result.push({
        icon: <Star className="w-6 h-6" />,
        title: 'Great Work!',
        description: `You completed ${completionRate}% of your sessions`,
        color: 'text-blue-500',
      })
    } else if (completionRate >= 75) {
      result.push({
        icon: <CheckCircle2 className="w-6 h-6" />,
        title: 'Strong Effort!',
        description: `You completed ${completionRate}% of your sessions`,
        color: 'text-green-500',
      })
    }

    if (streak >= 2) {
      result.push({
        icon: <Flame className="w-6 h-6" />,
        title: `${streak}-Week Streak!`,
        description: 'Consecutive weeks with 90%+ completion',
        color: 'text-orange-500',
      })
    }

    // Check if completed ahead of schedule (current day < 7)
    const today = new Date().getDay()
    if (completionRate >= 90 && today < 5) {
      result.push({
        icon: <Zap className="w-6 h-6" />,
        title: 'Early Bird!',
        description: 'Completed ahead of schedule',
        color: 'text-purple-500',
      })
    }

    if (averageRating && parseFloat(averageRating) >= 4.5) {
      result.push({
        icon: <Star className="w-6 h-6" />,
        title: 'High Quality!',
        description: `Average session rating: ${averageRating}/5`,
        color: 'text-yellow-500',
      })
    }

    return result
  }, [completionRate, streak, averageRating])

  // Next week info
  const nextWeekNumber = weekNumber + 1
  const nextWeekProgress = weeklyProgress.find(w => w.week_number === nextWeekNumber)
  const nextWeekSessions = sessions.filter(s => s.week_number === nextWeekNumber)
  const nextWeekPlan = planJson.weeklySchedule.find(w => w.week === nextWeekNumber)

  // Top courses for next week
  const nextWeekCourseHours: Record<string, number> = {}
  nextWeekSessions.forEach(s => {
    const key = s.course_id
    nextWeekCourseHours[key] = (nextWeekCourseHours[key] || 0) + s.duration_minutes / 60
  })
  const topCourses = Object.entries(nextWeekCourseHours)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([courseId, hours]) => ({
        name: planJson.courses.find(c => c.courseId === courseId)?.name || 'Unknown',
        hours,
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
          />
        )}

        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            🎉 Week Complete! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Week Stats */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Week {weekNumber}</span>
              <Badge variant="outline" className="bg-white/50">
                {currentWeekProgress?.date_range || ''}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{completedSessions.length}/{weekSessions.length}</p>
                <p className="text-sm text-muted-foreground">Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{completedHours.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Hours Studied</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            {averageRating && (
              <div className="mt-3 flex items-center justify-center gap-1">
                <span className="text-sm text-muted-foreground">Avg Rating:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(parseFloat(averageRating))
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{averageRating}</span>
              </div>
            )}
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Achievements</p>
              <div className="space-y-2">
                {achievements.map((achievement, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className={achievement.color}>{achievement.icon}</div>
                    <div>
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Next Week Preview */}
          {nextWeekSessions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Next Week Preview</span>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Week {nextWeekNumber}</span>
                  <span className="text-muted-foreground">{nextWeekProgress?.date_range || nextWeekPlan?.dateRange || ''}</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{nextWeekSessions.length} sessions</span>
                  </div>
                  <div>
                    <span className="font-medium">
                      {(nextWeekSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground"> hrs</span>
                  </div>
                </div>

                {topCourses.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Top courses:</p>
                    <div className="flex flex-wrap gap-1">
                      {topCourses.map((course, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {course.name} ({course.hours.toFixed(1)}h)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {nextWeekSessions.length > 0 && (
              <Button 
                className="flex-1"
                onClick={() => {
                  onViewNextWeek()
                  onOpenChange(false)
                }}
              >
                View Week {nextWeekNumber}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

