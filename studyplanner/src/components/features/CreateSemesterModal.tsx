import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CreateSemesterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSemesterModal({ open, onOpenChange }: CreateSemesterModalProps) {
  const { user, refreshSemesters, setActiveSemester } = useAuth()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user) return
    
    if (!name.trim()) {
      toast.error('Semester name is required')
      return
    }
    if (!startDate) {
      toast.error('Start date is required')
      return
    }
    if (!endDate) {
      toast.error('End date is required')
      return
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date')
      return
    }

    setSaving(true)
    try {
      // First, set all other semesters to inactive
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .eq('user_id', user.id)

      // Create the new semester as active
      const { data, error } = await supabase
        .from('semesters')
        .insert({
          user_id: user.id,
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Semester created successfully')
      await refreshSemesters()
      if (data) {
        setActiveSemester(data)
      }
      
      // Reset form
      setName('')
      setStartDate('')
      setEndDate('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating semester:', error)
      toast.error('Failed to create semester')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Semester</DialogTitle>
          <DialogDescription>
            Set up a new semester to organize your courses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="semester-name">Semester Name</Label>
            <Input
              id="semester-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Fall 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Semester
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

