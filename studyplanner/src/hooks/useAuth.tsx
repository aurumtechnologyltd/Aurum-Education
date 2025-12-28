import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Semester } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  activeSemester: Semester | null
  semesters: Semester[]
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshSemesters: () => Promise<void>
  setActiveSemester: (semester: Semester) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Helper to clean OAuth tokens from URL hash (for security after processing)
    const cleanUrlHash = () => {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        const path = window.location.pathname + window.location.search
        window.history.replaceState(null, '', path)
      }
    }

    // Check if this is an OAuth callback (hash contains tokens)
    const isOAuthCallback = window.location.hash && window.location.hash.includes('access_token')

    // Listen for auth changes FIRST (before getSession)
    // This ensures we catch the SIGNED_IN event from OAuth callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Clean URL hash after OAuth callback is processed
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        cleanUrlHash()
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchSemesters(session.user.id)
      } else {
        setProfile(null)
        setSemesters([])
        setActiveSemester(null)
        // Only set loading false if NOT an OAuth callback
        // (OAuth callback will trigger SIGNED_IN which handles it)
        if (!isOAuthCallback) {
          setLoading(false)
        }
      }
    })

    // Get initial session
    // If this is an OAuth callback, Supabase will process the hash and trigger onAuthStateChange
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If we already have a session (not OAuth callback), set it
      if (session) {
        setSession(session)
        setUser(session.user)
        fetchProfile(session.user.id)
        fetchSemesters(session.user.id)
        cleanUrlHash()
      } else if (!isOAuthCallback) {
        // No session and not OAuth callback - user is not logged in
        setLoading(false)
      }
      // If isOAuthCallback and no session yet, wait for onAuthStateChange SIGNED_IN event
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    setProfile(data)
  }

  const fetchSemesters = async (userId: string) => {
    const { data } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    if (data) {
      setSemesters(data)
      const active = data.find(s => s.is_active) || data[0]
      setActiveSemester(active || null)
    }
    setLoading(false)
  }

  const refreshSemesters = async () => {
    if (user) {
      await fetchSemesters(user.id)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    return { error: error as Error | null }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar'
      }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      activeSemester,
      semesters,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshSemesters,
      setActiveSemester,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

