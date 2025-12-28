import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Plus, Pencil, CheckCircle2, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import type { AssignmentType } from '@/types/database'

interface ExtractedAssignment {
  title: string
  due_date: string // ISO format YYYY-MM-DD
  type: AssignmentType
  weight: number | null
  id?: string // Optional ID for existing assignments
}

interface ExtractionReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  extractedAssignments: ExtractedAssignment[]
  onConfirm: (assignments: ExtractedAssignment[]) => Promise<void>
}

export function ExtractionReviewModal({
  open,
  onOpenChange,
  courseId,
  extractedAssignments: initialAssignments,
  onConfirm,
}: ExtractionReviewModalProps) {
  const [assignments, setAssignments] = useState<ExtractedAssignment[]>(initialAssignments)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAssignment, setNewAssignment] = useState<Partial<ExtractedAssignment>>({
    title: '',
    type: 'Assignment',
    weight: null,
  })
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined)

  // Reset state when modal opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setAssignments(initialAssignments)
      setEditingIndex(null)
      setShowAddForm(false)
      setNewAssignment({ title: '', type: 'Assignment', weight: null })
      setNewDueDate(undefined)
    }
    onOpenChange(isOpen)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
  }

  const handleSaveEdit = (index: number, updated: ExtractedAssignment) => {
    const updatedAssignments = [...assignments]
    updatedAssignments[index] = updated
    setAssignments(updatedAssignments)
    setEditingIndex(null)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
  }

  const handleDelete = (index: number) => {
    const updatedAssignments = assignments.filter((_, i) => i !== index)
    setAssignments(updatedAssignments)
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const handleAddAssignment = () => {
    if (!newAssignment.title || !newDueDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const added: ExtractedAssignment = {
      title: newAssignment.title,
      due_date: newDueDate.toISOString().split('T')[0],
      type: (newAssignment.type || 'Assignment') as AssignmentType,
      weight: newAssignment.weight || null,
    }

    setAssignments([...assignments, added])
    setNewAssignment({ title: '', type: 'Assignment', weight: null })
    setNewDueDate(undefined)
    setShowAddForm(false)
  }

  const handleConfirm = async () => {
    if (assignments.length === 0) {
      toast.error('Please add at least one assignment')
      return
    }

    setSaving(true)
    try {
      // Get original assignments with IDs
      const originalIds = new Set(initialAssignments.filter(a => (a as any).id).map(a => (a as any).id))
      const currentIds = new Set(assignments.filter(a => a.id).map(a => a.id!))
      
      // Find assignments to delete (in original but not in current)
      const toDelete = Array.from(originalIds).filter(id => !currentIds.has(id))
      
      // Delete removed assignments
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('assignments')
          .delete()
          .in('id', toDelete)
        
        if (deleteError) {
          console.error('Failed to delete assignments:', deleteError)
        }
      }

      // Update or create assignments
      for (const assignment of assignments) {
        if (assignment.id) {
          // Update existing
          const { error: updateError } = await supabase
            .from('assignments')
            .update({
              title: assignment.title,
              due_date: new Date(assignment.due_date).toISOString(),
              type: assignment.type,
              weight_percentage: assignment.weight,
              weight: assignment.weight, // Keep for backward compatibility
            })
            .eq('id', assignment.id)
          
          if (updateError) {
            console.error('Failed to update assignment:', updateError)
          }
        } else {
          // Create new
          const { error: insertError } = await supabase
            .from('assignments')
            .insert({
              course_id: courseId,
              title: assignment.title,
              due_date: new Date(assignment.due_date).toISOString(),
              type: assignment.type,
              weight_percentage: assignment.weight,
              weight: assignment.weight,
              status: 'not_started',
            })
          
          if (insertError) {
            console.error('Failed to create assignment:', insertError)
          }
        }
      }

      await onConfirm(assignments)
      toast.success(`Saved ${assignments.length} assignment${assignments.length !== 1 ? 's' : ''}`)
      handleOpenChange(false)
    } catch (error) {
      console.error('Failed to save assignments:', error)
      toast.error('Failed to save assignments')
    } finally {
      setSaving(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Exam': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400'
      case 'Assignment': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
      case 'Project': return 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400'
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Extracted Assignments</DialogTitle>
          <DialogDescription>
            Review and edit the assignments extracted from your syllabus. You can add missing ones or remove incorrect entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assignments extracted. Add them manually below.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Weight (%)</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment, index) => (
                    <TableRow key={index}>
                      {editingIndex === index ? (
                        <>
                          <TableCell>
                            <Input
                              value={assignment.title}
                              onChange={(e) => {
                                const updated = { ...assignment, title: e.target.value }
                                setAssignments(assignments.map((a, i) => i === index ? updated : a))
                              }}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={assignment.type}
                              onValueChange={(value) => {
                                const updated = { ...assignment, type: value as AssignmentType }
                                setAssignments(assignments.map((a, i) => i === index ? updated : a))
                              }}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Assignment">Assignment</SelectItem>
                                <SelectItem value="Project">Project</SelectItem>
                                <SelectItem value="Exam">Exam</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <DateTimePicker
                              value={new Date(assignment.due_date)}
                              onChange={(date) => {
                                if (date) {
                                  const updated = { ...assignment, due_date: date.toISOString().split('T')[0] }
                                  setAssignments(assignments.map((a, i) => i === index ? updated : a))
                                }
                              }}
                              defaultTime={{ hour: 23, minute: 59 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={assignment.weight || ''}
                              onChange={(e) => {
                                const updated = { ...assignment, weight: e.target.value ? parseFloat(e.target.value) : null }
                                setAssignments(assignments.map((a, i) => i === index ? updated : a))
                              }}
                              className="h-8 w-20"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleSaveEdit(index, assignment)}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTypeColor(assignment.type)}>
                              {assignment.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(assignment.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{assignment.weight ? `${assignment.weight}%` : '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(index)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {showAddForm ? (
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Add Missing Assignment</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-title">Title *</Label>
                  <Input
                    id="new-title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="Assignment name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-type">Type *</Label>
                  <Select
                    value={newAssignment.type || 'Assignment'}
                    onValueChange={(value) => setNewAssignment({ ...newAssignment, type: value as AssignmentType })}
                  >
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
                  <Label htmlFor="new-due-date">Due Date *</Label>
                  <DateTimePicker
                    value={newDueDate}
                    onChange={setNewDueDate}
                    placeholder="Select due date"
                    defaultTime={{ hour: 23, minute: 59 }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-weight">Weight (%)</Label>
                  <Input
                    id="new-weight"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newAssignment.weight || ''}
                    onChange={(e) => setNewAssignment({ ...newAssignment, weight: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAssignment} size="sm">
                  Add Assignment
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Missing Assignment
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || assignments.length === 0}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save ${assignments.length} Assignment${assignments.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

