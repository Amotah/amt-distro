# 🧪 Smart Links Deployment Testing Guide

**Complete testing procedures for all deployment stages**

---

## PRE-DEPLOYMENT TESTING (Before Going Live)

### Test 1: Build System Works

**What:** Verify the React/Vite build completes without errors

**How:**
```powershell
cd e:\muisc_platform\figma-export
npm install
npm run build
```

**Expected:**
- ✅ No errors
- ✅ `dist/` folder created
- ✅ Multiple files in dist/ (index.html, assets/, etc.)

**If fails:** Check `npm run build` errors and fix them

---

### Test 2: Dev Server Starts

**What:** Verify Vite dev server works locally

**How:**
```powershell
cd e:\muisc_platform\figma-export
npm run dev
```

**Expected:**
- ✅ Server starts on localhost:5173 (or shown port)
- ✅ No build errors
- ✅ No crashes

**Test in browser:**
- Open: `http://localhost:5173`
- Should load homepage ✓

**Press:** `Ctrl+C` to stop

---

### Test 3: Database Schema Valid

**What:** Verify SQL syntax is correct

**How:**
1. Open: `DEPLOY_SMART_LINKS_DATABASE.sql`
2. Copy entire contents
3. Go to: `https://www.dbfiddle.com/`
4. Select "PostgreSQL"
5. Paste into left panel
6. Click "Run"

**Expected:**
- ✅ No SQL errors
- ✅ Shows "Query execution completed"
- ✅ Right panel shows tables created

---

### Test 4: Git Repository Clean

**What:** Verify all code committed and pushed

**How:**
```powershell
cd e:\muisc_platform\figma-export
git status
git log --oneline -5
```

**Expected:**
- ✅ "Your branch is up to date"
- ✅ No untracked files
- ✅ No uncommitted changes
- ✅ Last commit message visible

---

## POST-DATABASE-DEPLOYMENT TESTING

### Test 5: Tables Created Successfully

**What:** Verify all 6 tables exist in Supabase

**Where:** Supabase → SQL Editor

**SQL:**
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'smart%'
ORDER BY tablename;
```

**Expected Output:**
```
platform_directory
release_dsp_urls
smart_link_events
smart_link_services
smart_link_settings
smart_links
```

**Status:** ✅ PASS (exactly 6 tables)

---

### Test 6: Platform Directory Populated

**What:** Verify all 13 platforms pre-populated

**SQL:**
```sql
SELECT platform_key, platform_name 
FROM public.platform_directory 
ORDER BY display_order;
```

**Expected:** Shows 13 platforms:
- spotify
- youtube_music
- apple_music
- amazon_music
- tidal
- deezer
- boomplay
- boomplay_website
- audiomack
- soundcloud
- shazam
- music_brainz
- itunes

**Status:** ✅ PASS (all 13 visible)

---

### Test 7: Indexes Created

**What:** Verify performance indexes exist

**SQL:**
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'smart_links'
ORDER BY indexname;
```

**Expected:** Shows indexes on:
- smart_links_pkey
- idx_smart_links_user_id
- idx_smart_links_slug
- idx_smart_links_status

**Status:** ✅ PASS (all critical indexes present)

---

### Test 8: RLS Policies Enabled

**What:** Verify row-level security is active

**SQL:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'smart%' 
ORDER BY tablename;
```

**Expected:** All show `true`

```
smart_link_events        | t (true)
smart_link_services      | t (true)
smart_link_settings      | t (true)
smart_links              | t (true)
```

**Status:** ✅ PASS (security enabled)

---

## POST-VERCEL-DEPLOYMENT TESTING

### Test 9: Website Loads

**What:** Verify frontend accessible via domain

**How:**
1. Open browser
2. Go to: `https://gwmusic.com.ng`

**Expected:**
- ✅ Homepage loads in < 3 seconds
- ✅ No 404 errors
- ✅ Logo visible
- ✅ Navigation visible

**If fails:** Check Vercel logs for build errors

---

### Test 10: HTTPS/SSL Certificate Valid

**What:** Verify secure connection

**How:**
```bash
curl -v https://gwmusic.com.ng 2>&1 | findstr "subject"
```

**Expected:**
```
subject: C=US; O=Let's Encrypt; CN=gwmusic.com.ng
```

**Status:** ✅ PASS (valid certificate)

---

### Test 11: API Health Endpoint

**What:** Verify backend API responding

**How:**
```bash
curl -s https://gwmusic.com.ng/make-server-79198001/health | jq
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-24T12:00:00Z"
}
```

**Status:** ✅ PASS (API responding)

---

### Test 12: Create Smart Link via Dashboard

**What:** End-to-end test: create link and verify in database

**Steps:**
1. Go to: `https://gwmusic.com.ng/dashboard`
2. Login with your account
3. Click "Create Smart Link"
4. Fill in:
   - Title: `Test Song Integration`
   - Artist: `Test Artist`
   - Slug: `test-integration-link`
   - Add Spotify: paste real Spotify URL
5. Click "Save"

**Expected:**
- ✅ Link saves successfully
- ✅ No error messages
- ✅ Appears in "My Links" list
- ✅ URL shown: `https://gwmusic.com.ng/s/test-integration-link`

---

### Test 13: Verify Data in Database

**What:** Confirm link saved to Supabase

**SQL (in Supabase):**
```sql
SELECT id, slug, title, artist_name, total_views, total_clicks, created_at
FROM public.smart_links 
WHERE slug = 'test-integration-link'
LIMIT 1;
```

**Expected:**
- ✅ Shows 1 row
- ✅ slug = 'test-integration-link'
- ✅ title = 'Test Song Integration'
- ✅ total_views = 0
- ✅ total_clicks = 0

**Status:** ✅ PASS (database persisting data)

---

### Test 14: Public Link Access (Desktop)

**What:** Test link works for public users

**Steps:**
1. Copy link: `https://gwmusic.com.ng/s/test-integration-link`
2. Open in **new incognito/private** browser window
3. Should load landing page showing platforms
4. Click "Spotify" button

**Expected:**
- ✅ Page loads in < 2 seconds
- ✅ Shows platform options
- ✅ Clicking Spotify redirects to song ✓

---

### Test 15: Public Link Access (Mobile)

**What:** Test link on phone/tablet

**Steps:**
1. Copy link to phone via QR code or text
2. Open on **iOS Safari** or **Android Chrome**
3. Click platform button

**Expected:**
- ✅ Page loads correctly
- ✅ Layout responsive (not cut off)
- ✅ Buttons clickable
- ✅ Redirects work ✓

---

### Test 16: Analytics - View Tracking

**What:** Verify page views tracked in database

**Steps:**
1. Open link in fresh browser: `https://gwmusic.com.ng/s/test-integration-link`
2. Close browser
3. Check database

**SQL (in Supabase):**
```sql
SELECT event_type, COUNT(*) as count
FROM public.smart_link_events
WHERE event_type = 'view'
GROUP BY event_type;
```

**Expected:**
- ✅ Shows at least 1 'view' event

**Status:** ✅ PASS (view tracking working)

---

### Test 17: Analytics - Click Tracking

**What:** Verify link clicks tracked

**Steps:**
1. Open link: `https://gwmusic.com.ng/s/test-integration-link`
2. Click a platform (Spotify, YouTube, etc.)
3. Check database

**SQL (in Supabase):**
```sql
SELECT 
  COALESCE(JSON->>'platform', 'unknown') as platform,
  COUNT(*) as clicks
FROM public.smart_link_events
WHERE event_type = 'click'
GROUP BY JSON->>'platform'
ORDER BY clicks DESC;
```

**Expected:**
- ✅ Shows click for platform you clicked

**Status:** ✅ PASS (click tracking working)

---

### Test 18: Update Smart Link

**What:** Verify edit functionality works

**Steps:**
1. In Dashboard, find test link
2. Click "Edit"
3. Change title to: `Updated Test Song`
4. Change platforms (add/remove)
5. Click "Save"

**Expected:**
- ✅ Updates successfully
- ✅ Changes visible immediately

**Verify:**
```sql
SELECT title FROM public.smart_links 
WHERE slug = 'test-integration-link' LIMIT 1;
```

**Status:** ✅ PASS (update working)

---

### Test 19: Delete Smart Link

**What:** Verify delete functionality works

**Steps:**
1. In Dashboard, find link
2. Click "Delete"
3. Confirm deletion

**Expected:**
- ✅ Deleted from UI
- ✅ No error

**Verify:**
```sql
SELECT COUNT(*) FROM public.smart_links 
WHERE slug = 'test-integration-link';
```

**Expected:** Returns `0`

**Status:** ✅ PASS (delete working)

---

### Test 20: Database Cleanup

**What:** Remove test data

**SQL:**
```sql
DELETE FROM public.smart_link_events 
WHERE smart_link_id IN (
  SELECT id FROM public.smart_links 
  WHERE slug LIKE 'test%'
);

DELETE FROM public.smart_links 
WHERE slug LIKE 'test%';
```

**Status:** ✅ PASS (ready for production)

---

## CROSS-BROWSER TESTING

### Test 21: Chrome/Chromium

**What:** Test on Google Chrome

**Steps:**
1. Open: `https://gwmusic.com.ng/s/test-link` (use real link)
2. Check loads correctly
3. Check redirect works
4. Open DevTools (F12) → Console → verify no errors

**Expected:** ✅ All working, no console errors

---

### Test 22: Firefox

**What:** Test on Firefox

**Steps:**
1. Same as Chrome test
2. Open DevTools (F12) → Console → verify no errors

**Expected:** ✅ All working, no console errors

---

### Test 23: Safari

**What:** Test on Safari

**Steps:**
1. Same as Chrome test
2. Check Responsive Design Mode (Cmd+Option+I)

**Expected:** ✅ All working, responsive

---

### Test 24: Edge

**What:** Test on Microsoft Edge

**Steps:**
1. Same as Chrome test
2. No console errors

**Expected:** ✅ All working

---

## PERFORMANCE TESTING

### Test 25: Page Load Time

**What:** Measure how fast link loads

**How:**
```bash
curl -w "Total time: %{time_total}s\n" -o /dev/null -s https://gwmusic.com.ng/s/test-link
```

**Expected:** < 2 seconds

**Good:** 0.5 - 1.5s  
**OK:** 1.5 - 2.0s  
**Poor:** > 2.0s (check Supabase/Vercel logs)

---

### Test 26: API Response Time

**What:** Measure backend performance

**How:**
```bash
for i in {1..5}; do
  curl -w "%{time_total}\n" -o /dev/null -s https://gwmusic.com.ng/make-server-79198001/health
done
```

**Expected Average:** < 500ms

**Good:** 100-300ms  
**OK:** 300-500ms  
**Poor:** > 500ms (check Supabase performance)

---

## LOAD TESTING (Optional - For High Traffic)

### Test 27: Concurrent Requests

**What:** Test system under light load

**How:**
```bash
# Using Apache Bench
ab -n 100 -c 10 https://gwmusic.com.ng/s/test-link

# Interpretation:
# -n 100 = 100 total requests
# -c 10 = 10 concurrent requests
```

**Expected:**
- ✅ 100% success rate
- ✅ No timeouts
- ✅ Response time consistent

---

## SECURITY TESTING

### Test 28: CORS Headers

**What:** Verify security headers present

**How:**
```bash
curl -I https://gwmusic.com.ng
```

**Look for:**
```
Strict-Transport-Security: ...
Content-Security-Policy: ...
X-Content-Type-Options: nosniff
```

**Status:** ✅ PASS (security headers present)

---

### Test 29: SQL Injection Protection

**What:** Verify API validates input

**How:**
```bash
curl "https://gwmusic.com.ng/make-server-79198001/smart-links/'; DROP TABLE smart_links; --"
```

**Expected:**
- ✅ No error
- ✅ No table dropped
- ✅ Clean error response

---

### Test 30: Authentication Required

**What:** Verify protected endpoints require auth

**How:**
```bash
curl -X POST https://gwmusic.com.ng/make-server-79198001/smart-links \
  -H "Content-Type: application/json" \
  -d '{"title": "test"}'
```

**Expected:**
- ✅ Returns 401 Unauthorized
- ✅ No data created

---

## FINAL CHECKLIST

Run all tests and mark complete:

### Database Tests
- [ ] Test 5: Tables created
- [ ] Test 6: Platforms populated
- [ ] Test 7: Indexes created
- [ ] Test 8: RLS enabled

### Deployment Tests
- [ ] Test 9: Website loads
- [ ] Test 10: SSL certificate valid
- [ ] Test 11: API health

### Functionality Tests
- [ ] Test 12: Create link
- [ ] Test 13: Data in database
- [ ] Test 14: Public link (desktop)
- [ ] Test 15: Public link (mobile)
- [ ] Test 16: View tracking
- [ ] Test 17: Click tracking
- [ ] Test 18: Update link
- [ ] Test 19: Delete link

### Browser Tests
- [ ] Test 21: Chrome
- [ ] Test 22: Firefox
- [ ] Test 23: Safari
- [ ] Test 24: Edge

### Performance Tests
- [ ] Test 25: Load time < 2s
- [ ] Test 26: API response < 500ms
- [ ] Test 27: Concurrent requests OK

### Security Tests
- [ ] Test 28: Security headers present
- [ ] Test 29: SQL injection protected
- [ ] Test 30: Auth required

---

## ✅ SIGN-OFF

**All 30 tests completed and passed?**

If **YES:**
- ✅ Your system is PRODUCTION READY
- ✅ You can announce to artists
- ✅ Monitor logs daily for 1 week

If **NO:**
- ⚠️ Check failed test
- ⚠️ Review troubleshooting guides
- ⚠️ Fix issue and re-run test

---

**Testing Date:** _______________  
**Tested By:** _______________  
**All Tests Passed:** ☐ YES / ☐ NO  
**Issues Found:** _______________  
**Status:** ✅ PRODUCTION READY

---

## 🎉 Ready to Go Live!

All tests passing? Share the links with your artists! 🚀
