import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type PlanTier = 'free' | 'pro' | 'pro_plus' | 'enterprise'
export type BillingInterval = 'monthly' | 'yearly' | null

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_tier: PlanTier
  billing_interval: BillingInterval
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  credit_balance: number
  credit_cap: number
  current_period_start: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
}

interface UseSubscriptionReturn {
  subscription: Subscription | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  // Tier checks
  canCreateSemester: () => boolean
  canAddCourse: (currentCount: number) => boolean
  canAddResource: (currentCount: number) => boolean
  canUseChat: () => boolean
  canGenerateStudyPlan: () => boolean
  canUseAITutor: () => boolean
  canUseLearningPaths: () => boolean
  canUseAdvancedAnalytics: () => boolean
  // Credit operations
  hasCredits: (amount: number) => boolean
  checkCredits: (amount: number) => Promise<{ has_credits: boolean; balance: number }>
  deductCredits: (amount: number) => Promise<{ success: boolean; balance: number }>
}

const TIER_LIMITS = {
  free: {
    semesters: 1,
    coursesPerSemester: 5,
    resourcesPerCourse: 3,
    credits: { monthly: 0, oneTime: 50, cap: 50 },
  },
  pro: {
    semesters: Infinity,
    coursesPerSemester: Infinity,
    resourcesPerCourse: 10,
    credits: { monthly: 500, cap: 1000 },
  },
  pro_plus: {
    semesters: Infinity,
    coursesPerSemester: Infinity,
    resourcesPerCourse: 10,
    credits: { monthly: 2000, cap: 4000 },
  },
  enterprise: {
    semesters: Infinity,
    coursesPerSemester: Infinity,
    resourcesPerCourse: Infinity,
    credits: { monthly: Infinity, cap: Infinity },
  },
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        // If no subscription exists, use default free tier values from profile
        if (fetchError.code === 'PGRST116') {
          // Get profile data for credits
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_credits, credit_cap, plan_tier')
            .eq('id', user.id)
            .single()

          // Create a virtual subscription object from profile data
          const virtualSub: Subscription = {
            id: 'virtual',
            user_id: user.id,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            plan_tier: ((profile as any)?.plan_tier as PlanTier) || 'free',
            billing_interval: null,
            status: 'active',
            credit_balance: (profile as any)?.current_credits || 50,
            credit_cap: (profile as any)?.credit_cap || 50,
            current_period_start: null,
            current_period_end: null,
            created_at: null,
            updated_at: null,
          }
          setSubscription(virtualSub)
        } else {
          throw fetchError
        }
      } else {
        // Map database subscription to our Subscription type
        const profile = await supabase
          .from('profiles')
          .select('current_credits, credit_cap')
          .eq('id', user.id)
          .single()

        const mappedSub: Subscription = {
          id: data.id,
          user_id: data.user_id,
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
          plan_tier: (data.plan_tier as PlanTier) || 'free',
          billing_interval: null, // Infer from price or metadata if needed
          status: data.status as Subscription['status'],
          credit_balance: profile.data?.current_credits || 0,
          credit_cap: profile.data?.credit_cap || 50,
          current_period_start: data.current_period_start,
          current_period_end: data.current_period_end,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }
        setSubscription(mappedSub)
      }
      setError(null)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const tier = subscription?.plan_tier || 'free'
  const limits = TIER_LIMITS[tier]

  const canCreateSemester = useCallback(() => {
    if (tier === 'free') {
      // Check semester count - this would need to be passed in or fetched
      return true // We'll check this in the component
    }
    return true
  }, [tier])

  const canAddCourse = useCallback(
    (currentCount: number) => {
      if (tier === 'free') {
        return currentCount < limits.coursesPerSemester
      }
      return true
    },
    [tier, limits]
  )

  const canAddResource = useCallback(
    (currentCount: number) => {
      if (limits.resourcesPerCourse === Infinity) {
        return true
      }
      return currentCount < limits.resourcesPerCourse
    },
    [limits]
  )

  const canUseChat = useCallback(() => {
    return hasCredits(5)
  }, [])

  const canGenerateStudyPlan = useCallback(() => {
    return hasCredits(10)
  }, [])

  const canUseAITutor = useCallback(() => {
    return tier === 'pro_plus' || tier === 'enterprise'
  }, [tier])

  const canUseLearningPaths = useCallback(() => {
    return tier === 'pro_plus' || tier === 'enterprise'
  }, [tier])

  const canUseAdvancedAnalytics = useCallback(() => {
    return tier === 'pro_plus' || tier === 'enterprise'
  }, [tier])

  const hasCredits = useCallback(
    (amount: number) => {
      if (!subscription) return false
      if (tier === 'enterprise') return true
      return (subscription.credit_balance || 0) >= amount
    },
    [subscription, tier]
  )

  const checkCredits = useCallback(
    async (amount: number) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session')
        }

        const { data, error: checkError } = await supabase.functions.invoke(
          'credits-check',
          {
            body: { amount, action: 'check' },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        if (checkError) throw checkError

        return data as { has_credits: boolean; balance: number }
      } catch (err) {
        console.error('Error checking credits:', err)
        throw err
      }
    },
    [user]
  )

  const deductCredits = useCallback(
    async (amount: number) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session')
        }

        const { data, error: deductError } = await supabase.functions.invoke(
          'credits-check',
          {
            body: { amount, action: 'deduct' },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        if (deductError) throw deductError

        // Refresh subscription after deduction
        await fetchSubscription()

        return data as { success: boolean; balance: number }
      } catch (err) {
        console.error('Error deducting credits:', err)
        throw err
      }
    },
    [user, fetchSubscription]
  )

  return {
    subscription,
    loading,
    error,
    refresh: fetchSubscription,
    canCreateSemester,
    canAddCourse,
    canAddResource,
    canUseChat,
    canGenerateStudyPlan,
    canUseAITutor,
    canUseLearningPaths,
    canUseAdvancedAnalytics,
    hasCredits,
    checkCredits,
    deductCredits,
  }
}

