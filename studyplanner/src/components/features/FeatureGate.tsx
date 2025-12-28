import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'
import { useState } from 'react'

interface FeatureGateProps {
  children: ReactNode
  requiredTier?: 'free' | 'pro' | 'pro_plus' | 'enterprise'
  requiredCredits?: number
  feature: string
  message?: string
  onUpgrade?: () => void
}

export function FeatureGate({
  children,
  requiredTier = 'free',
  requiredCredits,
  feature,
  message,
  onUpgrade,
}: FeatureGateProps) {
  const { subscription, hasCredits } = useSubscription()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  const currentTier = subscription?.plan_tier || 'free'
  const tierOrder = { free: 0, pro: 1, pro_plus: 2, enterprise: 3 }
  const hasTierAccess = tierOrder[currentTier] >= tierOrder[requiredTier]

  const hasCreditAccess = requiredCredits ? hasCredits(requiredCredits) : true

  const isBlocked = !hasTierAccess || !hasCreditAccess

  if (!isBlocked) {
    return <>{children}</>
  }

  const getUpgradeTarget = () => {
    if (currentTier === 'free') return 'pro'
    if (currentTier === 'pro') return 'pro_plus'
    return 'pro_plus'
  }

  const handleUpgrade = () => {
    setUpgradeModalOpen(true)
    onUpgrade?.()
  }

  return (
    <>
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Feature Locked</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {message ||
                  (requiredCredits
                    ? `You need ${requiredCredits} credits to use ${feature}.`
                    : `${feature} is available in ${requiredTier === 'pro' ? 'Pro' : requiredTier === 'pro_plus' ? 'Pro+' : 'Enterprise'} plan.`)}
              </p>
              <Button onClick={handleUpgrade} className="bg-[#D4AF37] hover:bg-[#D4AF37]/90">
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        targetTier={getUpgradeTarget()}
      />
    </>
  )
}

