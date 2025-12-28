import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Settings, CreditCard, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NotificationBell } from './NotificationBell'
import { CreditsDisplay } from '@/components/features/CreditsDisplay'
import { UpgradeModal } from '@/components/features/UpgradeModal'
import { ReferralModal } from '@/components/features/ReferralModal'

export function Header() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { subscription } = useSubscription()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [referralModalOpen, setReferralModalOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U'

  const planTier = subscription?.plan_tier || 'free'
  const getPlanBadge = () => {
    switch (planTier) {
      case 'free':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Free</Badge>
      case 'pro':
        return <Badge className="bg-[#D4AF37] text-white">Pro</Badge>
      case 'pro_plus':
        return <Badge className="bg-purple-500 text-white">Pro+</Badge>
      case 'enterprise':
        return <Badge className="bg-blue-500 text-white">Enterprise</Badge>
      default:
        return null
    }
  }

  const getUpgradeButtonText = () => {
    if (planTier === 'free') return 'Upgrade to Pro'
    if (planTier === 'pro') return 'Upgrade to Pro+'
    return null
  }

  const showUpgradeButton = planTier !== 'pro_plus' && planTier !== 'enterprise'

  return (
    <>
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Spacer */}
          <div />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Credits Display */}
            <CreditsDisplay onClick={() => setReferralModalOpen(true)} />

            {/* Upgrade Button */}
            {showUpgradeButton && (
              <Button
                onClick={() => setUpgradeModalOpen(true)}
                size="sm"
                className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white"
              >
                {getUpgradeButtonText()}
              </Button>
            )}

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'User'}
                      </p>
                      {getPlanBadge()}
                    </div>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile-settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings/billing')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReferralModalOpen(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Referrals
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        targetTier={planTier === 'free' ? 'pro' : 'pro_plus'}
      />

      <ReferralModal
        open={referralModalOpen}
        onOpenChange={setReferralModalOpen}
      />
    </>
  )
}

