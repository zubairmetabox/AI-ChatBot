# Supabase Setup - Final Steps

## ✅ Completed
- [x] Database schema created (tables, indexes, RPC function)
- [x] `.env.local` file created with Supabase URL and anon key

## 📋 Remaining Steps

### 1. Get Service Role Key
1. Go to: https://supabase.com/dashboard/project/qkagsmttupzvrwqpwjxc/settings/api
2. Scroll down to "Project API keys"
3. Copy the **`service_role`** key (starts with `eyJ...`)
4. Paste it in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: Keep this key secret! Never commit it to Git.

### 2. Create Storage Bucket
1. Go to: https://supabase.com/dashboard/project/qkagsmttupzvrwqpwjxc/storage/buckets
2. Click **"New bucket"**
3. Settings:
   - **Name**: `documents`
   - **Public bucket**: ✅ Yes (check this box)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: Leave empty (allow all)
4. Click **"Create bucket"**

### 3. Add Your AI API Keys
Edit `.env.local` and add:
- **CEREBRAS_API_KEY**: Get from https://cerebras.ai
- **OPENAI_API_KEY**: Get from https://openai.com/api

### 4. Verify Setup
Run this command to check all environment variables are set:
```bash
Get-Content .env.local
```

Make sure all values are filled in (no `your_*_here` placeholders).

### 5. Test Locally
```bash
npm run dev
```

Open http://localhost:3000 and test:
1. Upload a document (Documents tab)
2. Ask a question about it (Chat tab)
3. Verify RAG retrieval works

---

## Quick Reference

**Project URL**: https://qkagsmttupzvrwqpwjxc.supabase.co
**Project Ref**: qkagsmttupzvrwqpwjxc
**Dashboard**: https://supabase.com/dashboard/project/qkagsmttupzvrwqpwjxc

---

## Troubleshooting

**"Missing Supabase environment variables"**
- Check all keys in `.env.local` are filled in
- Restart dev server: `Ctrl+C` then `npm run dev`

**"Storage bucket not found"**
- Verify bucket name is exactly `documents`
- Check it's marked as public

**"Error generating embedding"**
- Verify OpenAI API key is valid
- Check you have credits in your OpenAI account
