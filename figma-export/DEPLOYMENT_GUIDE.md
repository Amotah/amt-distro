# Smart Links System — Production Deployment Guide

## 🚀 Frontend Deployment (Vercel)

### Step 1: Import Project to Vercel

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Select Repository:**
   - Choose "GitHub" as source
   - Search for: `amt-distro`
   - Select: `Amotah/amt-distro`
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `figma-export`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 2: Add Environment Variables

In Vercel project settings, add:

```
VITE_SUPABASE_URL=https://vatpvfrbgeatdeypqcrv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdHB2ZnJiZ2VhdGRleXBxY3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzI4NTksImV4cCI6MjA4MTkwODg1OX0.ui1XKtT0D3ZwAWqa9a-BB_o-BXeGvSPShwn7sNVWvSg
```

### Step 3: Deploy

1. **Trigger Deployment:**
   - Click "Deploy"
   - Vercel will automatically build from `figma-export/` root
   - Watch the build logs in real-time

2. **Wait for Success:**
   - Build should complete in ~60-90 seconds
   - Preview URL will be generated
   - Production URL: `amtdistro.com` (if custom domain configured)

### Step 4: Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your domain (e.g., `amtdistro.com`)
3. Update DNS records:
   - **A Record:** Point to Vercel's IP
   - Or use **CNAME:** `cname.vercel-dns.com`
4. Wait for SSL certificate (auto-provisioned by Vercel)

---

## ✅ Backend Status (Already Deployed)

### Supabase Functions
```
✓ Project: vatpvfrbgeatdeypqcrv
✓ Region: eu-west-1
✓ Functions deployed:
  • make-server-79198001 (Smart Links + DSP management)
  • make-server-health (Health checks)
  • server (Additional services)
```

### Database Migrations
```
✓ All 5 migrations applied:
  • release_dsp_urls table
  • smart_links table
  • smart_link_services table
  • platform_directory table (20+ platforms pre-loaded)
  • smart_link_settings table
```

### RLS Policies
```
✓ Row-Level Security enabled on all tables
✓ Users can only access own data
✓ Public users can view active links
✓ Admins have full access
```

---

## 🔗 API Integration

### Base URL
```
https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-79198001
```

### Available Endpoints

#### Smart Links CRUD
```
POST   /smart-links                    Create new link
GET    /smart-links                    List user's links
GET    /smart-links/:slug              Get public link
PATCH  /smart-links/:id                Update link
DELETE /smart-links/:id                Delete link
```

#### Metadata Resolution
```
POST   /smart-links/resolve            Resolve by ISRC/UPC/URL
```

#### Platform Management
```
POST   /smart-links/:id/services       Add platform URL
PATCH  /smart-links/:id/services/:id   Update platform
DELETE /smart-links/:id/services/:id   Remove platform
```

#### Analytics
```
GET    /smart-links/:id/analytics      Get link analytics
POST   /smart-links/:id/events/click   Record click event
POST   /smart-links/:id/events/view    Record view event
```

#### Settings
```
GET    /smart-links/:id/settings       Get customization settings
PATCH  /smart-links/:id/settings       Update settings
```

---

## 🔐 Security Checklist

- ✅ **RLS Enabled:** All tables have row-level security
- ✅ **JWT Verification:** Enforced on all protected endpoints
- ✅ **CORS Configured:** Frontend domain whitelisted
- ✅ **Input Validation:** All endpoints validate input
- ✅ **Rate Limiting:** Ready to implement via Middleware
- ✅ **Secrets Management:** Keys stored in Vercel Environment Variables

---

## 📊 Monitoring & Logging

### Vercel Dashboard
- **Build Status:** vercel.com/dashboard
- **Function Logs:** Real-time request/error logs
- **Performance Metrics:** Analytics tab

### Supabase Dashboard
- **Database:** supabase.com → Project Settings
- **Function Logs:** Edge Functions → Logs
- **API Usage:** Analytics section

### Recommended Setup
1. Enable error tracking (Sentry, Rollbar)
2. Set up monitoring alerts (PagerDuty, OpsGenie)
3. Weekly log reviews for security audit

---

## 🚨 Troubleshooting

### Build Failures

**Issue:** Vite build fails
```bash
# Clean install and rebuild
npm install --force
npm run build
```

**Issue:** Missing environment variables
```bash
# Verify in Vercel Settings → Environment Variables
# Must include VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### API Connectivity

**Issue:** Frontend can't reach API
```
Check:
1. CORS headers in Supabase function
2. JWT token format in Authorization header
3. Supabase URL matches VITE_SUPABASE_URL
```

**Issue:** Database queries fail
```
Check:
1. User auth token is valid (JWT decode)
2. Row-level security policies allow query
3. Table relationships are correct
```

### Performance Issues

**Issue:** Slow page load
```
1. Check Vercel build output size (should be ~5MB)
2. Enable compression (nginx/cloudflare)
3. Optimize images in /public folder
4. Enable Vercel Edge Caching
```

---

## 📋 Post-Deployment Checklist

- [ ] **Frontend deployed** to Vercel
- [ ] **Environment variables** added
- [ ] **Custom domain** configured (if applicable)
- [ ] **SSL certificate** active
- [ ] **Backend functions** responding (test via Postman)
- [ ] **Database queries** working (test in Supabase Console)
- [ ] **Smart Links dashboard** loads
- [ ] **Create Smart Link wizard** functional
- [ ] **Analytics dashboard** displays data
- [ ] **Landing page** renders correctly
- [ ] **Click tracking** works (check smart_link_clicks table)
- [ ] **Platform directory** loaded (20+ platforms visible)
- [ ] **User authentication** working
- [ ] **RLS policies** enforced (users can't see others' links)
- [ ] **Error logs** clean (check Vercel & Supabase logs)

---

## 🎯 Launch Timeline

### Pre-Launch (Day 1)
```
08:00 - Final testing complete
09:00 - Deploy to Vercel
09:30 - Smoke tests pass
10:00 - DNS propagation complete
```

### Launch (Day 2)
```
09:00 - Open access to beta artists (10-15 users)
12:00 - Monitor for errors
15:00 - Expand to 50+ artists
18:00 - Full public launch
```

### Post-Launch (Week 1)
```
Daily: Monitor logs and metrics
Review: User feedback and bug reports
Optimize: Performance bottlenecks
Iterate: Product improvements
```

---

## 📞 Support & Escalation

### Critical Issues (Production Down)
1. Check Vercel dashboard for deployment status
2. Check Supabase function logs for errors
3. Verify database connectivity
4. Rollback to previous deployment if needed

### Database Issues
- **Supabase Dashboard:** supabase.com/dashboard
- **Support Portal:** supabase.com/support
- **Status Page:** status.supabase.com

### Frontend Issues
- **Vercel Dashboard:** vercel.com/dashboard
- **GitHub Deployments:** github.com/Amotah/amt-distro/deployments
- **Rollback:** 1-click via Vercel interface

---

## 🎉 Success Indicators

✅ System is ready for launch when:

1. **Frontend loads** without errors
2. **Users can authenticate** with email/password
3. **Dashboard displays** (empty state for new users)
4. **Create wizard works** end-to-end
5. **Smart links generate** with unique slugs
6. **Landing pages render** publicly (no login required)
7. **Click tracking records** in database
8. **Analytics populate** data correctly
9. **Platform directory** shows 20+ DSPs
10. **Africa-first ordering** works (Boomplay/Audiomack first)

---

## 📚 Documentation

All smart links documentation in workspace root:
- `SMART_LINKS_COMPREHENSIVE_SYSTEM.md` — Full spec
- `SMARTLINK_LANDING_PAGE_GUIDE.md` — Architecture
- `SMARTLINK_IMPLEMENTATION_GUIDE.md` — Developer guide
- `SMARTLINK_USAGE_EXAMPLES.md` — Code examples
- `SMARTLINK_ARCHITECTURE.md` — Data flows & diagrams

---

**Deployment Status:** ✅ Ready for Launch
**Next Step:** Push to Vercel
**Estimated Time to Live:** 15-20 minutes
