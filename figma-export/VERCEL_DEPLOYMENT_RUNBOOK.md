# 🚀 Smart Links Deployment — Complete Vercel Guide

**Status:** Ready to Deploy  
**Platform:** Vercel  
**Estimated Time:** 45 minutes total  
**Date:** 2026-08-24

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] **Step 1:** Deploy database to Supabase (5 min)
- [ ] **Step 2:** Verify database tables (2 min)  
- [ ] **Step 3:** Connect GitHub to Vercel (5 min)
- [ ] **Step 4:** Deploy to Vercel (10 min)
- [ ] **Step 5:** Configure DNS (10 min)
- [ ] **Step 6:** Run verification tests (5 min)
- [ ] **Step 7:** Go live (final check)

---

## ✅ STEP 1: Deploy Database to Supabase (5 minutes)

### What you're doing:
Creating 6 database tables with security policies, indexes, and pre-populated platform directory.

### Step 1A: Go to Supabase Dashboard

Open: `https://supabase.com/dashboard/project/vatpvfrbgeatdeypqcrv/sql/new`

### Step 1B: Create New Query

Click the **"New Query"** button

### Step 1C: Copy Database SQL

Open this file in your editor:
```
DEPLOY_SMART_LINKS_DATABASE.sql
```

Copy the **entire** contents (Ctrl+A, Ctrl+C)

### Step 1D: Paste into Supabase

Paste into the SQL editor query box

### Step 1E: Execute Query

Click **"Run"** button (or press `Cmd+Enter`)

### Expected Result: 
✅ Green checkmark at bottom  
✅ Status: "Success"  

**If you see an error:** Check "Troubleshooting" at end of this file.

---

## ✅ STEP 2: Verify Database (2 minutes)

Run this query to confirm all tables created:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'smart%'
ORDER BY tablename;
```

### Expected Result (exactly 6 tables):
```
platform_directory
release_dsp_urls
smart_link_events
smart_link_services
smart_link_settings
smart_links
```

✅ If you see exactly these 6 → **Database is ready!**

---

## ✅ STEP 3: Connect GitHub to Vercel (5 minutes)

### Step 3A: Go to Vercel

Open: `https://vercel.com`

### Step 3B: Sign In or Create Account

Login with GitHub (recommended) or create account

### Step 3C: Create New Project

Click **"Add New..."** → **"Project"**

### Step 3D: Import Repository

- Select **GitHub** as source
- Click **"Import Git Repository"**
- Paste: `https://github.com/Amotah/amt-distro`
- Click **"Import"**

### Step 3E: Configure Project

Set the following:

**Project Settings:**
- **Root Directory:** `figma-export`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**Environment Variables:**
Add these (check your Supabase project for values):

```
VITE_SUPABASE_URL=https://vatpvfrbgeatdeypqcrv.supabase.co
VITE_SUPABASE_ANON_KEY=[Copy from Supabase → Settings → API → anon key]
```

### Step 3F: Deploy

Click **"Deploy"**

**Wait time:** 3-5 minutes

### Expected Result:
✅ Green checkmark  
✅ URL displayed (vercel-generated domain first, we'll change to gwmusic.com.ng next)

---

## ✅ STEP 4: Configure DNS for gwmusic.com.ng (10 minutes)

### Step 4A: Get Vercel DNS Info

After deployment, in Vercel dashboard:
- Go to your project
- Click **"Settings"** → **"Domains"**
- Click **"Add Domain"**
- Enter: `gwmusic.com.ng`

Vercel will show you nameserver instructions.

### Step 4B: Update Domain Registrar

Go to where you registered gwmusic.com.ng (e.g., Namecheap, GoDaddy, etc.)

**Find:** Nameserver settings

**Replace with Vercel's nameservers:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Delete** any existing nameservers

**Save/Apply changes**

### Step 4C: Wait for DNS Propagation

**Time:** Usually 5-30 minutes (sometimes up to 24 hours)

In Vercel, watch the domain status → should show "Valid" ✓

### Step 4D: Add SSL Certificate

Vercel automatically provisions SSL. In Vercel domain settings:

- You should see ✅ SSL enabled
- Certificate auto-renews

### Expected Result:
✅ Domain shows "Valid" in Vercel  
✅ HTTPS working (try: `https://gwmusic.com.ng`)  
✅ Redirects to your Vercel deployment

---

## ✅ STEP 5: Run Verification Tests (5 minutes)

### Test 1: Check Website Loads

Open in browser:
```
https://gwmusic.com.ng
```

**Expected:** Your music platform homepage loads ✓

### Test 2: Check API Health

Open in browser or run:
```bash
curl https://gwmusic.com.ng/make-server-79198001/health
```

**Expected:** Returns JSON with status info ✓

### Test 3: Test Smart Link Creation

1. Go to Dashboard
2. Click "Create Smart Link"
3. Fill in:
   - Title: `Test Song`
   - Artist: `Test Artist`
   - Platform: `Spotify` (and select URL)
4. Click "Save"

**Expected:** Link saves successfully ✓

### Test 4: Test Smart Link Access

1. Copy the generated link (format: `https://gwmusic.com.ng/s/test-song`)
2. Open in **new incognito/private browser**
3. Click a platform

**Expected:** Redirects correctly ✓

### Test 5: Check Database Updates

In Supabase SQL Editor, run:
```sql
SELECT * FROM public.smart_links 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** Shows your test smart link ✓

### Test 6: Test Analytics

1. Open link in browser 2-3 times
2. Click a platform each time
3. In Supabase, run:

```sql
SELECT total_views, total_clicks 
FROM public.smart_links 
WHERE slug LIKE '%test%'
LIMIT 1;
```

**Expected:** Shows total_views ≥ 2, total_clicks ≥ 2 ✓

---

## ✅ STEP 6: Production Testing (5 minutes)

### Test on Multiple Devices

1. **Desktop** (Chrome, Firefox, Safari)
2. **Mobile** (iOS Safari, Android Chrome)
3. **Tablet** (iPad Safari)

**For each device:**
- Access `https://gwmusic.com.ng/s/your-test-slug`
- Verify it loads
- Verify redirection works
- Check in database that views/clicks recorded

### Test Cross-Browser

- Chrome
- Firefox
- Safari
- Edge

All should work identically ✓

---

## ✅ STEP 7: Go Live! 🎉

### Final Checklist Before Launch

- [ ] Database deployed (6 tables visible)
- [ ] DNS pointing to Vercel (showing as "Valid")
- [ ] Domain loads in browser (https://gwmusic.com.ng)
- [ ] Smart link creation works
- [ ] Public link access works
- [ ] Analytics tracking works
- [ ] Multiple device testing passed
- [ ] No errors in Supabase or Vercel logs

### Launch Steps

1. **Share link with artists**
   - Format: `https://gwmusic.com.ng/s/artist-song-name`
   - They can create their own links in dashboard

2. **Monitor analytics**
   - Dashboard shows real-time views/clicks
   - Check database for data integrity

3. **Set up monitoring**
   - In Vercel: Enable alerts
   - In Supabase: Setup notification emails
   - Monitor error logs daily first week

---

## 🔍 Monitoring After Launch

### Daily Checks (First Week)

**In Vercel Dashboard:**
```
Settings → Analytics
- Check request count
- Check error rate
- Review slow requests
```

**In Supabase Dashboard:**
```
Database → Logs
- No connection errors
- No SQL errors
- Query performance normal
```

**Manual API Test:**
```bash
curl https://gwmusic.com.ng/s/any-link-slug
```

Should return link data instantly ✓

### Weekly Checks

Monitor analytics:
```sql
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as daily_views,
  SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as daily_clicks
FROM public.smart_link_events
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

---

## 🚨 TROUBLESHOOTING

### Database Deployment Issues

**Problem:** "User doesn't have permission to execute statement"

**Solution:** 
1. Check you're logged into Supabase as project owner
2. Wait 30 seconds and retry
3. If persists: Contact Supabase support

**Problem:** "Relation 'smart_links' already exists"

**Solution:** This is safe to ignore. Tables already exist. No action needed.

---

### Vercel Deployment Issues

**Problem:** "Build failed"

**Solution:**
```bash
# In local terminal, run:
cd e:\muisc_platform\figma-export
npm install
npm run build

# If this fails, fix errors shown and commit:
git add .
git commit -m "Fix: Build errors"
git push origin copilot/generate-streams-and-downloads

# Then redeploy from Vercel dashboard
```

**Problem:** "Environment variables not recognized"

**Solution:**
1. In Vercel: Settings → Environment Variables
2. Verify both variables are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Click "Save"
4. Redeploy: Click "Deployments" → Choose latest → "Redeploy"

---

### DNS Issues

**Problem:** "gwmusic.com.ng not resolving"

**Solution:**
1. Wait 15-30 minutes for DNS to propagate
2. Check in Vercel dashboard → Domains → Status
3. If still "Invalid":
   - Verify nameservers in registrar settings
   - Make sure you're editing right domain
   - Wait up to 24 hours

**Problem:** "HTTPS not working"

**Solution:**
1. This usually means DNS not fully propagated
2. Wait 5-10 more minutes and retry
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try incognito window

---

### Smart Link Issues

**Problem:** "Link doesn't load"

**Solution:**
1. Check database: `SELECT * FROM public.smart_links WHERE slug = 'your-slug';`
2. If not there, create via dashboard again
3. Wait 2 minutes for cache to clear
4. Try again

**Problem:** "Analytics not updating"

**Solution:**
1. Open link in incognito (clears cookies)
2. Page views should increment
3. Click platform → clicks should increment
4. Check in Supabase: `SELECT * FROM public.smart_link_events;`

---

### Email/SMTP Issues (If you added email features)

**Problem:** "Verification email not received"

**Solution:**
1. Check Supabase → Auth → Email Templates
2. Verify SMTP configured (if using custom)
3. Check spam folder
4. Wait 2-5 minutes

---

## 📊 Verifying Production Deployment

### Check All Components

**Frontend:**
```bash
curl -I https://gwmusic.com.ng
# Should return 200 OK
```

**API:**
```bash
curl -s https://gwmusic.com.ng/make-server-79198001/health | jq
# Should return JSON response
```

**Database Connection:**
```sql
-- In Supabase
SELECT COUNT(*) as table_count FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'smart%';
-- Should return 6
```

**Sample Smart Link:**
```bash
curl -s https://gwmusic.com.ng/make-server-79198001/smart-links/your-slug | jq
# Should return link data
```

---

## 📈 Performance Baseline

After deployment, record these metrics:

**Vercel:**
- Deployment time: _____ minutes
- Cold start time: _____ ms
- Average response time: _____ ms

**Database:**
- Query time (smart_links): _____ ms
- Query time (analytics): _____ ms
- Storage used: _____ MB

---

## ✅ Sign-Off Checklist

- [ ] Database deployed to Supabase
- [ ] 6 tables verified in database
- [ ] GitHub connected to Vercel
- [ ] Project deployed to Vercel
- [ ] DNS configured and propagated
- [ ] Domain loads with HTTPS
- [ ] Smart link creation works
- [ ] Public link access works
- [ ] Analytics tracking works
- [ ] All tests passed
- [ ] No errors in logs
- [ ] Monitoring configured
- [ ] Ready to share with artists ✓

---

## 🎉 YOU'RE LIVE!

**Your smart links are now live at:**
```
https://gwmusic.com.ng/s/artist-song
```

**Share with your artists and watch the analytics grow!**

---

## 📞 Support

If anything breaks:
1. Check Vercel → Deployments → Logs
2. Check Supabase → Database → Logs
3. Run the verification tests above
4. Compare error to "Troubleshooting" section

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Status:** ✅ LIVE

---

**Next Steps:**
1. Share links with artists
2. Monitor analytics
3. Gather feedback
4. Plan enhancements

**Total deployment time: ~45 minutes** ⏱️
