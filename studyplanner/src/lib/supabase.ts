import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// SECURITY: Capture and immediately clean OAuth tokens from URL hash
// This prevents tokens from being visible in browser URL bar and history
let capturedHash: string | null = null
if (typeof window !== 'undefined' && window.location.hash) {
  const hash = window.location.hash
  if (hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('error')) {
    // Capture the hash for Supabase to process
    capturedHash = hash
    // Immediately clean the URL - this happens synchronously before any rendering
    const cleanPath = window.location.pathname + window.location.search
    window.history.replaceState(null, '', cleanPath)
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // If we captured and cleaned the hash, we need to manually set the session
    // Supabase will still try to read from URL, but we've already cleaned it
    // The session will be restored from the hash we captured
  },
})

// If we captured OAuth tokens, manually process them
if (capturedHash) {
  // Parse the hash and set the session
  const hashParams = new URLSearchParams(capturedHash.substring(1))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  
  if (accessToken && refreshToken) {
    // Set the session manually since we cleaned the URL
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).catch(() => {
      // Session will be restored from storage if this fails
    })
  }
}

