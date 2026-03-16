# Setup Guide for StaatWright Contact Form

This guide will walk you through setting up the contact form with email and database storage.

## Step 1: Set Up Supabase (Database)

1. **Create a Supabase account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for free (no credit card required)
   - Create a new project

2. **Get your Supabase credentials**
   
   **Step 2a: Open Settings**
   - In your Supabase dashboard, look at the left sidebar
   - Click on the **Settings** icon (looks like a gear ⚙️)
   - A menu will appear - click on **API** (it's usually near the top of the settings menu)
   
   **Step 2b: Find your Project URL**
   - On the API settings page, you'll see a section called **"Project URL"**
   - You'll see a URL that looks like: `https://abcdefghijklmnop.supabase.co`
   - Click the copy button next to it (looks like two overlapping squares 📋) or select and copy the entire URL
   - **Save this somewhere** - you'll need it for your `.env.local` file
   
   **Step 2c: Find your anon/public key**
   - On the same API settings page, scroll down to find **"Project API keys"** section
   - You'll see several keys listed. Look for the one labeled **"anon"** or **"anon public"**
   - The key will be a long string starting with `eyJ` (it's a JWT token)
   - Click the **eye icon** 👁️ to reveal the key (if it's hidden)
   - Click the copy button next to it to copy the entire key
   - **Save this somewhere** - you'll need it for your `.env.local` file
   
   **What you should have now:**
   - ✅ Project URL (something like `https://xxxxx.supabase.co`)
   - ✅ anon public key (a long string starting with `eyJ...`)

3. **Create the database table**
   - In Supabase dashboard, go to **SQL Editor**
   - Click **New Query**
   - Copy and paste the contents of `supabase-schema.sql`
   - Click **Run** (or press Ctrl+Enter)
   - You should see "Success. No rows returned"

## Step 2: Set Up Resend (Email)

1. **Create a Resend account**
   - Go to [resend.com](https://resend.com)
   - Sign up for free
   - Verify your email

2. **Get your API key**
   - In Resend dashboard, go to **API Keys**
   - Click **Create API Key**
   - Give it a name (e.g., "StaatWright Contact Form")
   - Copy the key (starts with `re_`)
   - ⚠️ **Important:** Copy it now - you won't see it again!

3. **Optional: Verify your domain** (for production)
   - Go to **Domains** in Resend
   - Add your domain
   - Follow the DNS setup instructions
   - Once verified, you can use `contact@yourdomain.com` as the sender

## Step 3: Create Environment File

1. **Create `.env.local` file** in the project root (same folder as `package.json`)

2. **Add these variables:**

```env
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Resend Email Service
RESEND_API_KEY=re_your_api_key_here

# Contact Email (where submissions will be sent)
CONTACT_EMAIL=your-email@example.com

# Optional: Resend From Email (use your verified domain for production)
# RESEND_FROM_EMAIL=contact@yourdomain.com
```

3. **Replace the placeholder values:**
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `RESEND_API_KEY`: Your Resend API key
   - `CONTACT_EMAIL`: Your email address (where you want to receive submissions)

## Step 4: Test It

1. **Restart your dev server** (if it's running):
   ```bash
   # Stop the server (Ctrl+C) then:
   npm run dev
   ```

2. **Test the form:**
   - Go to `http://localhost:3000/contact`
   - Fill out and submit the form
   - Check your email inbox
   - Check Supabase dashboard → **Table Editor** → `contact_submissions` to see the saved submission

## Step 5: View Submissions (Optional Admin Page)

I've created an admin page at `/admin/submissions` to view all submissions. 

**Note:** For security, you should add authentication to this page in production. For now, it's accessible to anyone who knows the URL.

## Troubleshooting

### Email not sending?
- Check that `RESEND_API_KEY` is correct in `.env.local`
- Make sure you've restarted the dev server after adding env variables
- Check the browser console and server logs for errors

### Database not saving?
- Verify your Supabase URL and anon key are correct
- Make sure you ran the SQL schema in Supabase SQL Editor
- Check Supabase dashboard → **Table Editor** to see if table exists

### Form shows error?
- Check browser console for specific error messages
- Make sure all environment variables are set
- Verify the API route is working: check `http://localhost:3000/api/contact` (should show method not allowed, not 404)

## Production Deployment

When deploying to Vercel (or another platform):

1. **Add environment variables** in your hosting platform's dashboard
2. **Use the same variables** from `.env.local`
3. **For Resend:** Use your verified domain email in `RESEND_FROM_EMAIL`
4. **For Supabase:** The same credentials work for production

---

**Need help?** Check the error messages in:
- Browser console (F12 → Console)
- Terminal/Server logs
- Supabase dashboard → Logs
- Resend dashboard → Logs

