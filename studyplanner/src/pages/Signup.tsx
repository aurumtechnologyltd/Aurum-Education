import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Lock, User, GraduationCap, Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const TRINIDAD_TOBAGO_UNIVERSITIES = [
  'University of the West Indies (UWI)',
  'University of Trinidad and Tobago (UTT)',
  'College of Science, Technology and Applied Arts of Trinidad and Tobago (COSTAATT)',
  'University of the Southern Caribbean (USC)',
  'SBCS Global Learning Institute',
  'Arthur Lok Jack Global School of Business',
  'Caribbean Nazarene College',
  'School of Accounting and Management (SAM)',
  'Other'
]

const ALLOWED_EMAIL_DOMAINS = [
  'uwi.edu',
  'sta.uwi.edu',
  'utt.edu.tt',
  'costaatt.edu.tt',
  'usc.edu.tt',
  'sbcs.edu.tt',
  'lokjackgsb.edu.tt',
  'cnc.edu.tt',
  'sam.edu.tt',
]

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signUpWithEmail, signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [university, setUniversity] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => {
    // Pre-fill referral code from URL
    const refParam = searchParams.get('ref')
    if (refParam) {
      setReferralCode(refParam.toUpperCase())
      validateReferralCode(refParam)
    }
  }, [searchParams])

  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 8) {
      setReferralValid(null)
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('referral-validate', {
        body: { referral_code: code },
      })

      if (error) throw error
      setReferralValid(data?.valid || false)
    } catch (err) {
      console.error('Error validating referral code:', err)
      setReferralValid(false)
    }
  }

  const handleReferralCodeChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setReferralCode(upperValue)
    if (upperValue.length >= 8) {
      validateReferralCode(upperValue)
    } else {
      setReferralValid(null)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailDomain = email.split('@')[1]?.toLowerCase()
    if (!emailDomain) {
      setEmailError('Please enter a valid email address')
      return false
    }

    const isValidDomain = ALLOWED_EMAIL_DOMAINS.some(domain =>
      emailDomain === domain || emailDomain.endsWith(`.${domain}`)
    )

    if (!isValidDomain) {
      setEmailError('Please use your university email address. Personal email accounts are not allowed.')
      return false
    }

    setEmailError(null)
    return true
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    // University is now from state, not form data

    // Validate email domain
    if (!validateEmail(email)) {
      setLoading(false)
      return
    }

    // Validate referral code if provided (include email for self-referral check)
    let referrerId: string | null = null
    if (referralCode && referralCode.length >= 8) {
      try {
        const { data, error } = await supabase.functions.invoke('referral-validate', {
          body: { referral_code: referralCode, user_email: email },
        })

        if (error) throw error
        if (data?.valid) {
          referrerId = data.referrer_id
        } else {
          setError(data?.message || 'Invalid referral code')
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('Error validating referral code:', err)
        setError('Failed to validate referral code')
        setLoading(false)
        return
      }
    }

    const { error: signUpError } = await signUpWithEmail(email, password, fullName)
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Get the newly created user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Failed to create user')
      setLoading(false)
      return
    }

    // Update profile with university and referral code
    const profileUpdates: any = {
      university: university, // Always save university since it's required
    }
    if (referralCode && referrerId) {
      profileUpdates.referred_by = referralCode
    }

    await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)

    // Initialize subscription record - this is a fallback; database trigger should handle it
    // The trigger on profiles table will create subscription automatically
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_tier: 'free',
        status: 'active',
        credit_balance: 50, // Signup bonus
        credit_cap: 50,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id' })

    if (subError) {
      // Log but don't block signup - trigger should have created it
      console.warn('Subscription upsert fallback failed (trigger should handle):', subError.message)
    }


    // Process referral bonus if referral code was used
    if (referralCode && referrerId) {
      try {
        // Award referee bonus (100 credits) using RPC function
        await supabase.rpc('award_credits_internal', {
          p_user_id: user.id,
          p_amount: 100,
          p_type: 'referral_bonus',
          p_description: `Referral bonus from ${referralCode}`,
          p_respect_cap: false, // Allow bonus to exceed normal cap temporarily
        })

        // Create referral record (referrer reward triggered on first syllabus upload)
        await supabase.from('referrals').insert({
          referrer_id: referrerId,
          referee_id: user.id,
          referral_code: referralCode,
          status: 'pending',
        })

        toast.success('Referral bonus applied! You received 100 credits.')
      } catch (err) {
        console.error('Error processing referral:', err)
      }
    }

    navigate('/setup')
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await signInWithGoogle()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent dark:from-emerald-900/20" />

      <Card className="w-full max-w-md relative z-10 shadow-xl border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="text-center space-y-4">
          <img src="/logo.png" alt="Aurum Education" className="mx-auto w-20 h-20 object-contain" />
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">Create Account</CardTitle>
            <CardDescription className="mt-2">
              Start organizing your semester today
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@university.edu"
                  className="pl-10"
                  required
                  onBlur={(e) => {
                    if (e.target.value) {
                      validateEmail(e.target.value)
                    }
                  }}
                  onChange={() => {
                    if (emailError) {
                      setEmailError(null)
                    }
                  }}
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-600">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select value={university} onValueChange={setUniversity} required>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select your university" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRINIDAD_TOBAGO_UNIVERSITIES.map((uni) => (
                      <SelectItem key={uni} value={uni}>
                        {uni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Referral Code (Optional)
              </Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="ABC12345"
                value={referralCode}
                onChange={(e) => handleReferralCodeChange(e.target.value)}
                maxLength={8}
                className="font-mono uppercase"
              />
              {referralCode.length >= 8 && referralValid !== null && (
                <p className={`text-xs ${referralValid ? 'text-green-600' : 'text-red-600'}`}>
                  {referralValid ? '✓ Valid referral code - You\'ll get 100 bonus credits!' : '✗ Invalid referral code'}
                </p>
              )}
              {referralCode && referralValid && (
                <p className="text-xs text-muted-foreground">
                  You and your referrer will both get 100 credits when you upload your first syllabus!
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading || !university}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

