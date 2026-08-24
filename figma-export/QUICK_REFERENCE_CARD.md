# 🎯 DEPLOYMENT QUICK CARD (Print This!)

**Smart Links → Vercel Deployment (45 min)**

---

## ⚡ QUICK START (Copy-Paste Steps)

### STEP 1: Database (5 min)
```
1. Go to: supabase.com/dashboard/project/vatpvfrbgeatdeypqcrv/sql/new
2. Click "New Query"
3. Open: DEPLOY_SMART_LINKS_DATABASE.sql
4. Copy ALL ✓
5. Paste into SQL box ✓
6. Click RUN ✓
7. Wait for green checkmark ✓
8. DONE! ✓
```

**Verify:**
```sql
SELECT COUNT(*) FROM public.platform_directory;
```
Should return: `13` ✓

---

### STEP 2: GitHub → Vercel (15 min)
```
1. Go to: vercel.com
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Paste: https://github.com/Amotah/amt-distro
5. Select repo ✓
6. Set Root: figma-export
7. Set Build: npm run build
8. Add ENV vars:
   VITE_SUPABASE_URL=https://vatpvfrbgeatdeypqcrv.supabase.co
   VITE_SUPABASE_ANON_KEY=[Copy from Supabase]
9. Click Deploy ✓
10. Wait 3-5 min ✓
```

---

### STEP 3: DNS (10 min)
```
1. In Vercel: Settings → Domains → Add Domain
2. Enter: gwmusic.com.ng
3. Copy Vercel nameservers
4. Go to domain registrar
5. Update nameservers ✓
6. Save ✓
7. Wait 15-30 min for propagation ✓
```

---

### STEP 4: Test (5 min)
```
1. Open: https://gwmusic.com.ng
2. Should load! ✓

3. Create test link in dashboard
4. Copy: https://gwmusic.com.ng/s/test-link
5. Open in incognito
6. Should work! ✓

7. Check database:
   SELECT * FROM smart_links LIMIT 1;
8. Should show link! ✓
```

---

## 🎯 STATUS TRACKER

- [ ] Database deployed
- [ ] 6 tables verified
- [ ] GitHub connected to Vercel
- [ ] Environment variables set
- [ ] Vercel build successful
- [ ] DNS configured
- [ ] Website loads
- [ ] Link works
- [ ] Analytics tracking
- [ ] Ready to launch!

---

## 📊 TIMELINE

| Step | Time | ✓ |
|------|------|---|
| Database | 5 min | __ |
| Vercel | 15 min | __ |
| DNS | 10 min | __ |
| Testing | 10 min | __ |
| **TOTAL** | **40 min** | __ |

---

## 🔗 IMPORTANT LINKS

**Supabase SQL:** https://supabase.com/dashboard/project/vatpvfrbgeatdeypqcrv/sql/new

**Vercel:** https://vercel.com

**GitHub:** https://github.com/Amotah/amt-distro

**Your Domain:** https://gwmusic.com.ng

**Public Link Format:** https://gwmusic.com.ng/s/artist-song

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| DEPLOY_SMART_LINKS_DATABASE.sql | Copy to Supabase |
| VERCEL_DEPLOYMENT_RUNBOOK.md | Full guide |
| DEPLOYMENT_COMMAND_REFERENCE.md | All commands |
| DEPLOYMENT_TESTING_GUIDE.md | Tests (30 procedures) |
| DEPLOYMENT_READY_SUMMARY.md | Overview |

---

## 🚨 TROUBLESHOOTING

**Database fails?**
→ Check: DB is `vatpvfrbgeatdeypqcrv`
→ Check: You're logged in as owner
→ Retry after 30 seconds

**Vercel build fails?**
→ Check: Root directory is `figma-export`
→ Check: Environment variables set
→ Redeploy from Vercel dashboard

**DNS not working?**
→ Wait 15-30 minutes
→ Clear DNS: `ipconfig /flushdns`
→ Check nameservers in registrar

**Link doesn't load?**
→ Wait 2 minutes for cache
→ Open in incognito window
→ Check: link slug is correct

---

## ✅ VERIFICATION COMMANDS

**Database ready?**
```sql
SELECT COUNT(*) FROM public.smart_links;
```

**Website loads?**
```bash
curl -I https://gwmusic.com.ng
```

**API working?**
```bash
curl https://gwmusic.com.ng/make-server-79198001/health
```

**Link works?**
```bash
curl https://gwmusic.com.ng/make-server-79198001/smart-links/your-slug
```

---

## 🎉 SUCCESS INDICATORS

- ✅ Website loads in < 3 seconds
- ✅ Dashboard accessible
- ✅ Can create smart link
- ✅ Public link works
- ✅ Analytics show views/clicks
- ✅ HTTPS working
- ✅ No console errors
- ✅ Works on mobile

---

## 📞 QUICK HELP

**Stuck?** Open:
→ VERCEL_DEPLOYMENT_RUNBOOK.md

**Need commands?** Open:
→ DEPLOYMENT_COMMAND_REFERENCE.md

**Want to test?** Open:
→ DEPLOYMENT_TESTING_GUIDE.md

**Complete overview?** Open:
→ DEPLOYMENT_READY_SUMMARY.md

---

## 🚀 GO LIVE CHECKLIST

- [ ] All 4 steps completed
- [ ] All verification commands passed
- [ ] Website loads
- [ ] Create link works
- [ ] Public link works
- [ ] Analytics working
- [ ] Tests passing
- [ ] No errors in logs

**IF ALL CHECKED → YOU'RE LIVE! 🎉**

---

## ⏰ TIMING

**Start Time:** ______________

**Expected Finish:** 45 minutes later

**Actual Finish:** ______________

**Status:** ✅ LIVE / ⏳ IN PROGRESS / ❌ NEEDS HELP

---

**Print this card and keep it handy while deploying!**

**Questions? Check the full guides - everything is documented!** 📚
