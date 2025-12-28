// Stripe Product and Price IDs
// These are test mode IDs - replace with live mode IDs for production

export const STRIPE_CONFIG = {
  products: {
    pro: 'prod_TgafyLBIpOFo6S',
    pro_plus: 'prod_TgaflC7eIWffui',
  },
  prices: {
    pro_monthly: 'price_1SjDUfPNc8v71d3pUfudpxzb',
    pro_yearly: 'price_1SjDUgPNc8v71d3pdgX0N84c',
    pro_plus_monthly: 'price_1SjDUhPNc8v71d3pw787LCqk',
    pro_plus_yearly: 'price_1SjDUiPNc8v71d3pSHF9ruYR',
  },
} as const

export const PLAN_TIERS = {
  free: {
    name: 'Free (Auditor)',
    description: 'Basic access to Aurum Education',
    price_monthly: 0,
    price_yearly: 0,
    features: {
      max_semesters: 1,
      max_courses_per_semester: 5,
      max_resources_per_course: 3,
      initial_credits: 50,
      credit_cap: 50,
      chat_cost: 5,
      study_plan_cost: 10,
      advanced_study_plans: false,
      ai_tutor: false,
      learning_paths: false,
      advanced_analytics: false,
      export_plans: false,
      priority_processing: false,
      google_calendar_sync: true,
    },
  },
  pro: {
    name: 'Pro (Scholar)',
    description: 'Enhanced academic planning features',
    price_monthly: 5,
    price_yearly: 50,
    stripe_price_monthly: STRIPE_CONFIG.prices.pro_monthly,
    stripe_price_yearly: STRIPE_CONFIG.prices.pro_yearly,
    features: {
      max_semesters: null, // unlimited
      max_courses_per_semester: null, // unlimited
      max_resources_per_course: 10,
      monthly_credits: 500,
      credit_cap: 1000,
      chat_cost: 5,
      study_plan_cost: 10,
      advanced_study_plans: true,
      ai_tutor: false,
      learning_paths: false,
      advanced_analytics: false,
      export_plans: true,
      priority_processing: true,
      google_calendar_sync: true,
    },
  },
  pro_plus: {
    name: 'Pro+ (Dean\'s List)',
    description: 'All advanced AI-powered features',
    price_monthly: 15,
    price_yearly: 150,
    stripe_price_monthly: STRIPE_CONFIG.prices.pro_plus_monthly,
    stripe_price_yearly: STRIPE_CONFIG.prices.pro_plus_yearly,
    features: {
      max_semesters: null, // unlimited
      max_courses_per_semester: null, // unlimited
      max_resources_per_course: 10,
      monthly_credits: 2000,
      credit_cap: 4000,
      chat_cost: 5,
      study_plan_cost: 10,
      advanced_study_plans: true,
      ai_tutor: true,
      learning_paths: true,
      advanced_analytics: true,
      export_plans: true,
      priority_processing: true,
      google_calendar_sync: true,
    },
  },
  enterprise: {
    name: 'Enterprise (University)',
    description: 'Custom solutions for institutions',
    price_monthly: null, // custom
    price_yearly: null, // custom
    features: {
      max_semesters: null, // unlimited
      max_courses_per_semester: null, // unlimited
      max_resources_per_course: null, // unlimited
      monthly_credits: null, // unlimited
      credit_cap: null, // unlimited
      chat_cost: 0,
      study_plan_cost: 0,
      advanced_study_plans: true,
      ai_tutor: true,
      learning_paths: true,
      advanced_analytics: true,
      export_plans: true,
      priority_processing: true,
      google_calendar_sync: true,
      sso: true,
      admin_dashboard: true,
      bulk_user_management: true,
      custom_branding: true,
      dedicated_support: true,
    },
  },
} as const

export type PlanTier = keyof typeof PLAN_TIERS

