import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import type { Course, Assignment } from '@/types/database'
import { calculateCourseGrade } from '@/lib/gradeCalculations'
import { cn } from '@/lib/utils'

interface OverviewTabProps {
  course: Course
  assignments: Assignment[]
}

export function OverviewTab({ course, assignments }: OverviewTabProps) {
  // Calculate course grade
  const gradeResult = calculateCourseGrade(assignments)

  // Calculate weight total
  const weightTotal = assignments.reduce((sum, a) => {
    return sum + (a.weight_percentage || 0)
  }, 0)

  // Calculate statistics
  const totalAssessments = assignments.length
  const gradedAssessments = assignments.filter(
    a => a.score_percentage !== null && a.score_percentage !== undefined
  ).length

  const scores = assignments
    .filter(a => a.score_percentage !== null && a.score_percentage !== undefined)
    .map(a => a.score_percentage!)
  
  const highestScore = scores.length > 0 ? Math.max(...scores) : null
  const lowestScore = scores.length > 0 ? Math.min(...scores) : null
  const averageScore = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
    : null

  // Get grade color
  const getGradeColor = (letterGrade: string) => {
    if (letterGrade.startsWith('A')) return 'text-green-600 dark:text-green-400'
    if (letterGrade.startsWith('B') || letterGrade.startsWith('C')) return 'text-yellow-600 dark:text-yellow-400'
    if (letterGrade.startsWith('D') || letterGrade === 'F') return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const getGradeBgColor = (letterGrade: string) => {
    if (letterGrade.startsWith('A')) return 'bg-green-50 dark:bg-green-950/20'
    if (letterGrade.startsWith('B') || letterGrade.startsWith('C')) return 'bg-yellow-50 dark:bg-yellow-950/20'
    if (letterGrade.startsWith('D') || letterGrade === 'F') return 'bg-red-50 dark:bg-red-950/20'
    return 'bg-muted'
  }

  return (
    <div className="space-y-6">
      {/* Course Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{course.name}</CardTitle>
          <CardDescription className="space-y-1">
            {course.code && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Code:</span>
                <Badge variant="secondary">{course.code}</Badge>
              </div>
            )}
            {course.instructor && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Instructor:</span>
                <span>{course.instructor}</span>
              </div>
            )}
            {course.credits !== null && course.credits !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Credits:</span>
                <span>{course.credits}</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Weight Validation Alert - Only show when invalid */}
      {weightTotal > 0 && (weightTotal < 99 || weightTotal > 101) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Assessment Weights Invalid</AlertTitle>
          <AlertDescription>
            Assessment weights total {weightTotal.toFixed(1)}%. Weights must equal 100% for accurate grade calculation. Please review your assessments.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Grade Card */}
      <Card className={cn(getGradeBgColor(gradeResult.letterGrade))}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Current Grade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gradeResult.letterGrade !== 'N/A' ? (
            <>
              <div className="flex items-baseline gap-4">
                <div className={cn('text-5xl font-bold', getGradeColor(gradeResult.letterGrade))}>
                  {gradeResult.letterGrade}
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-foreground">
                    {gradeResult.percentage.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    GPA: {gradeResult.gpaValue.toFixed(2)}
                  </span>
                </div>
              </div>
              {gradeResult.completionPercentage < 100 && (
                <p className="text-sm text-muted-foreground">
                  Based on {gradeResult.completionPercentage.toFixed(1)}% of coursework graded
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-lg text-muted-foreground">No grades recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add assessments and record scores to see your course grade
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Statistics */}
      {totalAssessments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Course Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{totalAssessments}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Graded</p>
                <p className="text-2xl font-bold">{gradedAssessments}</p>
              </div>
              {highestScore !== null && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Highest Score
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  </p>
                  <p className="text-2xl font-bold">{highestScore.toFixed(1)}%</p>
                </div>
              )}
              {lowestScore !== null && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Lowest Score
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  </p>
                  <p className="text-2xl font-bold">{lowestScore.toFixed(1)}%</p>
                </div>
              )}
              {averageScore !== null && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{averageScore.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

