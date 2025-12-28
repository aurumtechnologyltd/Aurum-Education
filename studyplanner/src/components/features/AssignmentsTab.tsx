import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, Trash2, Calendar, Pencil, AlertTriangle } from 'lucide-react'
import type { Assignment, Milestone, AssignmentType, AssignmentStatus } from '@/types/database'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { AssignmentEditModal } from './AssignmentEditModal'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { calculateCourseGrade } from '@/lib/gradeCalculations'
import { useSyncCalendar } from '@/hooks/useSyncCalendar'
import { createEventReminders } from '@/lib/reminderUtils'
import { Pagination } from '@/components/ui/pagination'

interface AssignmentsTabProps {
  courseId: string
  assignments: Assignment[]
  milestones: Milestone[]
  onRefresh: () => Promise<void>
}

export function AssignmentsTab({ courseId, assignments, milestones, onRefresh }: AssignmentsTabProps) {
  const { syncCalendar } = useSyncCalendar()
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [scoreInputMethod, setScoreInputMethod] = useState<'percentage' | 'points'>('points')
  const [weightPercentage, setWeightPercentage] = useState('')
  const [scorePercentage, setScorePercentage] = useState('')
  const [pointsEarned, setPointsEarned] = useState('')
  const [totalScore, setTotalScore] = useState('')
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Calculate completion percentage
  const doneCount = assignments.filter(a => a.status === 'done').length
  
  // Paginate assignments
  const paginatedAssignments = assignments.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )
  const totalPages = Math.ceil(assignments.length / itemsPerPage) || 1
  const completionPercentage = assignments.length > 0 
    ? Math.round((doneCount / assignments.length) * 100) 
    : 0

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Exam': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400'
      case 'Assignment': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
      case 'Project': return 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400'
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400'
      case 'in_progress': return 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400'
      case 'not_started': return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400'
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return 'Done'
      case 'in_progress': return 'In Progress'
      case 'not_started': return 'Not Started'
      default: return status
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const type = formData.get('type') as AssignmentType

    if (!dueDate) {
      toast.error('Please select a due date and time')
      setCreating(false)
      return
    }

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

    const { error } = await supabase.from('assignments').insert({
      course_id: courseId,
      title,
      type,
      due_date: dueDate.toISOString(),
      weight_percentage: weightPercentage ? parseFloat(weightPercentage) : null,
      total_score: totalScoreValue,
      score_percentage: calculatedScorePercentage,
      points_earned: pointsEarnedValue,
      // Keep old fields for backward compatibility
      weight: totalScoreValue, // Store total_score in weight for now
      score: pointsEarnedValue, // Store points_earned in score for now
      description: description.trim() || 'No description found',
      status: 'not_started',
    })

    if (error) {
      toast.error('Failed to create assessment')
    } else {
      toast.success('Assessment created')
      
      // Create reminders for the new assignment
      if (user && dueDate) {
        try {
          const { data: newAssignment } = await supabase
            .from('assignments')
            .select('id')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (newAssignment) {
            await createEventReminders({
              eventType: 'assessment',
              eventId: newAssignment.id,
              eventTime: dueDate,
              userId: user.id,
            })
          }
        } catch (reminderError) {
          console.error('Failed to create reminders:', reminderError)
          // Don't block assignment creation if reminders fail
        }
      }
      
      setDialogOpen(false)
      setDueDate(undefined)
      setDescription('')
      setWeightPercentage('')
      setScorePercentage('')
      setPointsEarned('')
      setTotalScore('')
      setScoreInputMethod('points')
      await onRefresh()
      await recalculateCourseGrade()
      // Auto-sync to calendar if connected
      await syncCalendar()
    }
    setCreating(false)
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      toast.error('Failed to delete assessment')
    } else {
      toast.success('Assessment deleted')
      await onRefresh()
      await recalculateCourseGrade()
      // Auto-sync to calendar if connected
      await syncCalendar()
    }
  }

  // Two-way sync: checkbox toggle updates status
  const handleCheckboxToggle = async (assignment: Assignment) => {
    const isDone = assignment.status === 'done'
    const newStatus: AssignmentStatus = isDone ? 'in_progress' : 'done'
    
    const { error } = await supabase
      .from('assignments')
      .update({ status: newStatus })
      .eq('id', assignment.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      await onRefresh()
      await checkCourseCompletion()
      // Auto-sync to calendar if connected
      await syncCalendar()
    }
  }

  // Status dropdown change handler with two-way sync
  const handleStatusChange = async (assignment: Assignment, newStatus: AssignmentStatus) => {
    const { error } = await supabase
      .from('assignments')
      .update({ status: newStatus })
      .eq('id', assignment.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      await onRefresh()
      await checkCourseCompletion()
      // Auto-sync to calendar if connected
      await syncCalendar()
    }
  }

  // Check if all assessments are done and mark course as finished
  const checkCourseCompletion = async () => {
    // Re-fetch assignments to get latest state
    const { data: latestAssignments } = await supabase
      .from('assignments')
      .select('status')
      .eq('course_id', courseId)

    if (!latestAssignments || latestAssignments.length === 0) return

    const allDone = latestAssignments.every(a => a.status === 'done')
    
    await supabase
      .from('courses')
      .update({ is_finished: allDone })
      .eq('id', courseId)
  }

  // Recalculate course grade and update course record
  const recalculateCourseGrade = async () => {
    // Fetch all assignments for this course
    const { data: allAssignments } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)

    if (!allAssignments) return

    // Calculate grade
    const gradeResult = calculateCourseGrade(allAssignments as Assignment[])

    // Always set course_gpa_value if we have a valid percentage, even if it's 0
    const gpaValue = gradeResult.percentage > 0 || gradeResult.letterGrade !== 'N/A' 
      ? gradeResult.gpaValue 
      : null

    // Update course record
    await supabase
      .from('courses')
      .update({
        course_grade_percentage: gradeResult.percentage > 0 ? gradeResult.percentage : null,
        course_letter_grade: gradeResult.letterGrade !== 'N/A' ? gradeResult.letterGrade : null,
        course_gpa_value: gpaValue,
        graded_weight_total: gradeResult.completionPercentage > 0 ? gradeResult.completionPercentage : null,
      })
      .eq('id', courseId)
  }

  const handleToggleMilestone = async (milestone: Milestone) => {
    const { error } = await supabase
      .from('milestones')
      .update({ is_completed: !milestone.is_completed })
      .eq('id', milestone.id)

    if (error) {
      toast.error('Failed to update milestone')
    } else {
      await onRefresh()
    }
  }

  // Calculate weight total for validation
  const weightTotal = assignments.reduce((sum, a) => {
    return sum + (a.weight_percentage || 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Weight Validation Alert - Only show when invalid */}
      {assignments.length > 0 && weightTotal > 0 && (weightTotal < 99 || weightTotal > 101) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Assessment Weights Invalid</AlertTitle>
          <AlertDescription>
            Assessment weights total {weightTotal.toFixed(1)}%. Weights must equal 100% for accurate grade calculation. Please review your assessments.
          </AlertDescription>
        </Alert>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Assessments</h2>
          {assignments.length > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={completionPercentage} className="w-24 h-2" />
              <span className="text-sm text-muted-foreground font-medium">
                {completionPercentage}% Complete
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setDescription('')
              setDueDate(undefined)
              setWeightPercentage('')
              setScorePercentage('')
              setPointsEarned('')
              setTotalScore('')
              setScoreInputMethod('points')
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Assessment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Assessment</DialogTitle>
                <DialogDescription>
                  Manually add an assessment to this course
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" placeholder="Midterm Exam" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select name="type" defaultValue="Assignment">
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
                    <Label htmlFor="weight_percentage">Assessment Weight (%)</Label>
                    <Input 
                      id="weight_percentage" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.01" 
                      placeholder="e.g., 30"
                      value={weightPercentage}
                      onChange={(e) => setWeightPercentage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      What percentage of your final grade is this assessment worth?
                    </p>
                  </div>
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
                    <Label htmlFor="score_percentage">Score Earned (%)</Label>
                    <Input 
                      id="score_percentage" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.01" 
                      placeholder="e.g., 50"
                      value={scorePercentage}
                      onChange={(e) => setScorePercentage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      What percentage score did you earn? (Leave blank if not graded yet)
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points_earned">Points Earned</Label>
                      <Input 
                        id="points_earned" 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="e.g., 10"
                        value={pointsEarned}
                        onChange={(e) => setPointsEarned(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_score">Total Points</Label>
                      <Input 
                        id="total_score" 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="e.g., 20"
                        value={totalScore}
                        onChange={(e) => setTotalScore(e.target.value)}
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
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <DateTimePicker
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Select due date and time"
                    defaultTime={{ hour: 23, minute: 59 }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Assignment description or notes..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Assessment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Assessments</CardTitle>
          <CardDescription>
            {assignments.length} assessment{assignments.length !== 1 ? 's' : ''} in this course
            {doneCount > 0 && ` • ${doneCount} completed`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No assessments yet. Add one manually or upload a syllabus to extract them automatically.
            </p>
          ) : (
            <>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Weight (%)</TableHead>
                  <TableHead>Score (%)</TableHead>
                    <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssignments.map(assignment => (
                    <TableRow key={assignment.id} className="group">
                    <TableCell>
                      <Checkbox
                          checked={assignment.status === 'done'}
                          onCheckedChange={() => handleCheckboxToggle(assignment)}
                          className="transition-all duration-200 data-[state=checked]:scale-110"
                      />
                    </TableCell>
                    <TableCell className={cn(
                        'font-medium transition-all duration-200',
                        assignment.status === 'done' && 'line-through text-muted-foreground'
                    )}>
                        <div>
                      {assignment.title}
                          {assignment.description && assignment.description !== 'No description found' && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {assignment.description}
                            </p>
                          )}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(assignment.type)}>
                        {assignment.type}
                      </Badge>
                    </TableCell>
                      <TableCell>
                        <Select 
                          value={assignment.status || 'not_started'} 
                          onValueChange={(v) => handleStatusChange(assignment, v as AssignmentStatus)}
                        >
                          <SelectTrigger className={cn(
                            'w-[130px] h-8 text-xs',
                            getStatusColor(assignment.status || 'not_started')
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">{getStatusLabel('not_started')}</SelectItem>
                            <SelectItem value="in_progress">{getStatusLabel('in_progress')}</SelectItem>
                            <SelectItem value="done">{getStatusLabel('done')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {assignment.weight_percentage ? `${assignment.weight_percentage.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {assignment.score_percentage !== null && assignment.score_percentage !== undefined ? (
                          <span className="font-medium">{assignment.score_percentage.toFixed(1)}%</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not graded</span>
                        )}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditingAssignment(assignment)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {assignments.length > itemsPerPage && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={assignments.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setPage}
                onItemsPerPageChange={setItemsPerPage}
                showItemsPerPage={true}
              />
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Timeline View */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Study Plan Timeline
            </CardTitle>
            <CardDescription>
              Your milestones leading up to each deadline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(milestone => {
                  const assignment = assignments.find(a => a.id === milestone.assignment_id)
                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg border transition-all duration-200',
                        milestone.is_completed 
                          ? 'bg-muted/50 border-muted' 
                          : 'hover:bg-muted/30'
                      )}
                    >
                      <Checkbox
                        checked={milestone.is_completed ?? false}
                        onCheckedChange={() => handleToggleMilestone(milestone)}
                        className="transition-all duration-200 data-[state=checked]:scale-110"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm transition-all duration-200',
                          milestone.is_completed && 'line-through text-muted-foreground'
                        )}>
                          {milestone.title}
                        </p>
                        {assignment && (
                          <p className="text-xs text-muted-foreground">
                            For: {assignment.title}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(milestone.date), 'EEE, MMM d')}
                        </p>
                        {assignment && (
                          <Badge variant="outline" className={cn('text-xs', getTypeColor(assignment.type))}>
                            {assignment.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Assessment Modal */}
      {editingAssignment && (
        <AssignmentEditModal
          assignment={editingAssignment}
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
          onSave={onRefresh}
        />
      )}
    </div>
  )
}
