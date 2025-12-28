import { Coins } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface CreditsDisplayProps {
  onClick?: () => void
  className?: string
}

export function CreditsDisplay({ onClick, className }: CreditsDisplayProps) {
  const { subscription, loading } = useSubscription()

  if (loading || !subscription) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md', className)}>
        <Coins className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  // Enterprise tier doesn't show credits
  if (subscription.plan_tier === 'enterprise') {
    return null
  }

  const balance = subscription.credit_balance || 0

  // Determine color based on balance
  const getColorClass = () => {
    if (balance > 100) return 'text-[#D4AF37]' // Gold
    if (balance >= 50) return 'text-orange-500' // Orange
    return 'text-red-500' // Red
  }

  const getTooltipText = () => {
    const resetDate = subscription.current_period_end
      ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
      : null

    let text = `${balance} credits. Chat: 5 credits. Study Plan: 10 credits.`
    
    if (subscription.plan_tier === 'pro' || subscription.plan_tier === 'pro_plus') {
      text += ` Resets: ${resetDate || 'N/A'}`
    }

    return text
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors',
            className
          )}
        >
          <Coins className={cn('w-4 h-4', getColorClass())} />
          <span className={cn('text-sm font-medium', getColorClass())}>
            {balance} credits
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="text-xs">{getTooltipText()}</p>
      </PopoverContent>
    </Popover>
  )
}

