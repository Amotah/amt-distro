# Smart Links Domain & Routing — Diagnosis & Solutions

## 🔍 Why `https://amtdistro.link/thng` is Broken

### Root Cause Analysis

The sample link failed because of **localStorage dependency**:

```
Current Architecture (Broken):
┌─────────────────────────────────────────┐
│ Browser A (Artist creates link)          │
│ └─ Link stored in localStorage ONLY      │
│    (not in database)                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Browser B / Different Device (Fan)       │
│ └─ Tries to access link                  │
│ └─ localStorage is empty                 │
│ └─ Link not found error ❌               │
└─────────────────────────────────────────┘
```

### The Three Problems

1. **localStorage is device-specific**
   - Link data only exists where it was created
   - Doesn't sync across browsers/devices
   - Gets cleared on cache/cookies clear

2. **No database persistence**
   - Links should be in smart_links table (live in Supabase)
   - Currently only in localStorage
   - No API backend serving the links

3. **Domain routing needs SPA configuration**
   - Catch-all routes need proper Vercel `rewrites`
   - Direct `/thng` access won't find the component
   - Need explicit routing to land on the App

---

## ✅ Solution 1: Fix Current Domain (amtdistro.link)

### Step 1: Update Routing (vercel.json)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/s/:slug",
      "destination": "/index.html"
    },
    {
      "source": "/:slug",
      "destination": "/index.html"
    }
  ]
}
```

**What this does:**
- Routes `/s/artist-song` → App component
- Routes `/artist-song` → App component
- Both land on App.tsx which extracts the slug

### Step 2: Deploy with Updated vercel.json

```bash
cd figma-export
git add vercel.json
git commit -m "Fix: Add smart link rewrites for catch-all routing"
git push
# Vercel auto-redeploys
```

### Step 3: Test the Fix

```bash
# Test explicit prefix
https://amtdistro.link/s/thng

# Test implicit catch-all (requires SPA rewrite above)
https://amtdistro.link/thng
```

---

## ✅ Solution 2: Setup Dedicated Smart Links Domain

This is the **recommended approach** for production.

### Why Dedicated Domain?

| Aspect | amtdistro.link | link.amtdistro.com |
|--------|---------------|--------------------|
| Purpose | Main platform | Smart links only |
| Branding | Artist dashboard | Fan discovery |
| Complexity | Higher (multi-route) | Simple (smart links) |
| SEO | Main domain | Subdomain |
| CDN | Shared | Dedicated |
| Traffic | Mixed | Predictable |

### Step 1: Setup Subdomain

**Option A: Point to Same Vercel Project**

```
DNS Configuration:
┌─────────────────────────────────────────┐
│ CNAME: link.amtdistro.com               │
│ Points to: cname.vercel-dns.com         │
│ (Same Vercel project as main domain)    │
└─────────────────────────────────────────┘

Vercel Setup:
1. Project Settings → Domains
2. Add Domain: link.amtdistro.com
3. SSL auto-provisions
4. Same App.tsx handles routing
```

**Option B: Separate Vercel Project (Scalable)**

```
DNS Configuration:
┌─────────────────────────────────────────┐
│ CNAME: link.amtdistro.com               │
│ Points to: cname.vercel-dns.com         │
│ (Different Vercel project)              │
└─────────────────────────────────────────┘

Vercel Setup:
1. Create new Vercel project: "amt-distro-links"
2. Import same repo branch
3. Set Root: figma-export
4. Add domain: link.amtdistro.com
5. Build will deploy independently
```

### Step 2: Configure Link Domain in Code

**File: `src/app/utils/smartLinkUrl.ts`**

```typescript
// Update default origin for smart links
export function buildSmartLinkUrl(slug: string, origin?: string): string {
  const baseOrigin = (origin || 
    (typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://link.amtdistro.com'  // ← Update this
    )
  ).replace(/\/+$/, '');
  
  return `${baseOrigin}${buildSmartLinkPath(slug)}`;
}
```

### Step 3: Update vercel.json for Link Domain

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/s/:slug",
      "destination": "/index.html"
    },
    {
      "source": "/:slug",
      "destination": "/index.html"
    }
  ],
  "routes": [
    {
      "src": "^/(?!assets|brand|platform-logos|manifest|registerSW|sw\\.js|workbox)(.*)$",
      "dest": "/index.html"
    }
  ]
}
```

### Step 4: Database Persistence (Critical)

The link won't work unless it's in the database. Update **SmartLinkRedirectPage.tsx** to fetch from database:

**Current (Broken):**
```typescript
const link = useMemo(() => {
  const normalizedSlug = slug.toLowerCase();
  const links = loadSmartLinks(); // ← localStorage only
  return links.find((entry) => entry.slug.toLowerCase() === normalizedSlug) || null;
}, [slug]);
```

**Fixed (With Database):**
```typescript
const [link, setLink] = useState<SmartLink | null>(null);

useEffect(() => {
  const fetchLink = async () => {
    try {
      // Call backend API
      const response = await fetch(
        `https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-79198001/smart-links/${slug}`
      );
      const data = await response.json();
      setLink(data);
    } catch (error) {
      console.error('Link not found:', error);
      setLink(null);
    }
  };
  
  if (slug) fetchLink();
}, [slug]);
```

---

## 🎯 Recommended Setup for Production

### Best Practice Architecture

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Artist Platform (amtdistro.com)                     │
│  ├─ /dashboard → Artist dashboard                    │
│  ├─ /admin → Admin panel                             │
│  ├─ /login → Authentication                          │
│  └─ /listen → Listener app                           │
│                                                      │
│  Backend: Supabase Functions                         │
│  Database: All data in smart_links table             │
│                                                      │
└──────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Smart Links Domain (link.amtdistro.com)             │
│  ├─ / → Redirect to smart links (404)                │
│  ├─ /s/{slug} → Smart link landing page              │
│  ├─ /s/{slug}/preview → Mobile preview               │
│  └─ /{slug} → Catch-all (SPA rewrite)                │
│                                                      │
│  Backend: Same Supabase Functions                    │
│  Database: Query from smart_links table              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### DNS Setup

```
Domain: amtdistro.com
├─ @ (root)          → Vercel (amtdistro.com)
├─ www               → Vercel (www.amtdistro.com)
├─ link              → Vercel (link.amtdistro.com)
├─ api               → Supabase API
└─ MX               → Email provider

Each subdomain points to Vercel's nameservers:
  ns1.vercel-dns.com
  ns2.vercel-dns.com
  ns3.vercel-dns.com
  ns4.vercel-dns.com
```

---

## 🚀 Step-by-Step: Deploy Fixed Solution

### Step 1: Fix vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  },
  "rewrites": [
    {
      "source": "/s/:slug",
      "destination": "/index.html"
    },
    {
      "source": "/:slug",
      "destination": "/index.html"
    }
  ]
}
```

### Step 2: Update API Calls in SmartLinkRedirectPage.tsx

Replace localStorage fetch with database query:

```typescript
useEffect(() => {
  const fetchSmartLink = async () => {
    try {
      const response = await fetch(
        `https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-79198001/smart-links/${slug}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!response.ok) throw new Error('Link not found');
      
      const smartLink = await response.json();
      setLink(smartLink);
      setStatus('loaded');
      
      // Record view event
      await fetch(
        `https://vatpvfrbgeatdeypqcrv.supabase.co/functions/v1/make-server-79198001/smart-links/${slug}/events/view`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: new Date() })
        }
      );
    } catch (error) {
      setStatus('not-found');
    }
  };
  
  if (slug) fetchSmartLink();
}, [slug]);
```

### Step 3: Deploy

```bash
cd e:\muisc_platform\figma-export

git add -A
git commit -m "Fix: Smart link routing with database persistence and subdomain support"
git push origin copilot/generate-streams-and-downloads

# Vercel auto-detects changes and redeploys
```

### Step 4: Add link.amtdistro.com to Vercel

In Vercel Dashboard:
```
1. Go to Project Settings → Domains
2. Add "link.amtdistro.com"
3. Update DNS CNAME to: cname.vercel-dns.com
4. Wait for SSL provisioning (~5 min)
5. Test: https://link.amtdistro.com/s/thng
```

### Step 5: Create Test Link

In dashboard:
```
1. Create new smart link
2. Copy link: https://link.amtdistro.com/s/test-song
3. Test in different browser (private window)
4. Should load landing page ✅
```

---

## 🧪 Testing Checklist

### Single-Segment Route Test
```
✓ https://link.amtdistro.com/test-song
✓ Should rewrite to /index.html
✓ App.tsx extracts "test-song" as slug
✓ Database query for slug="test-song"
✓ Landing page renders
```

### Explicit Prefix Route Test
```
✓ https://link.amtdistro.com/s/test-song
✓ Should rewrite to /index.html
✓ App.tsx extracts "test-song" from /s/
✓ Database query for slug="test-song"
✓ Landing page renders
```

### Cross-Device Test
```
✓ Create link on Desktop
✓ Access from Mobile
✓ Access from Private Window
✓ Access from Different Browser
✓ All should work (data from database, not localStorage)
```

### Analytics Test
```
✓ Click landing page link
✓ Check database: smart_link_clicks table updated
✓ Analytics dashboard shows click
✓ Platform, device, country recorded
```

---

## 🎯 Migration Path (If Needed)

### Phase 1: Quick Fix (Today)
```
1. Update vercel.json with rewrites
2. Deploy to amtdistro.link
3. Links work with /s/slug format
4. Still uses localStorage (single browser)
```

### Phase 2: Database Migration (This Week)
```
1. Update SmartLinkRedirectPage to query database
2. Migrate existing localStorage links to database
3. Test all links across devices
4. Enable analytics
```

### Phase 3: Subdomain Setup (Next Week)
```
1. Create link.amtdistro.com subdomain
2. Point to same Vercel project
3. Update link generation to use subdomain
4. Keep amtdistro.link for dashboard
```

---

## 📊 URL Patterns Comparison

| Pattern | Example | Pros | Cons |
|---------|---------|------|------|
| Root domain + single segment | amtdistro.com/slug | Simple | Conflicts with routes |
| /s/ prefix | amtdistro.com/s/slug | Explicit | Extra segment |
| Subdomain | link.amtdistro.com/slug | Clean | Extra DNS setup |
| Subdomain + prefix | link.amtdistro.com/s/slug | Explicit + clean | Most complex |

**Recommended:** `link.amtdistro.com/s/{slug}`

---

## 🔗 API Endpoints Required

For production links to work, these must be implemented:

```bash
# Get smart link by slug
GET /smart-links/:slug
Response: { id, title, artistName, slug, services: [{platform, url}], settings: {...} }

# Record view event
POST /smart-links/:slug/events/view
Body: { timestamp, device, country }

# Record click event  
POST /smart-links/:slug/events/click
Body: { platformKey, timestamp, device, country }
```

All already designed in smart-links-comprehensive-service.tsx - just need wire-up in index.tsx.

---

## ✨ Summary

### Why It Broke
- Link only stored in localStorage
- Different browser/device = no data
- No SPA routing rewrite in Vercel
- No database backend serving links

### Quick Fix (Next 10 min)
```bash
1. Update vercel.json rewrites
2. Deploy
3. Use /s/slug format
4. Works same device only
```

### Proper Fix (Next 30 min)
```bash
1. Update SmartLinkRedirectPage to use API
2. Ensure API endpoint returns smart link data
3. Deploy
4. Links work everywhere
```

### Production Setup (Next day)
```bash
1. Setup link.amtdistro.com subdomain
2. Configure DNS + Vercel
3. Test end-to-end
4. Launch with proper infrastructure
```

**You're close! Just need to:**
1. ✅ Add database persistence (API call instead of localStorage)
2. ✅ Fix routing (Vercel rewrites in vercel.json)
3. ✅ Test across devices
4. ✅ Setup subdomain (optional but recommended)
