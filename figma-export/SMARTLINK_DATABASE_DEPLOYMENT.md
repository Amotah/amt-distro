# Smart Links Database — Deploy to Supabase ✅

**Time Required:** 5 minutes  
**Status:** Ready to deploy  
**Date:** 2026-08-24

---

## 📋 Quick Deployment Options

### **Option 1: Using Supabase CLI (Recommended)**

#### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

#### Step 2: Link to Your Project
```bash
cd e:\muisc_platform\figma-export
supabase link --project-ref vatpvfrbgeatdeypqcrv
```

#### Step 3: Deploy Migrations
```bash
supabase migration up
```

**Result:** All tables created automatically ✅

---

### **Option 2: Direct SQL Editor (Fastest — 2 minutes)**

#### Step 1: Go to Supabase Dashboard
```
https://supabase.com/dashboard/project/vatpvfrbgeatdeypqcrv/sql/new
```

#### Step 2: Create New Query
Click "New Query"

#### Step 3: Copy & Paste SQL
Open file: `DEPLOY_SMART_LINKS_DATABASE.sql`
Copy entire content
Paste into SQL Editor

#### Step 4: Run Query
Click "Run" button (or Cmd+Enter)

**Watch for:** Green checkmark ✅

#### Step 5: Verify
Run verification queries (commented at end of file):
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'smart%';
```

Expected result: 6 tables created ✅

---

### **Option 3: Using Migrations File**

#### Step 1: Copy migration file
```bash
cp supabase/migrations/20260824000000_smart_links_system.sql \
   supabase/migrations/
```

#### Step 2: Run migrations
```bash
supabase migration up
```

---

## ✅ Verification Checklist

After deployment, verify everything created:

### 1. Check Tables Exist
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected output:**
```
platform_directory
release_dsp_urls
smart_link_events
smart_link_services
smart_link_settings
smart_links
```

### 2. Check Indexes Created
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'smart%'
ORDER BY indexname;
```

### 3. Check RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'smart%';
```

**Expected:** All should show `true`

### 4. Check Platform Directory Populated
```sql
SELECT COUNT(*) as platform_count FROM public.platform_directory;
```

**Expected:** `13` platforms

### 5. Test Insert Permission
```sql
-- This should work if you're authenticated
INSERT INTO public.smart_links 
  (user_id, title, artist_name, slug)
VALUES 
  (auth.uid(), 'Test Song', 'Test Artist', 'test-song-123');

-- Verify it was created
SELECT * FROM public.smart_links 
WHERE slug = 'test-song-123';

-- Clean up
DELETE FROM public.smart_links 
WHERE slug = 'test-song-123';
```

---

## 🚨 Troubleshooting

### Issue: "User doesn't have permission to execute statement"

**Cause:** RLS policies not allowing your user

**Solution:**
```bash
# Grant permissions explicitly
supabase db push --dry-run  # Preview changes
supabase db push            # Apply changes
```

### Issue: "Relation 'smart_links' already exists"

**Cause:** Tables already created in database

**Solution:** Safe to ignore — the SQL uses `IF NOT EXISTS`

### Issue: Missing auth.users reference

**Cause:** Auth tables not set up

**Solution:**
```bash
# Verify auth is enabled in Supabase Dashboard
# → Settings → Auth
# Should show status as "enabled"
```

---

## 📊 Database Structure Overview

```
smart_links (core link data)
    ├── smart_link_services (platform URLs)
    ├── smart_link_settings (customization)
    └── smart_link_events (analytics)

release_dsp_urls (release-level URLs)
platform_directory (master DSP list)
```

---

## 🔄 After Database Deployment

### 1. Verify API Endpoints Work

```bash
# Test health endpoint
curl https://gwmusic.com.ng/make-server-79198001/health

# Create smart link via API
curl -X POST https://gwmusic.com.ng/make-server-79198001/smart-links \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Song",
    "artistName": "Test Artist",
    "slug": "test-song",
    "services": [
      {"platform": "spotify", "url": "https://open.spotify.com/..."}
    ]
  }'

# Fetch smart link
curl https://gwmusic.com.ng/make-server-79198001/smart-links/test-song
```

### 2. Test in Dashboard

```
1. Go to Dashboard
2. Create Release
3. Create Smart Link
4. Verify it saves to database
5. Access via: gwmusic.com.ng/s/your-slug
```

### 3. Check Database Entries

```sql
-- View all your smart links
SELECT id, slug, title, artist_name, total_views, total_clicks
FROM public.smart_links
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- View all platforms for a link
SELECT sls.id, sls.platform_name, sls.platform_url
FROM public.smart_link_services sls
WHERE sls.smart_link_id = 'YOUR_LINK_ID'
ORDER BY sls.display_order;
```

---

## 📈 Performance Optimization (Optional)

### Enable Auto-Scaling on Large Tables
```sql
-- For smart_link_events table (may grow large)
ALTER TABLE public.smart_link_events SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE public.smart_link_events SET (autovacuum_analyze_scale_factor = 0.02);
```

### Create Partitioned Table for Events (for high volume)
```sql
-- Optional: Partition smart_link_events by month
-- Only needed if you expect >1M events/month

CREATE TABLE IF NOT EXISTS public.smart_link_events_202608 PARTITION OF public.smart_link_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

---

## 🔐 Security Verification

### Confirm RLS Policies Enforced
```sql
-- This query should return 0 rows 
-- (other users shouldn't see your data)
SELECT * FROM public.smart_links 
WHERE user_id != auth.uid() AND is_public = false;
```

### Check Policy Details
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'smart_links'
ORDER BY policyname;
```

---

## 📊 Monitor Database Health

### Check Table Sizes
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'smart%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Connection Limits
```bash
# In Supabase Dashboard:
# Settings → Database → Connections
# Should show available connections
```

---

## 🎯 Next Steps After Deployment

1. ✅ **Database deployed** → Read this page
2. ✅ **API endpoints ready** → Already in index.tsx
3. ✅ **Frontend updated** → Already in React components
4. ⏭️ **Deploy server** → Follow SMARTLINK_DEPLOYMENT_GUIDE.md
5. ⏭️ **Test public links** → Use testing checklist
6. ⏭️ **Go live** → gwmusic.com.ng/s/your-song

---

## 📞 Support

**Database issues?**
- Check Supabase Dashboard → Logs
- Verify auth.users table exists
- Confirm RLS policies are correct

**API issues?**
- Check Supabase → Network logs
- Verify CORS configuration
- Check Edge Function logs

**Need to reset database?**
```sql
-- ⚠️ DANGER: This deletes all data!
DROP TABLE IF EXISTS public.smart_link_events CASCADE;
DROP TABLE IF EXISTS public.release_dsp_urls CASCADE;
DROP TABLE IF EXISTS public.smart_link_settings CASCADE;
DROP TABLE IF EXISTS public.smart_link_services CASCADE;
DROP TABLE IF EXISTS public.smart_links CASCADE;

-- Then re-run the deployment SQL
```

---

## ✨ Database Ready!

All 6 tables created with:
- ✅ Proper indexes
- ✅ RLS security policies
- ✅ Auto-updating timestamps
- ✅ Foreign key constraints
- ✅ Platform directory pre-populated
- ✅ Analytics tracking schema

**Status:** 🟢 READY FOR PRODUCTION

Next: Deploy the server and test public links!
