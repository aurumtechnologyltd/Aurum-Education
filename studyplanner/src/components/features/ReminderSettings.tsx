import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Bell, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ReminderSelector } from './ReminderSelector'
import type { ReminderConfig, Json } from '@/types/database'

export function ReminderSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reminders, setReminders] = useState<ReminderConfig[]>([
    { value: 1, unit: 'days', method: 'popup' },
  ])
  const [applyToAssessments, setApplyToAssessments] = useState(true)
  const [applyToStudySessions, setApplyToStudySessions] = useState(false)
  const [applyToCustomEvents, setApplyToCustomEvents] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('default_reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error && data) {
      setReminders((data.reminders as unknown as ReminderConfig[]) || [])
      setApplyToAssessments(data.apply_to_assessments ?? true)
      setApplyToStudySessions(data.apply_to_study_sessions ?? false)
      setApplyToCustomEvents(data.apply_to_custom_events ?? true)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Upsert settings
      const { error } = await supabase
        .from('default_reminder_settings')
        .upsert(
          {
            user_id: user.id,
            reminders: reminders as unknown as Json,
            apply_to_assessments: applyToAssessments,
            apply_to_study_sessions: applyToStudySessions,
            apply_to_custom_events: applyToCustomEvents,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) throw error

      toast.success('Reminder settings saved')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle>Default Reminders</CardTitle>
        </div>
        <CardDescription>
          Configure default reminders for new events. You can customize reminders for each individual event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReminderSelector value={reminders} onChange={setReminders} />

        <Separator />

        <div className="space-y-4">
          <Label className="text-sm font-medium">Apply to</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assessments"
                checked={applyToAssessments}
                onCheckedChange={(checked) => setApplyToAssessments(checked === true)}
              />
              <Label htmlFor="assessments" className="font-normal cursor-pointer">
                Assessments (exams, assignments, projects)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="studySessions"
                checked={applyToStudySessions}
                onCheckedChange={(checked) => setApplyToStudySessions(checked === true)}
              />
              <Label htmlFor="studySessions" className="font-normal cursor-pointer">
                Study Sessions
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customEvents"
                checked={applyToCustomEvents}
                onCheckedChange={(checked) => setApplyToCustomEvents(checked === true)}
              />
              <Label htmlFor="customEvents" className="font-normal cursor-pointer">
                Custom Events
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Default Reminders
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

