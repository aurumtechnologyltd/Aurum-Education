import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useThemeSync() {
  const { theme, setTheme } = useTheme()
  const { user, profile } = useAuth()
  const hasInitialized = useRef(false)
  const isSaving = useRef(false)

  // Load theme from database on initial mount only
  useEffect(() => {
    if (user && profile?.theme && !hasInitialized.current) {
      if (['light', 'dark', 'system'].includes(profile.theme)) {
        setTheme(profile.theme)
        hasInitialized.current = true
      }
    }
  }, [user, profile?.theme, setTheme])

  // Save theme to database when it changes (but not on initial load)
  useEffect(() => {
    if (!user || !theme || !hasInitialized.current || isSaving.current) return

    const saveTheme = async () => {
      // Don't save if it matches what's in the database
      if (profile?.theme === theme) return

      isSaving.current = true
      const { error } = await supabase
        .from('profiles')
        .update({ theme })
        .eq('id', user.id)

      if (error) {
        console.error('Failed to save theme preference:', error)
      }
      isSaving.current = false
    }

    // Debounce to avoid too many database writes
    const timeoutId = setTimeout(saveTheme, 500)
    return () => clearTimeout(timeoutId)
  }, [theme, user, profile?.theme])

  return { theme, setTheme }
}

