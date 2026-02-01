# Vercel Deployment Guide - AI Chatbot (Next.js)

## 🚀 Deploy via Vercel UI (Recommended)

### Step 1: Go to Vercel Dashboard
Visit: https://vercel.com/dashboard

### Step 2: Import GitHub Repository

1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Find and select: `zubairmetabox/AI-ChatBot`
4. Click **"Import"**

### Step 3: Configure Project Settings

#### Important: Set Production Branch
In the "Configure Project" screen:

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./` (leave as default)
3. **Build Command**: `next build` (auto-detected)
4. **Output Directory**: `.next` (auto-detected)

#### ⚠️ **CRITICAL: Set Production Branch**
- Expand **"Git"** section
- Set **Production Branch** to: `master`
- This ensures the main branch deploys to production

### Step 4: Add Environment Variables

**Before clicking Deploy**, add these environment variables:

Click **"Environment Variables"** and add the following from your `.env.local` file:

| Name | Where to Get It |
|------|-----------------|
| `CEREBRAS_API_KEY` | Your Cerebras API key |
| `JINA_API_KEY` | Get free key at https://jina.ai/ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (Service Role) |

> **Important**: 
> - Copy values from your local `.env.local` file
> - Select **"Production"** environment for all variables
> - Never commit API keys to Git!

### Step 5: Deploy!

Click **"Deploy"** and wait for the build to complete (2-3 minutes)

### Step 6: Verify Deployment

Once deployed:
1. Click **"Visit"** to open your live site
2. Test document upload
3. Test RAG retrieval with a query
4. Check browser console for errors

---

## 🔄 Continuous Deployment (Auto-Deploy)

Once connected, Vercel automatically deploys:
- **Push to `master`** → Production deployment
- **Push to other branches** → Preview deployments

### Branch Structure
- **`master`**: Production (Next.js implementation)
- **`ai-chatbot-react`**: Backup (React implementation)
- **Other branches**: Preview deployments

### Managing Deployments
- **View Deployments**: Vercel Dashboard → Your Project → Deployments
- **Rollback**: Click "..." on any deployment → "Promote to Production"
- **Preview URLs**: Each branch gets its own preview URL

---

## 🔧 Troubleshooting

### Build Fails
1. Check **Deployments** → Click failed deployment → **"Building"** tab
2. Common issues:
   - Missing dependencies in `package.json`
   - TypeScript errors
   - Environment variables not set

### Environment Variables Not Working
1. Go to **Settings** → **Environment Variables**
2. Ensure all variables are set for **Production**
3. Click **"Redeploy"** after adding variables

### Supabase Connection Issues
- Verify Supabase project is active
- Check API keys are correct
- Ensure Supabase RLS policies allow access

### RAG Not Working
- Check Jina AI API key is valid
- Verify Supabase vector extension is enabled
- Check browser console for API errors

---

## 🌐 Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `chatbot.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (5-10 minutes)

---

## 📊 Monitoring

### View Logs
- **Vercel Dashboard** → Your Project → **Deployments** → Click deployment → **"Function Logs"**

### Analytics
- **Vercel Dashboard** → Your Project → **Analytics**
- Monitor page views, performance, and errors

---

## ✅ Post-Deployment Checklist

- [ ] Production branch set to `master`
- [ ] All environment variables added
- [ ] Deployment successful
- [ ] Document upload works
- [ ] RAG retrieval works
- [ ] No console errors
- [ ] Custom domain configured (optional)
