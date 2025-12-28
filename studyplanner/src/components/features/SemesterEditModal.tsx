import { useState, useEffect } from 'react'
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
import type { Semester } from '@/types/database'

interface SemesterEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semester: Semester | null
}

export function SemesterEditModal({ open, onOpenChange, semester }: SemesterEditModalProps) {
  const { refreshSemesters } = useAuth()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  // Pre-fill form when semester changes
  useEffect(() => {
    if (semester) {
      setName(semester.name)
      setStartDate(semester.start_date)
      setEndDate(semester.end_date)
      setDateError(null)
    }
  }, [semester, open])

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setStartDate(value)
      if (endDate && new Date(value) >= new Date(endDate)) {
        setDateError('End date must be after start date')
      } else {
        setDateError(null)
      }
    } else {
      setEndDate(value)
      if (startDate && new Date(value) <= new Date(startDate)) {
        setDateError('End date must be after start date')
      } else {
        setDateError(null)
      }
    }
  }

  const handleSave = async () => {
    if (!semester) return
    
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
      const { error } = await supabase
        .from('semesters')
        .update({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
        })
        .eq('id', semester.id)

      if (error) throw error

      toast.success('Semester updated successfully')
      await refreshSemesters()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating semester:', error)
      toast.error('Failed to update semester')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Semester</DialogTitle>
          <DialogDescription>
            Update semester information
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
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
          </div>
          {dateError && (
            <p className="text-sm text-destructive">{dateError}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !!dateError}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

