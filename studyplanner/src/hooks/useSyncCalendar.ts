import { useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'
// toast imported but not used for now - could be added for sync feedback
// import { toast } from 'sonner'

export function useSyncCalendar() {
  const { user, profile, activeSemester } = useAuth()

  const syncCalendar = useCallback(async () => {
    if (!user || !activeSemester || !profile?.google_refresh_token) {
      return { success: false, reason: 'not_connected' }
    }

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

      if (error) {
        console.error('Calendar sync error:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Calendar sync error:', error)
      return { success: false, error }
    }
  }, [user, activeSemester, profile])

  return { syncCalendar }
}

