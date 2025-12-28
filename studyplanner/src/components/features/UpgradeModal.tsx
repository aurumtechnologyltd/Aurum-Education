import { useState } from 'react'
import { useSubscription, type PlanTier } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetTier?: PlanTier
}

interface PlanFeatures {
  name: string
  semesters: string
  courses: string
  resources: string
  syllabus: string
  credits: string
  chat: boolean
  studyPlan: string
  calendar?: boolean
  support?: string
  export?: boolean
  priority?: boolean
  aiTutor?: boolean
  learningPaths?: boolean
  analytics?: boolean
  sso?: boolean
  admin?: boolean
  branding?: boolean
  accountManager?: boolean
}

const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    name: 'Free (Auditor)',
    semesters: '1 semester max',
    courses: '5 courses per semester',
    resources: '3 resources per course',
    syllabus: '1 syllabus per course',
    credits: '50 credits/month',
    chat: true,
    studyPlan: 'Basic study plans',
    calendar: true,
    support: 'Basic email support',
  },
  pro: {
    name: 'Pro (Scholar)',
    semesters: 'Unlimited semesters',
    courses: 'Unlimited courses',
    resources: '10 resources per course',
    syllabus: '1 syllabus per course',
    credits: '500 credits/month (rollover up to 1000)',
    chat: true,
    studyPlan: 'Advanced study plans',
    calendar: true,
    export: true,
    priority: true,
    support: 'Priority email support (48hr)',
  },
  pro_plus: {
    name: 'Pro+ (Dean\'s List)',
    semesters: 'Unlimited semesters',
    courses: 'Unlimited courses',
    resources: '10 resources per course',
    syllabus: '1 syllabus per course',
    credits: '2000 credits/month (rollover up to 4000)',
    chat: true,
    studyPlan: 'Advanced study plans + AI optimization',
    aiTutor: true,
    learningPaths: true,
    analytics: true,
    calendar: true,
    export: true,
    priority: true,
    support: 'Priority email support (24hr)',
  },
  enterprise: {
    name: 'Enterprise',
    semesters: 'Unlimited',
    courses: 'Unlimited',
    resources: 'Unlimited',
    syllabus: 'Unlimited',
    credits: 'Unlimited',
    chat: true,
    studyPlan: 'Advanced study plans + AI optimization',
    aiTutor: true,
    learningPaths: true,
    analytics: true,
    sso: true,
    admin: true,
    branding: true,
    accountManager: true,
  },
}

export function UpgradeModal({ open, onOpenChange, targetTier }: UpgradeModalProps) {
  const { subscription } = useSubscription()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const currentTier = subscription?.plan_tier || 'free'
  const target = targetTier || (currentTier === 'free' ? 'pro' : 'pro_plus')

  const handleUpgrade = async () => {
    if (!subscription) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please sign in to upgrade')
        return
      }

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          plan_tier: target,
          billing_interval: billingInterval,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Failed to start upgrade process')
    } finally {
      setLoading(false)
    }
  }

  const currentFeatures = PLAN_FEATURES[currentTier]
  const targetFeatures = PLAN_FEATURES[target]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade to {targetFeatures.name}</DialogTitle>
          <DialogDescription>
            Unlock powerful features to supercharge your academic planning
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Billing Toggle */}
          {target !== 'enterprise' && (
            <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`
                  px-4 py-2 rounded-md font-medium transition-colors
                  ${billingInterval === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent hover:bg-muted-foreground/10'
                  }
                `}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`
                  px-4 py-2 rounded-md font-medium transition-colors relative
                  ${billingInterval === 'yearly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent hover:bg-muted-foreground/10'
                  }
                `}
              >
                Yearly
                <Badge className="ml-2 bg-[#D4AF37] text-white">Save 2 months</Badge>
              </button>
            </div>
          )}

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Plan */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Current Plan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {currentFeatures.semesters === 'Unlimited' || currentFeatures.semesters === 'Unlimited semesters' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>{currentFeatures.semesters}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentFeatures.courses.includes('Unlimited') ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>{currentFeatures.courses}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentFeatures.resources.includes('Unlimited') ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>{currentFeatures.resources}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{currentFeatures.credits}</span>
                </div>
                {currentFeatures.aiTutor && (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>AI Tutor</span>
                  </div>
                )}
              </div>
            </div>

            {/* Upgraded Plan */}
            <div className="p-4 border-2 border-[#D4AF37] rounded-lg bg-[#D4AF37]/5">
              <h3 className="font-semibold mb-3">Upgraded Plan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{targetFeatures.semesters}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{targetFeatures.courses}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{targetFeatures.resources}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{targetFeatures.credits}</span>
                </div>
                {targetFeatures.aiTutor && (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>AI Tutor</span>
                  </div>
                )}
                {targetFeatures.learningPaths && (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Learning Paths</span>
                  </div>
                )}
                {targetFeatures.analytics && (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Advanced Analytics</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          {target !== 'enterprise' && (
            <div className="text-center">
              <div className="text-3xl font-bold">
                ${billingInterval === 'monthly'
                  ? target === 'pro' ? '5' : '15'
                  : target === 'pro' ? '50' : '150'
                }
                <span className="text-lg font-normal text-muted-foreground">
                  /{billingInterval === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
            </div>
          )}

          {/* Money-back guarantee */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]">
              30-Day Money-Back Guarantee
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Upgrade to ${targetFeatures.name}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

