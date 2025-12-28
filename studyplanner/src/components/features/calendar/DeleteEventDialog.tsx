import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { CalendarEvent } from '@/types/database'

type DeleteOption = 'single' | 'all' | 'future'

interface DeleteEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  onConfirm: (option: DeleteOption) => Promise<void>
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
}: DeleteEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<DeleteOption>('single')

  if (!event) return null

  const isRecurring = event.isRecurring
  const isAssessment = event.type === 'assessment'
  const isStudySession = event.type === 'study_session'

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(isRecurring ? selectedOption : 'single')
      onOpenChange(false)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {event.type === 'assessment' ? 'Assessment' : 'Event'}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>"{event.title}"</strong>?
            </p>

            {isAssessment && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                This will remove the assessment from your course. Any grades or scores
                associated with it will also be deleted.
              </div>
            )}

            {isStudySession && (
              <div className="p-3 bg-muted border rounded-lg text-sm">
                This will remove the study session from your plan. Your progress
                tracking will be updated.
              </div>
            )}

            {isRecurring && (
              <div className="space-y-2 pt-2">
                <p className="font-medium text-foreground">This is a recurring event</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="single"
                      checked={selectedOption === 'single'}
                      onChange={() => setSelectedOption('single')}
                      className="accent-primary"
                    />
                    <span>Delete this event only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="future"
                      checked={selectedOption === 'future'}
                      onChange={() => setSelectedOption('future')}
                      className="accent-primary"
                    />
                    <span>Delete this and future events</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="all"
                      checked={selectedOption === 'all'}
                      onChange={() => setSelectedOption('all')}
                      className="accent-primary"
                    />
                    <span>Delete all events in the series</span>
                  </label>
                </div>
              </div>
            )}

            {event.isSynced && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                This event is synced to Google Calendar. It will also be removed from
                your Google Calendar.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

