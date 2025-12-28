import { useState, useEffect } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CreditCard, Copy, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ReferralModal } from '@/components/features/ReferralModal'

export default function BillingSettings() {
  const { subscription } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [referralModalOpen, setReferralModalOpen] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({
    total: 0,
    pending: 0,
    creditsEarned: 0,
  })

  useEffect(() => {
    fetchReferralCode()
    fetchTransactions()
    fetchReferralStats()
  }, [])

  const fetchReferralCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code)
      } else {
        // Generate if doesn't exist
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data } = await supabase.functions.invoke('referral-generate', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })
          if (data?.referral_code) {
            setReferralCode(data.referral_code)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching referral code:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchReferralStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)

      if (referrals) {
        const total = referrals.length
        const pending = referrals.filter(r => r.status === 'pending').length
        const completed = referrals.filter(r => r.status === 'completed').length
        const creditsEarned = completed * 100

        setReferralStats({ total, pending, creditsEarned })
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please sign in')
        return
      }

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      toast.error('Failed to open customer portal')
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = () => {
    const url = `${window.location.origin}/signup?ref=${referralCode}`
    navigator.clipboard.writeText(url)
    toast.success('Referral link copied!')
  }

  const getPlanBadge = () => {
    const tier = subscription?.plan_tier || 'free'
    switch (tier) {
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

  if (!subscription) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, credits, and referrals
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {subscription.plan_tier === 'free'
                  ? 'Free tier with limited features'
                  : `Active ${subscription.plan_tier} subscription`}
              </CardDescription>
            </div>
            {getPlanBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription.plan_tier === 'free' ? (
            <Button onClick={() => window.location.href = '/pricing'}>
              Upgrade to Pro
            </Button>
          ) : (
            <>
              {subscription.current_period_end && (
                <div>
                  <p className="text-sm text-muted-foreground">Renews on</p>
                  <p className="font-semibold">
                    {format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
              <Button onClick={handleManageSubscription} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Credits Section */}
      {subscription.plan_tier !== 'enterprise' && (
        <Card>
          <CardHeader>
            <CardTitle>Credits</CardTitle>
            <CardDescription>
              {subscription.plan_tier === 'free'
                ? 'One-time signup bonus'
                : 'Monthly allocation with rollover'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-4xl font-bold mb-2">
                {subscription.credit_balance || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                / {subscription.credit_cap || 50} credits
              </div>
            </div>

            <div className="text-sm space-y-1">
              <p>• Chat: 5 credits per question</p>
              <p>• Study Plan: 10 credits per generation</p>
              {subscription.plan_tier !== 'free' && subscription.current_period_end && (
                <p>
                  • Resets to {subscription.credit_cap === 1000 ? '500' : '2000'} on{' '}
                  {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            {/* Transactions */}
            <div>
              <h3 className="font-semibold mb-3">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {format(new Date(tx.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.type}</Badge>
                        </TableCell>
                        <TableCell className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>Earn credits by referring friends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Referral Code</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={referralCode}
                className="flex-1 px-3 py-2 border rounded-md font-mono bg-muted"
              />
              <Button variant="outline" onClick={copyReferralLink}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={() => setReferralModalOpen(true)}>
                View Details
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share: {window.location.origin}/signup?ref={referralCode}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{referralStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{referralStats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{referralStats.creditsEarned}</div>
              <div className="text-xs text-muted-foreground">Credits Earned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription */}
      {subscription.plan_tier !== 'free' && subscription.plan_tier !== 'enterprise' && (
        <Card>
          <Accordion type="single" collapsible>
            <AccordionItem value="cancel">
              <AccordionTrigger className="text-destructive">
                Cancel Subscription
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Are you sure?</p>
                      <p className="text-sm text-muted-foreground">
                        Canceling will downgrade you to the Free tier at the end of your billing period. 
                        You'll lose access to premium features and your credits will be capped at 50.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleManageSubscription}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Cancel Subscription'
                    )}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}

      <ReferralModal
        open={referralModalOpen}
        onOpenChange={setReferralModalOpen}
      />
    </div>
  )
}

