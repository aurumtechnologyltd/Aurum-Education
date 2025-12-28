import { useThemeSync } from '@/hooks/useThemeSync'

/**
 * Component that initializes theme from database and syncs changes
 * Must be placed inside both ThemeProvider and AuthProvider
 */
export function ThemeInitializer() {
  // This hook handles both loading theme from database and syncing changes
  useThemeSync()
  return null
}

