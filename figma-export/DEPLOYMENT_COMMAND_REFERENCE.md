# 🔧 Deployment Command Reference

**Copy-paste commands for each deployment step**

---

## 1️⃣ DATABASE DEPLOYMENT (Supabase SQL Editor)

### Command 1: Create Tables & Schema
```sql
-- Go to: https://supabase.com/dashboard/project/vatpvfrbgeatdeypqcrv/sql/new
-- Create New Query
-- Copy entire DEPLOY_SMART_LINKS_DATABASE.sql into editor
-- Click RUN

-- After success, verify with:
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'smart%'
ORDER BY tablename;
```

Expected output:
```
platform_directory
release_dsp_urls
smart_link_events
smart_link_services
smart_link_settings
smart_links
```

### Command 2: Verify Platforms Pre-populated
```sql
SELECT COUNT(*) as platform_count FROM public.platform_directory;
```

Expected: `13`

---

## 2️⃣ LOCAL VERIFICATION (PowerShell)

### Build Check
```powershell
cd e:\muisc_platform\figma-export
npm install
npm run build
```

Expected: No errors, dist/ folder created

### Git Status
```powershell
git status
```

Expected: "Your branch is up to date" + no untracked files

---

## 3️⃣ GITHUB VERIFICATION

Go to: `https://github.com/Amotah/amt-distro`

Check:
- Branch: `copilot/generate-streams-and-downloads` is latest
- Files: All code is committed
- Commits: Should show recent "Deploy" commits

---

## 4️⃣ VERCEL DEPLOYMENT (Web Browser)

### Go to Vercel
```
https://vercel.com
```

### Create Project
1. Click "Add New" → "Project"
2. Click "Import Git Repository"
3. Paste: `https://github.com/Amotah/amt-distro`
4. Select repo

### Configure Build Settings
- **Root Directory:** `figma-export`
- **Framework:** `Vite`
- **Build Cmd:** `npm run build`
- **Output:** `dist`
- **Install Cmd:** `npm install`

### Add Environment Variables
```
VITE_SUPABASE_URL = https://vatpvfrbgeatdeypqcrv.supabase.co
VITE_SUPABASE_ANON_KEY = [Get from Supabase Settings → API → anon key]
```

### Deploy
Click "Deploy" button → Wait 3-5 minutes

---

## 5️⃣ DNS CONFIGURATION

### In Vercel Dashboard
1. Go to: Project → Settings → Domains
2. Click "Add Domain"
3. Enter: `gwmusic.com.ng`

### In Domain Registrar (Namecheap, GoDaddy, etc.)
**Find:** Nameserver settings  
**Update to:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Delete** old nameservers

**Save** changes

---

## 6️⃣ VERIFICATION TESTS (After DNS Propagates)

### Test 1: Website Loads
```bash
curl -I https://gwmusic.com.ng
```

Expected: `HTTP/1.1 200 OK`

### Test 2: API Health Check
```bash
curl https://gwmusic.com.ng/make-server-79198001/health
```

Expected: Returns JSON with status

### Test 3: Smart Link Fetch (create one first via dashboard)
```bash
curl https://gwmusic.com.ng/make-server-79198001/smart-links/your-slug
```

Expected: Returns link data

### Test 4: Track View Event
```bash
curl -X POST https://gwmusic.com.ng/make-server-79198001/smart-links/your-slug/events/view \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `{"success": true}`

### Test 5: Track Click Event
```bash
curl -X POST https://gwmusic.com.ng/make-server-79198001/smart-links/your-slug/events/click \
  -H "Content-Type: application/json" \
  -d '{"platform": "spotify"}'
```

Expected: `{"success": true}`

---

## 7️⃣ VERIFY DATABASE CHANGES

After creating test smart link via dashboard:

### Check Link in Database
```sql
SELECT id, slug, title, artist_name, created_at 
FROM public.smart_links 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check View Events
```sql
SELECT COUNT(*) as view_count 
FROM public.smart_link_events 
WHERE event_type = 'view' 
AND smart_link_id = 'YOUR_LINK_ID';
```

### Check Click Events
```sql
SELECT COUNT(*) as click_count 
FROM public.smart_link_events 
WHERE event_type = 'click' 
AND smart_link_id = 'YOUR_LINK_ID';
```

---

## 8️⃣ MONITOR DEPLOYMENT

### Check Vercel Logs
```
https://vercel.com/your-account/your-project/deployments
```

Look for:
- ✅ "Built successfully"
- ✅ "Ready"
- ✅ Any errors shown in logs

### Check Supabase Logs
```
https://supabase.com/dashboard/project/vatpvfrbgeatdeypqcrv/logs
```

Look for:
- ✅ No connection errors
- ✅ No SQL errors
- ✅ Query performance normal

---

## 9️⃣ ROLLBACK (If Needed)

### Revert to Previous Vercel Deployment
1. In Vercel dashboard
2. Click "Deployments"
3. Find previous working deployment
4. Click "Redeploy"

### Revert Code on GitHub
```powershell
git log --oneline | head -10
# Shows last 10 commits

git reset --hard HEAD~1
git push origin copilot/generate-streams-and-downloads
```

Then redeploy from Vercel

---

## 🔟 EMERGENCY PROCEDURES

### If Frontend Not Loading
1. Check Vercel logs
2. Verify environment variables set
3. Check: `https://gwmusic.com.ng` vs vercel URL
4. Clear browser cache (Ctrl+Shift+Delete)

### If API Returning 404
1. Check function deployed in Supabase
2. Verify URL format (should be `/make-server-79198001/...`)
3. Check CORS settings
4. Restart: Redeploy from Vercel

### If Database Connection Failing
1. Check Supabase URL in environment variables
2. Check ANON_KEY is correct
3. Verify RLS policies not blocking access
4. Check database connection limit not reached

### If DNS Not Working
1. Wait 15-30 minutes (propagation time)
2. Clear DNS cache: `ipconfig /flushdns` (Windows)
3. Test with: `nslookup gwmusic.com.ng`
4. Verify nameservers actually changed in registrar

---

## 📊 Quick Status Check

Run all of these to verify everything working:

```bash
# 1. Check website
curl -I https://gwmusic.com.ng

# 2. Check API
curl https://gwmusic.com.ng/make-server-79198001/health

# 3. Check DNS resolving
nslookup gwmusic.com.ng

# 4. Check SSL certificate
curl -v https://gwmusic.com.ng 2>&1 | grep -A 5 "subject"
```

All should complete without errors ✅

---

## 📝 Deployment Log

**Date Started:** _______________  
**Database Deployed:** _____ (date/time)  
**Vercel Deployed:** _____ (date/time)  
**DNS Configured:** _____ (date/time)  
**Testing Complete:** _____ (date/time)  
**Date Live:** _______________  

**Deployed By:** _______________  
**Issues Encountered:** _______________  
**Resolutions:** _______________  

---

## ✅ Ready to Deploy?

**Checklist before starting:**
- [ ] Code all committed to GitHub
- [ ] Supabase project created
- [ ] Vercel account created
- [ ] Domain registrar access ready
- [ ] 45 minutes free time

**Then start with Step 1 above!**

---

**Status: 🟢 READY TO DEPLOY**
