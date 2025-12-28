# Aurum Education

AI-powered study planning platform with a 4-tier subscription system, optimized AI model routing, and comprehensive credit management.

## 🚀 Features

- **4-Tier Subscription System**: Free, Pro ($5/$50), Pro+ ($15/$150), Enterprise
- **Optimized AI Model Routing**: 
  - Free tier: GPT-5 Nano for chat/study plans
  - Pro/Pro+/Enterprise: Gemini 3 Flash for chat/study plans
  - All tiers: Claude Haiku 4.5 for syllabus extraction
- **Credit System**: Atomic transactions, rollover caps, enterprise bypass
- **Referral Program**: 8-character codes with deferred rewards
- **Stripe Integration**: Secure payment processing with webhook validation
- **RAG Chat**: Document-based Q&A with semantic search
- **Study Plan Generation**: AI-powered personalized study schedules

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account (for payments)
- OpenAI API key (for GPT-5 Nano and embeddings)
- Google AI API key (for Gemini 3 Flash)
- Anthropic API key (for Claude Haiku 4.5)

## 🛠️ Setup

### 1. Clone the Repository

```bash
git clone https://github.com/aurumtechnologyltd/Aurum-Education.git
cd Aurum-Education
```

### 2. Install Dependencies

```bash
cd studyplanner
npm install
```

### 3. Environment Variables

Create a `.env` file in the `studyplanner` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 4. Supabase Setup

1. Create a new Supabase project
2. Run migrations:
   ```bash
   supabase migration up
   ```
3. Set up Edge Functions environment variables in Supabase dashboard:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### 5. Deploy Edge Functions

```bash
supabase functions deploy
```

### 6. Stripe Configuration

1. Create products and prices in Stripe dashboard
2. Update `studyplanner/src/config/stripe.ts` with your price IDs
3. Configure webhook endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Add webhook secret to Supabase environment variables

## 🚢 Deployment

### Frontend (Render)

The frontend is configured to deploy as a static site on Render. See `render.yaml` for configuration.

### Backend (Supabase)

Edge Functions are deployed via Supabase CLI. The backend runs on Supabase's infrastructure.

## 📁 Project Structure

```
Aurum-Education/
├── studyplanner/
│   ├── src/              # React frontend source
│   ├── supabase/
│   │   ├── functions/    # Edge Functions (backend)
│   │   └── migrations/   # Database migrations
│   └── public/           # Static assets
└── README.md
```

## 🔐 Security Features

- ✅ Stripe webhook signature verification
- ✅ Server-side credit validation
- ✅ Row Level Security (RLS) on all tables
- ✅ Rate limiting on AI endpoints
- ✅ Self-referral prevention
- ✅ Enterprise tier bypass optimization

## 📊 Database Schema

Key tables:
- `subscriptions` - User subscription tiers and credit balances
- `credit_transactions` - All credit movements
- `referrals` - Referral tracking
- `ai_usage_logs` - AI model usage and cost tracking
- `rate_limit_log` - Rate limiting tracking

## 🧪 Testing

```bash
npm run lint
npm run build
```

## 📝 License

Copyright © 2025 Aurum Technology Limited

## 🤝 Contributing

This is a private project. For access, contact the repository owner.

