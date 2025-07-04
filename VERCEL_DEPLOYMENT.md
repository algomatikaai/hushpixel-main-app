# HushPixel Vercel Deployment Guide

## Quick Deploy to app.hushpixel.com

**Your Vercel Account**: hushpixeldotcom@gmail.com  
**Namespace**: vercel.com/hushpixeldotcom-5594

### Option 1: Drag & Drop Upload (FASTEST)

1. **Zip the project**:
   ```bash
   cd apps/web
   zip -r hushpixel-app.zip . -x "node_modules/*" ".next/*" ".env.local"
   ```

2. **Go to Vercel Dashboard**: https://vercel.com/dashboard
3. **Click "New Project"** → **Import** → **Upload zip file**
4. **Set Framework**: Next.js
5. **Set Build Command**: `pnpm build`
6. **Set Root Directory**: Keep default

### Option 2: Git Upload (Alternative)

Since GitHub blocks our pushes, use GitLab:
1. Create new GitLab repo: https://gitlab.com/projects/new
2. Push code to GitLab 
3. Import GitLab repo to Vercel

## Environment Variables for Vercel

In Vercel Dashboard → Project Settings → Environment Variables, add:

### REQUIRED (From your existing Supabase):
```
NEXT_PUBLIC_SUPABASE_URL=https://serasizemsbamdcblwkt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcmFzaXplbXNiYW1rY2Jsd2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NTQ0NDQsImV4cCI6MjA2NzEzMDQ0NH0.uVPB0JhWikC7grFwx8NxtAxVn6_jvQkEKZJYIxiiggQ
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]
```

### PUBLIC (Already in .env.production):
```
NEXT_PUBLIC_SITE_URL=https://app.hushpixel.com
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=24219411987653826
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=true
```

### BILLING (Mock for now):
```
NEXT_PUBLIC_BILLING_PROVIDER=stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_SECRET_KEY=sk_test_mock
```

### AI API (Mock for now):
```
MODELSLAB_API_KEY=mock_key_for_development
```

## Domain Setup

1. **In Vercel Dashboard** → **Domains**
2. **Add Domain**: `app.hushpixel.com`
3. **DNS Setup**: Point CNAME to your Vercel app URL

## Expected Result

✅ **Live URL**: https://app.hushpixel.com  
✅ **Quiz Integration**: Bridge from start.hushpixel.com works  
✅ **Mock Generation**: Returns "coming soon" placeholder  
✅ **Facebook Pixel**: Tracks all events  
✅ **Revenue Flow**: Email capture → Paywall immediately

## Troubleshooting

If build fails:
1. Check build logs in Vercel dashboard
2. Ensure `pnpm` is selected as package manager
3. Build command should be: `pnpm build`
4. Install command should be: `pnpm install`

## Post-Deployment

1. Test the bridge URL: `https://app.hushpixel.com/auth/bridge?token=test`
2. Test Facebook Pixel events in Meta Events Manager
3. Verify quiz → app flow works end-to-end

---

**Ready to deploy!** 🚀 The app is built for immediate revenue generation.