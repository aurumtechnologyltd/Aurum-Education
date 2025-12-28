import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Loader2,
  RefreshCw,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { CalendarSyncSettings } from '@/types/database'

interface CalendarIntegrationSettingsProps {
  onOAuthStart?: () => void
}

export function CalendarIntegrationSettings({ onOAuthStart }: CalendarIntegrationSettingsProps) {
  const { user, profile, activeSemester } = useAuth()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [settings, setSettings] = useState<CalendarSyncSettings | null>(null)

  const isConnected = !!profile?.google_refresh_token

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error && data) {
      setSettings(data as CalendarSyncSettings)
    } else if (!error && !data) {
      // Create default settings
      const defaultSettings = {
        user_id: user.id,
        sync_assessments: true,
        sync_study_sessions: true,
        sync_custom_events: true,
        two_way_sync: false,
      }
      const { data: newData } = await supabase
        .from('calendar_sync_settings')
        .insert(defaultSettings)
        .select()
        .single()
      
      if (newData) {
        setSettings(newData as CalendarSyncSettings)
      }
    }
    setLoading(false)
  }

  const handleConnectGoogle = async () => {
    if (!user) return

    setConnecting(true)
    try {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

      if (!googleClientId) {
        toast.error('Google OAuth not configured. Please set VITE_GOOGLE_CLIENT_ID')
        setConnecting(false)
        return
      }

      const redirectUri = `${window.location.origin}/profile-settings`
      const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ].join(' ')

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent',
        state: user.id,
      })}`

      if (onOAuthStart) {
        onOAuthStart()
      }
      window.location.href = authUrl
    } catch (error) {
      console.error('OAuth error:', error)
      toast.error('Failed to initiate Google OAuth')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user) return

    const confirmed = window.confirm(
      'Are you sure you want to disconnect Google Calendar? Existing synced events will remain in your Google Calendar.'
    )
    if (!confirmed) return

    const { error } = await supabase
      .from('profiles')
      .update({ google_refresh_token: null })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to disconnect')
    } else {
      toast.success('Google Calendar disconnected')
      window.location.reload()
    }
  }

  const handleSyncNow = async () => {
    if (!user || !activeSemester) {
      toast.error('Please select an active semester')
      return
    }

    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: {
          user_id: user.id,
          semester_id: activeSemester.id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (error) throw error

      // Update last sync time
      await supabase
        .from('calendar_sync_settings')
        .update({ last_full_sync_at: new Date().toISOString() })
        .eq('user_id', user.id)

      toast.success(data?.message || 'Calendar synced successfully!')
      fetchSettings()
    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error('Failed to sync calendar. Check your connection and try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleSettingChange = async (field: keyof CalendarSyncSettings, value: boolean) => {
    if (!user || !settings) return

    // Optimistic update
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev)

    const { error } = await supabase
      .from('calendar_sync_settings')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) {
      // Revert on error
      setSettings((prev) => prev ? { ...prev, [field]: !value } : prev)
      toast.error('Failed to update setting')
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
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle>Google Calendar Integration</CardTitle>
        </div>
        <CardDescription>
          Sync your assessments, study sessions, and custom events to Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
              }`}
            >
              {isConnected ? (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Calendar className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isConnected ? 'Connected' : 'Not connected'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected
                  ? 'Your calendar is synced with Google'
                  : 'Connect to sync events automatically'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={syncing || !activeSemester}
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync Now
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <X className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectGoogle} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>

        {isConnected && settings && (
          <>
            {/* Last Sync Info */}
            {settings.last_full_sync_at && (
              <div className="text-sm text-muted-foreground">
                Last synced:{' '}
                {formatDistanceToNow(new Date(settings.last_full_sync_at), {
                  addSuffix: true,
                })}
              </div>
            )}

            <Separator />

            {/* Sync Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">What to sync</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncAssessments"
                    checked={settings.sync_assessments}
                    onCheckedChange={(checked) =>
                      handleSettingChange('sync_assessments', checked === true)
                    }
                  />
                  <Label htmlFor="syncAssessments" className="font-normal cursor-pointer">
                    Assessments (exams, assignments, projects)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncStudySessions"
                    checked={settings.sync_study_sessions}
                    onCheckedChange={(checked) =>
                      handleSettingChange('sync_study_sessions', checked === true)
                    }
                  />
                  <Label htmlFor="syncStudySessions" className="font-normal cursor-pointer">
                    Study Sessions from your study plan
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncCustomEvents"
                    checked={settings.sync_custom_events}
                    onCheckedChange={(checked) =>
                      handleSettingChange('sync_custom_events', checked === true)
                    }
                  />
                  <Label htmlFor="syncCustomEvents" className="font-normal cursor-pointer">
                    Custom events you create
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Two-Way Sync */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="twoWaySync"
                  checked={settings.two_way_sync}
                  onCheckedChange={(checked) =>
                    handleSettingChange('two_way_sync', checked === true)
                  }
                />
                <Label htmlFor="twoWaySync" className="font-normal cursor-pointer">
                  Two-way sync
                </Label>
                <Badge variant="secondary" className="text-xs">Beta</Badge>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                When enabled, changes you make in Google Calendar will also update your events in Aurum.
              </p>
            </div>
          </>
        )}

        {!isConnected && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h4 className="font-medium">Benefits of connecting</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                See your study schedule in Google Calendar
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Get calendar notifications on your phone
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Share your schedule with classmates
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Sync across all your devices
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

