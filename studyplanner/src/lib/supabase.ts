import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __SUPABASE_AUTH_HASH__?: string
  }
}

// SECURITY: Get the hash that was captured and cleaned by index.html inline script
// The inline script in index.html runs BEFORE any JS modules load, so the URL
// is already clean by the time we get here
const capturedHash: string | null = typeof window !== 'undefined' 
  ? window.__SUPABASE_AUTH_HASH__ || null 
  : null

// Clear the global after reading
if (typeof window !== 'undefined' && window.__SUPABASE_AUTH_HASH__) {
  delete window.__SUPABASE_AUTH_HASH__
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Disable detectSessionInUrl since we handle it manually
    detectSessionInUrl: false,
  },
})

// If we captured OAuth tokens from the inline script, manually process them
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

