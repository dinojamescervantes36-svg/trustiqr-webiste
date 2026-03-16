# TrustiQR – Setup & Deploy Guide

## Step 1 – Supabase Setup

1. Go to https://supabase.com → sign up → New Project → pick Singapore region
2. Go to **SQL Editor** → New Query → paste contents of `supabase-setup.sql` → Run
3. Go to **Authentication → Sign In / Providers → Email** → turn OFF "Confirm email" → Save
4. Go to **Project Settings → API** → copy your Project URL and anon key

## Step 2 – Add Environment Variables

Rename `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 3 – Run Locally

```
npm install
npm run dev
```

Open http://localhost:3000

## Step 4 – Deploy to Netlify

1. Push to GitHub:
```
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trustiqr.git
git push -u origin main
```

2. Go to netlify.com → Add new site → Import from GitHub → select repo
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables (same as .env.local)
6. Deploy

## Add Your Logo

Replace `public/img/logo.png` with your actual logo image.

## Fix Existing Accounts (if login fails)

Run this in Supabase SQL Editor:
```sql
update auth.users set email_confirmed_at = now() where email = 'your@email.com';
```
