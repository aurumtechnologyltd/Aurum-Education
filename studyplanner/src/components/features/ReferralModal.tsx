import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Copy, Check, Share2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReferralModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const [referralCode, setReferralCode] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    creditsEarned: 0,
  })

  useEffect(() => {
    if (open) {
      fetchReferralCode()
      fetchStats()
    }
  }, [open])

  const fetchReferralCode = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase.functions.invoke('referral-generate', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) throw error

      if (data?.referral_code) {
        setReferralCode(data.referral_code)
      }
    } catch (error) {
      console.error('Error fetching referral code:', error)
      toast.error('Failed to load referral code')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use raw query since referrals table isn't in generated types yet
      const { data: referrals, error } = await supabase
        .from('referrals' as any)
        .select('status')
        .eq('referrer_id', user.id) as { data: { status: string }[] | null, error: any }

      if (error) {
        console.error('Error fetching referrals:', error)
        return
      }

      if (referrals) {
        const total = referrals.length
        const pending = referrals.filter(r => r.status === 'pending').length
        const completed = referrals.filter(r => r.status === 'completed').length
        const creditsEarned = completed * 100 // 100 credits per completed referral

        setStats({
          totalReferrals: total,
          pendingReferrals: pending,
          creditsEarned,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const copyToClipboard = () => {
    const url = `${window.location.origin}/signup?ref=${referralCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareVia = (platform: string) => {
    const url = `${window.location.origin}/signup?ref=${referralCode}`
    const text = `Join me on Aurum Education and we'll both get 100 credits! Use my referral code: ${referralCode}`

    let shareUrl = ''
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent('Join Aurum Education')}&body=${encodeURIComponent(text + '\n\n' + url)}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
  }

  const referralUrl = referralCode ? `${window.location.origin}/signup?ref=${referralCode}` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Earn 100 Free Credits</DialogTitle>
          <DialogDescription>
            Refer a friend, you both win!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Visual */}
          <div className="relative h-32 bg-gradient-to-r from-emerald-500 to-[#D4AF37] rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <Share2 className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">Share & Earn</p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Referral Code</label>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="font-mono text-lg text-center"
                disabled={loading}
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="icon"
                disabled={loading || !referralCode}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {referralUrl && (
              <p className="text-xs text-muted-foreground break-all">
                {referralUrl}
              </p>
            )}
          </div>

          {/* How It Works */}
          <div className="space-y-3">
            <h3 className="font-semibold">How It Works</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">1</span>
                </div>
                <p className="text-sm">Share your code</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">2</span>
                </div>
                <p className="text-sm">Friend signs up</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">3</span>
                </div>
                <p className="text-sm">Both get credits</p>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Via</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => shareVia('whatsapp')}
                disabled={loading || !referralCode}
                className="w-full"
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => shareVia('facebook')}
                disabled={loading || !referralCode}
                className="w-full"
              >
                Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => shareVia('twitter')}
                disabled={loading || !referralCode}
                className="w-full"
              >
                Twitter
              </Button>
              <Button
                variant="outline"
                onClick={() => shareVia('email')}
                disabled={loading || !referralCode}
                className="w-full"
              >
                Email
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.creditsEarned}</p>
              <p className="text-xs text-muted-foreground">Credits Earned</p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading referral code...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

