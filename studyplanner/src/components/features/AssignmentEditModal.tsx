import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import type { Assignment, AssignmentType, AssignmentStatus } from '@/types/database'
import { calculateCourseGrade } from '@/lib/gradeCalculations'

interface AssignmentEditModalProps {
  assignment: Assignment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => Promise<void>
}

// Calculate grade points from percentage
export function calculateGradePoints(percentage: number | null, _maxPercentage: number = 100): number | null {
  if (percentage === null || percentage === undefined) return null
  
  // 4.0 Scale conversion based on grading scale
  if (percentage >= 90) return 4.0
  if (percentage >= 85) return 3.67
  if (percentage >= 80) return 3.33
  if (percentage >= 75) return 3.0
  if (percentage >= 70) return 2.67
  if (percentage >= 65) return 2.33
  if (percentage >= 60) return 2.0
  if (percentage >= 55) return 1.67
  if (percentage >= 50) return 1.0
  return 0.0
}

export function AssignmentEditModal({ assignment, open, onOpenChange, onSave }: AssignmentEditModalProps) {
  const [title, setTitle] = useState(assignment.title)
  const [type, setType] = useState<AssignmentType>(assignment.type as AssignmentType)
  const [status, setStatus] = useState<AssignmentStatus>(assignment.status as AssignmentStatus || 'not_started')
  const [weightPercentage, setWeightPercentage] = useState(assignment.weight_percentage?.toString() || '')
  const [scoreInputMethod, setScoreInputMethod] = useState<'percentage' | 'points'>(
    assignment.score_percentage !== null && assignment.score_percentage !== undefined ? 'percentage' : 'points'
  )
  const [scorePercentage, setScorePercentage] = useState(assignment.score_percentage?.toString() || '')
  const [pointsEarned, setPointsEarned] = useState(assignment.points_earned?.toString() || '')
  const [totalScore, setTotalScore] = useState(assignment.total_score?.toString() || '')
  const [description, setDescription] = useState(assignment.description || '')
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date(assignment.due_date))
  const [saving, setSaving] = useState(false)

  // Reset form when assignment changes
  useEffect(() => {
    setTitle(assignment.title)
    setType(assignment.type as AssignmentType)
    setStatus(assignment.status as AssignmentStatus || 'not_started')
    setWeightPercentage(assignment.weight_percentage?.toString() || '')
    setScorePercentage(assignment.score_percentage?.toString() || '')
    setPointsEarned(assignment.points_earned?.toString() || '')
    setTotalScore(assignment.total_score?.toString() || '')
    setScoreInputMethod(
      assignment.score_percentage !== null && assignment.score_percentage !== undefined ? 'percentage' : 'points'
    )
    setDescription(assignment.description || '')
    setDueDate(new Date(assignment.due_date))
  }, [assignment])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!dueDate) {
      toast.error('Due date is required')
      return
    }

    setSaving(true)
    try {
      // Calculate score_percentage based on input method
      let calculatedScorePercentage: number | null = null
      let pointsEarnedValue: number | null = null
      let totalScoreValue: number | null = null

      if (scoreInputMethod === 'percentage') {
        calculatedScorePercentage = scorePercentage ? parseFloat(scorePercentage) : null
      } else {
        // Points method
        pointsEarnedValue = pointsEarned ? parseFloat(pointsEarned) : null
        totalScoreValue = totalScore ? parseFloat(totalScore) : null
        
        if (pointsEarnedValue !== null && totalScoreValue !== null && totalScoreValue > 0) {
          calculatedScorePercentage = (pointsEarnedValue / totalScoreValue) * 100
        }
      }

      const weightPercentageValue = weightPercentage ? parseFloat(weightPercentage) : null
      const gradePoints = calculatedScorePercentage !== null 
        ? calculateGradePoints(calculatedScorePercentage, 100) // Use percentage directly
        : null
      
      const { error } = await supabase
        .from('assignments')
        .update({
          title: title.trim(),
          type,
          status,
          weight_percentage: weightPercentageValue,
          total_score: totalScoreValue,
          score_percentage: calculatedScorePercentage,
          points_earned: pointsEarnedValue,
          // Keep old fields for backward compatibility
          weight: totalScoreValue,
          score: pointsEarnedValue,
          grade_points: gradePoints,
          description: description.trim() || null,
          due_date: dueDate.toISOString(),
        })
        .eq('id', assignment.id)

      if (error) throw error

      // Recalculate course grade
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', assignment.course_id)

      if (allAssignments) {
        const gradeResult = calculateCourseGrade(allAssignments as Assignment[])
        // Always set course_gpa_value if we have a valid percentage, even if it's 0
        const gpaValue = gradeResult.percentage > 0 || gradeResult.letterGrade !== 'N/A' 
          ? gradeResult.gpaValue 
          : null
        
        await supabase
          .from('courses')
          .update({
            course_grade_percentage: gradeResult.percentage > 0 ? gradeResult.percentage : null,
            course_letter_grade: gradeResult.letterGrade !== 'N/A' ? gradeResult.letterGrade : null,
            course_gpa_value: gpaValue,
            graded_weight_total: gradeResult.completionPercentage > 0 ? gradeResult.completionPercentage : null,
          })
          .eq('id', assignment.course_id)
      }

      toast.success('Assessment updated')
      await onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast.error('Failed to update assessment')
    } finally {
      setSaving(false)
    }
  }

  const getStatusLabel = (s: AssignmentStatus) => {
    switch (s) {
      case 'not_started': return 'Not Started'
      case 'in_progress': return 'In Progress'
      case 'done': return 'Done'
      default: return s
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Assessment</DialogTitle>
          <DialogDescription>
            Update assessment details and record your score
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assessment title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AssignmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assignment">Assignment</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="Exam">Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AssignmentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">{getStatusLabel('not_started')}</SelectItem>
                  <SelectItem value="in_progress">{getStatusLabel('in_progress')}</SelectItem>
                  <SelectItem value="done">{getStatusLabel('done')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-weight-percentage">Assessment Weight (%)</Label>
            <Input
              id="edit-weight-percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={weightPercentage}
              onChange={(e) => setWeightPercentage(e.target.value)}
              placeholder="e.g., 30"
            />
            <p className="text-xs text-muted-foreground">
              What percentage of your final grade is this assessment worth?
            </p>
          </div>

          <div className="space-y-2">
            <Label>Score Input Method</Label>
            <Select value={scoreInputMethod} onValueChange={(v) => setScoreInputMethod(v as 'percentage' | 'points')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Points (Points Earned / Total Points)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scoreInputMethod === 'percentage' ? (
            <div className="space-y-2">
              <Label htmlFor="edit-score-percentage">Score Earned (%)</Label>
              <Input
                id="edit-score-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={scorePercentage}
                onChange={(e) => setScorePercentage(e.target.value)}
                placeholder="e.g., 50"
              />
              <p className="text-xs text-muted-foreground">
                What percentage score did you earn? (Leave blank if not graded yet)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-points-earned">Points Earned</Label>
                <Input
                  id="edit-points-earned"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pointsEarned}
                  onChange={(e) => setPointsEarned(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-total-score">Total Points</Label>
                <Input
                  id="edit-total-score"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalScore}
                  onChange={(e) => setTotalScore(e.target.value)}
                  placeholder="e.g., 20"
                />
                {pointsEarned && totalScore && parseFloat(totalScore) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Percentage: {((parseFloat(pointsEarned) / parseFloat(totalScore)) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <DateTimePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select due date and time"
              defaultTime={{ hour: 23, minute: 59 }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assessment description or notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

