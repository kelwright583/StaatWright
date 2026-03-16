# GoDaddy DNS Setup for Resend Domain Verification

This guide will walk you through adding DNS records in GoDaddy to verify your `staatwright.com` domain in Resend.

---

## Step 1: Get DNS Records from Resend

1. **Go to Resend Dashboard**
   - Log in to [resend.com](https://resend.com)
   - Click **"Domains"** in the left sidebar
   - Click **"Add Domain"** button (top right)
   - Enter: `staatwright.com` (without www)
   - Click **"Add"**

2. **Copy the DNS Records**
   - Resend will show you a list of DNS records to add
   - **Keep this page open** - you'll need to copy these values
   - You'll see:
     - **SPF Record** (TXT record)
     - **DKIM Records** (usually 3 TXT records)
     - **DMARC Record** (optional TXT record)

---

## Step 2: Log into GoDaddy

1. Go to [godaddy.com](https://godaddy.com)
2. Click **"Sign In"** (top right)
3. Log in with your credentials

---

## Step 3: Navigate to DNS Management

1. **Go to My Products**
   - Click **"My Products"** in the top menu (or go to your account dashboard)
   - Find **"staatwright.com"** in your domain list
   - Click the **three dots (⋯)** next to your domain
   - Click **"DNS"** or **"Manage DNS"**

   **OR**

   - Look for a **"DNS"** button directly under your domain name
   - Click it

2. **You should now see your DNS records**
   - You'll see a table/list of existing DNS records
   - Records like A, CNAME, MX, TXT, etc.

---

## Step 4: Add SPF Record

**Important:** Check if you already have a TXT record for `@` (root domain). If you do, you may need to **edit** it instead of adding a new one.

### Option A: No existing SPF/TXT record for @

1. Click **"Add"** button (usually at the top of the records table)
2. Select **"TXT"** from the record type dropdown
3. Fill in:
   - **Name/Host:** `@` (or leave blank if GoDaddy shows it that way)
   - **Value:** Copy the SPF value from Resend (looks like: `v=spf1 include:resend.com ~all`)
   - **TTL:** `600` or `3600` (default is fine)
4. Click **"Save"**

### Option B: You already have a TXT record for @

1. Find the existing TXT record for `@`
2. Click **"Edit"** (pencil icon) next to it
3. **Append** Resend's SPF to your existing value:
   - If your current value is: `v=spf1 include:_spf.google.com ~all`
   - Change it to: `v=spf1 include:_spf.google.com include:resend.com ~all`
   - (Keep your existing includes, just add `include:resend.com`)
4. Click **"Save"**

---

## Step 5: Add DKIM Records (Usually 3 Records)

Resend will show you 3 DKIM records. Add each one separately:

### DKIM Record 1:

1. Click **"Add"** button
2. Select **"TXT"** from record type
3. Fill in:
   - **Name/Host:** Copy EXACTLY from Resend (might be something like `resend._domainkey` or `resend._domainkey.staatwright.com`)
   - **Value:** Copy the ENTIRE long value from Resend (it's a very long string)
   - **TTL:** `600` or `3600`
4. Click **"Save"**

### DKIM Record 2:

1. Click **"Add"** again
2. Select **"TXT"**
3. Fill in the second DKIM record from Resend:
   - **Name/Host:** Copy exactly from Resend
   - **Value:** Copy the entire value
   - **TTL:** `600` or `3600`
4. Click **"Save"**

### DKIM Record 3:

1. Click **"Add"** again
2. Select **"TXT"**
3. Fill in the third DKIM record from Resend:
   - **Name/Host:** Copy exactly from Resend
   - **Value:** Copy the entire value
   - **TTL:** `600` or `3600`
4. Click **"Save"**

---

## Step 6: Add DMARC Record (Optional but Recommended)

1. Click **"Add"** button
2. Select **"TXT"** from record type
3. Fill in:
   - **Name/Host:** `_dmarc`
   - **Value:** Copy from Resend (usually: `v=DMARC1; p=none;` or similar)
   - **TTL:** `600` or `3600`
4. Click **"Save"**

---

## Step 7: Verify in Resend

1. **Go back to Resend**
   - Go to **"Domains"** in Resend dashboard
   - You should see `staatwright.com` listed

2. **Check Status**
   - Status will show as **"Pending"** or **"Verifying"**
   - Resend checks DNS records every few minutes

3. **Wait for Verification**
   - Usually takes **5-30 minutes**
   - Can take up to **48 hours** in rare cases
   - Refresh the page periodically

4. **Success!**
   - When verified, status will change to **"Verified"** with a green checkmark ✅
   - You'll see a success message

---

## Troubleshooting

### Records not showing up?
- DNS changes can take a few minutes to propagate
- Wait 5-10 minutes and refresh GoDaddy's DNS page
- Make sure you clicked "Save" for each record

### Verification taking too long?
- Double-check that you copied the values exactly (no extra spaces)
- Make sure the Name/Host fields match exactly what Resend shows
- Verify all records are showing in GoDaddy's DNS list

### Still not working?
- In Resend, click on your domain to see detailed verification status
- It will tell you which records are missing or incorrect
- Compare those with what you have in GoDaddy

### Need to edit a record?
- In GoDaddy, find the record in the list
- Click **"Edit"** (pencil icon)
- Make changes and click **"Save"**

---

## What Happens After Verification?

Once verified:
- ✅ You can send emails FROM `hello@staatwright.com`
- ✅ You can use any email address at your domain (hello@, contact@, info@, etc.)
- ✅ Emails will be properly authenticated (less likely to go to spam)
- ✅ Your contact form will automatically use `hello@staatwright.com` as the sender

---

## Quick Checklist

- [ ] Added domain in Resend
- [ ] Copied all DNS records from Resend
- [ ] Added SPF record in GoDaddy (or edited existing one)
- [ ] Added all 3 DKIM records in GoDaddy
- [ ] Added DMARC record in GoDaddy (optional)
- [ ] Waited 5-30 minutes
- [ ] Checked Resend - status shows "Verified" ✅

---

**Need help?** If you get stuck at any step, let me know which step and what you're seeing, and I'll help troubleshoot!

