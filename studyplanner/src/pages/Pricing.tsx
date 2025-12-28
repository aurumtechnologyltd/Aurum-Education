import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { UpgradeModal } from '@/components/features/UpgradeModal'

interface PlanFeatures {
  semesters: string
  courses: string
  resources: string
  syllabus: string
  credits: string
  chat: boolean
  studyPlan: string
  calendar: boolean
  export: boolean
  priority: boolean
  aiTutor: boolean
  learningPaths: boolean
  analytics: boolean
  support: string
  sso?: boolean
  admin?: boolean
  branding?: boolean
  accountManager?: boolean
}

interface Plan {
  name: string
  subtitle: string
  price: { monthly: number | null; yearly: number | null }
  featured?: boolean
  comingSoon?: boolean
  features: PlanFeatures
}

const PLANS: Record<string, Plan> = {
  free: {
    name: 'Free',
    subtitle: 'Auditor',
    price: { monthly: 0, yearly: 0 },
    features: {
      semesters: '1 semester max',
      courses: '5 courses per semester',
      resources: '3 resources per course',
      syllabus: '1 syllabus per course',
      credits: '50 credits (one-time)',
      chat: true,
      studyPlan: 'Basic study plans',
      calendar: true,
      export: false,
      priority: false,
      aiTutor: false,
      learningPaths: false,
      analytics: false,
      support: 'Basic email support',
    },
  },
  pro: {
    name: 'Pro',
    subtitle: 'Scholar',
    price: { monthly: 5, yearly: 50 },
    featured: true,
    features: {
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
      aiTutor: false,
      learningPaths: false,
      analytics: false,
      support: 'Priority email support (48hr)',
    },
  },
  pro_plus: {
    name: 'Pro+',
    subtitle: "Dean's List",
    price: { monthly: 15, yearly: 150 },
    comingSoon: true,
    features: {
      semesters: 'Unlimited semesters',
      courses: 'Unlimited courses',
      resources: '10 resources per course',
      syllabus: '1 syllabus per course',
      credits: '2000 credits/month (rollover up to 4000)',
      chat: true,
      studyPlan: 'Advanced study plans + AI optimization',
      calendar: true,
      export: true,
      priority: true,
      aiTutor: true,
      learningPaths: true,
      analytics: true,
      support: 'Priority email support (24hr)',
    },
  },
  enterprise: {
    name: 'Enterprise',
    subtitle: 'University/Institution',
    price: { monthly: null, yearly: null },
    comingSoon: true,
    features: {
      semesters: 'Unlimited',
      courses: 'Unlimited',
      resources: 'Unlimited',
      syllabus: 'Unlimited',
      credits: 'Unlimited',
      chat: true,
      studyPlan: 'Advanced study plans + AI optimization',
      calendar: true,
      export: true,
      priority: true,
      aiTutor: true,
      learningPaths: true,
      analytics: true,
      sso: true,
      admin: true,
      branding: true,
      accountManager: true,
      support: 'Dedicated account manager',
    },
  },
}

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [targetTier, setTargetTier] = useState<'pro' | 'pro_plus'>('pro')

  const handleUpgrade = (tier: 'pro' | 'pro_plus') => {
    setTargetTier(tier)
    setUpgradeModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
              <span className="font-bold text-xl">Aurum Education</span>
            </Link>
            <div className="flex gap-4">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Start free. Upgrade anytime. No credit card required.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors relative ${
              billingInterval === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Yearly
            <Badge className="ml-2 bg-[#D4AF37] text-white">Save 2 months</Badge>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isFeatured = plan.featured
            const price = plan.price[billingInterval]
            const isEnterprise = key === 'enterprise'
            const isComingSoon = plan.comingSoon

            return (
              <Card
                key={key}
                className={`relative ${isFeatured ? 'border-2 border-[#D4AF37] shadow-lg' : ''} ${isComingSoon ? 'opacity-60' : ''}`}
              >
                {isFeatured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-white">
                    Most Popular
                  </Badge>
                )}
                {isComingSoon && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white">
                    Coming Soon
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.subtitle}</CardDescription>
                  <div className="mt-4">
                    {isEnterprise ? (
                      <div className="text-2xl font-bold">Custom Pricing</div>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-muted-foreground">
                          /{billingInterval === 'monthly' ? 'month' : 'year'}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{plan.features.semesters}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{plan.features.courses}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{plan.features.resources}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{plan.features.credits}</span>
                    </div>
                    {plan.features.aiTutor && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>AI Tutor</span>
                      </div>
                    )}
                    {plan.features.learningPaths && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Learning Paths</span>
                      </div>
                    )}
                    {plan.features.analytics && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Advanced Analytics</span>
                      </div>
                    )}
                    {plan.features.export && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Export Plans (PDF, CSV)</span>
                      </div>
                    )}
                    {plan.features.sso && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>SSO Integration</span>
                      </div>
                    )}
                    {plan.features.admin && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Admin Dashboard</span>
                      </div>
                    )}
                  </div>

                  {isComingSoon ? (
                    <Button className="w-full" variant="outline" disabled>
                      Coming Soon
                    </Button>
                  ) : isEnterprise ? (
                    <Button className="w-full" variant="outline" disabled>
                      Contact Sales
                    </Button>
                  ) : key === 'free' ? (
                    <Link to="/signup" className="block">
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90"
                      onClick={() => handleUpgrade(key as 'pro' | 'pro_plus')}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="cancel">
              <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
              <AccordionContent>
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment">
              <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
              <AccordionContent>
                We accept all major credit cards, debit cards, and PayPal through Stripe.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="refund">
              <AccordionTrigger>Do you offer refunds?</AccordionTrigger>
              <AccordionContent>
                Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="downgrade">
              <AccordionTrigger>What happens if I downgrade?</AccordionTrigger>
              <AccordionContent>
                When you downgrade, you'll keep your existing credits until they're used up. You'll lose access to premium features immediately.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="credits">
              <AccordionTrigger>How do credits work?</AccordionTrigger>
              <AccordionContent>
                Credits are used for AI features: 5 credits per chat question, 10 credits per study plan generation. Credits reset monthly for Pro and Pro+ plans.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="rollover">
              <AccordionTrigger>Do credits roll over?</AccordionTrigger>
              <AccordionContent>
                Yes! Pro plans can roll over up to 1000 credits, Pro+ up to 4000 credits. Any credits above the cap expire at the end of the month.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="expire">
              <AccordionTrigger>Do credits expire?</AccordionTrigger>
              <AccordionContent>
                Free tier credits don't expire. For Pro and Pro+, unused credits above the rollover cap expire monthly. Credits within the cap never expire.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="buy">
              <AccordionTrigger>Can I buy extra credits?</AccordionTrigger>
              <AccordionContent>
                Currently, credits are only allocated through your subscription plan. We're working on a credit purchase option for the future.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        targetTier={targetTier}
      />
    </div>
  )
}

