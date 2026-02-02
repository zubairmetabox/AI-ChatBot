# Next.js Migration - Setup Instructions

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Cerebras API Key**: Get from [cerebras.ai](https://cerebras.ai)
3. **OpenAI API Key**: Get from [openai.com](https://openai.com) (for embeddings)

## Step 1: Set Up Supabase

### Create a New Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `zoho-ai-assistant`
   - Database Password: (save this securely)
   - Region: Choose closest to you
5. Click "Create new project"

### Run Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Open the file `supabase-schema.sql` in this project
3. Copy and paste the entire SQL script
4. Click "Run" to execute

### Create Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Name: `documents`
4. Public bucket: **Yes** (or configure RLS policies)
5. Click "Create bucket"

### Get API Keys
1. Go to **Settings** > **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Step 2: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# AI APIs
CEREBRAS_API_KEY=your_cerebras_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: Never commit `.env.local` to Git!

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Test the Application

1. **Upload a Document**:
   - Go to the "Documents" tab
   - Upload a PDF, TXT, or DOCX file
   - Wait for processing to complete

2. **Chat with AI**:
   - Go to the "Chat" tab
   - Ask questions about your uploaded documents
   - Verify RAG retrieval and source citations work

3. **Test Guardrails**:
   - Ask about competitors (e.g., "What is Odoo?")
   - Verify the AI redirects to Zoho

## Step 6: Deploy to Vercel

### Connect to Vercel
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js

### Configure Environment Variables
In Vercel project settings, add all environment variables from `.env.local`:
- `CEREBRAS_API_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Visit your production URL

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure all Supabase variables are set in `.env.local`
- Restart the dev server after adding variables

### "Error generating embedding"
- Check your OpenAI API key is valid
- Ensure you have credits in your OpenAI account

### "Could not extract text from document"
- Verify file is a valid PDF, TXT, or DOCX
- Check file size is under 10MB

### "Similarity search not working"
- Verify `supabase-schema.sql` was run successfully
- Check pgvector extension is enabled
- Ensure RPC function `match_documents` exists

## Next Steps

- Add authentication (Supabase Auth)
- Implement rate limiting
- Add more document types
- Enhance UI/UX
- Add analytics

## Support

For issues, check:
- Supabase Dashboard > Logs
- Browser Console (F12)
- Vercel Deployment Logs
