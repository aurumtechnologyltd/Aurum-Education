# Quick Setup Instructions

## ✅ Completed

1. ✅ GitHub repository created: `aurumtechnologyltd/Aurum-Education`
2. ✅ Git repository initialized
3. ✅ All code committed locally
4. ✅ README.md created
5. ✅ render.yaml created for Render deployment
6. ✅ DEPLOYMENT.md created with detailed instructions

## ⏳ Next Steps (Manual)

### 1. Push Code to GitHub

You need to authenticate and push. Choose one method:

**Method 1: GitHub CLI (Easiest)**
```bash
cd "/Users/marcymoo/Downloads/Aurum Education"
gh auth login
git push -u origin main
```

**Method 2: Personal Access Token**
1. Go to https://github.com/settings/tokens
2. Generate new token (classic) with `repo` scope
3. Run:
```bash
cd "/Users/marcymoo/Downloads/Aurum Education"
git push -u origin main
# When prompted:
# Username: aurumtechnologyltd
# Password: [paste your token]
```

**Method 3: SSH**
1. Set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
2. Run:
```bash
cd "/Users/marcymoo/Downloads/Aurum Education"
git remote set-url origin git@github.com:aurumtechnologyltd/Aurum-Education.git
git push -u origin main
```

### 2. Deploy to Render

Once code is pushed to GitHub:

**Option A: Using Render Dashboard**
1. Go to https://dashboard.render.com
2. Click "New +" > "Static Site"
3. Connect GitHub repository: `aurumtechnologyltd/Aurum-Education`
4. Configure:
   - Name: `aurum-education-frontend`
   - Branch: `main`
   - Build Command: `cd studyplanner && npm install && npm run build`
   - Publish Directory: `studyplanner/dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
6. Click "Create Static Site"

**Option B: Using Blueprint (render.yaml)**
1. Go to https://dashboard.render.com
2. Click "New +" > "Blueprint"
3. Connect GitHub repository: `aurumtechnologyltd/Aurum-Education`
4. Render will auto-detect `render.yaml` and create the service

### 3. Deploy Supabase Edge Functions

```bash
cd studyplanner
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
```

### 4. Configure Environment Variables

**Supabase Dashboard:**
- Project Settings > Edge Functions > Secrets
- Add:
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

**Render Dashboard:**
- Your Service > Environment
- Add:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_STRIPE_PUBLISHABLE_KEY`

### 5. Run Database Migrations

```bash
cd studyplanner
supabase db push
```

Or manually in Supabase SQL Editor:
- Run `supabase/migrations/20240101000000_subscriptions_credits_referrals.sql`
- Run `supabase/migrations/20240102000000_fix_credits_and_schema.sql`

## 📝 Important Notes

- **Backend**: Runs on Supabase (Edge Functions), NOT Render
- **Frontend**: Deploys to Render as a static site
- **Database**: Hosted on Supabase
- **Environment Variables**: Must be set in both Render (frontend) and Supabase (backend)

## 🔗 Repository

GitHub: https://github.com/aurumtechnologyltd/Aurum-Education

## 📚 Documentation

- See `README.md` for project overview
- See `DEPLOYMENT.md` for detailed deployment steps

