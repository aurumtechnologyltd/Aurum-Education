# Deployment Guide

## Step 1: Push to GitHub

Since authentication is required, push the code manually:

### Option A: Using GitHub CLI (Recommended)

```bash
cd "/Users/marcymoo/Downloads/Aurum Education"
gh auth login
git push -u origin main
```

### Option B: Using Personal Access Token

1. Create a Personal Access Token in GitHub Settings > Developer settings > Personal access tokens
2. Use it as password when pushing:
```bash
git push -u origin main
# Username: aurumtechnologyltd
# Password: [your personal access token]
```

### Option C: Using SSH

1. Set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
2. Then push:
```bash
git remote set-url origin git@github.com:aurumtechnologyltd/Aurum-Education.git
git push -u origin main
```

## Step 2: Deploy Frontend to Render

1. Go to https://dashboard.render.com
2. Click "New +" > "Static Site"
3. Connect your GitHub repository: `aurumtechnologyltd/Aurum-Education`
4. Configure:
   - **Name**: `aurum-education-frontend`
   - **Branch**: `main`
   - **Build Command**: `cd studyplanner && npm install && npm run build`
   - **Publish Directory**: `studyplanner/dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
6. Click "Create Static Site"

Alternatively, use Render's Blueprint (render.yaml):
- Go to Dashboard > New > Blueprint
- Connect the repository
- Render will automatically detect `render.yaml` and create the service

## Step 3: Deploy Backend (Supabase Edge Functions)

The backend runs on Supabase, not Render. Deploy Edge Functions:

```bash
cd studyplanner
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy
```

Set environment variables in Supabase Dashboard:
- Go to Project Settings > Edge Functions > Secrets
- Add:
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

## Step 4: Configure Stripe Webhook

1. In Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret
5. Add it to Supabase Edge Functions secrets as `STRIPE_WEBHOOK_SECRET`

## Step 5: Run Database Migrations

```bash
cd studyplanner
supabase db push
```

Or run migrations manually in Supabase SQL Editor:
1. Go to SQL Editor
2. Run `supabase/migrations/20240101000000_subscriptions_credits_referrals.sql`
3. Run `supabase/migrations/20240102000000_fix_credits_and_schema.sql`

## Step 6: Update Frontend Environment Variables

After Render deployment, update the frontend environment variables if needed:
- Render Dashboard > Your Service > Environment
- Update any values that changed

## Verification Checklist

- [ ] Code pushed to GitHub
- [ ] Frontend deployed on Render
- [ ] Edge Functions deployed on Supabase
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Stripe webhook configured
- [ ] Test signup flow
- [ ] Test subscription upgrade
- [ ] Test AI chat functionality

