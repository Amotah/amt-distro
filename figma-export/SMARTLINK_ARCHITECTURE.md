# AMTDistro Smart Link Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARTIST WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Upload Release                                                      │
│     ├─ Title: "My Song"                                                 │
│     ├─ Artist: "Artist Name"                                            │
│     ├─ Cover: artwork.jpg                                               │
│     └─ Generate ISRC/UPC                                                │
│                 ↓                                                       │
│  2. Distribute to DSPs                                                   │
│     ├─ Spotify ────────→ Spotify URL                                    │
│     ├─ Boomplay ───────→ Boomplay URL                                   │
│     ├─ Audiomack ──────→ Audiomack URL                                  │
│     └─ [10+ more] ─────→ [Their URLs]                                   │
│                 ↓                                                       │
│  3. Collect DSP URLs                                                     │
│     └─ POST /releases/:id/dsp-urls                                      │
│        ├─ Save to database                                              │
│        └─ Set status: active                                            │
│                 ↓                                                       │
│  4. Generate Smart Link                                                  │
│     └─ /s/artist-my-song                                                │
│        └─ Share on socials                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  release_dsp_urls (PostgreSQL)                                           │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ id (UUID)                                                    │       │
│  │ release_id (FK) ──────────→ releases.id                     │       │
│  │ user_id (FK) ─────────────→ auth.users.id                  │       │
│  │ release_title                                                │       │
│  │ artist_name                                                  │       │
│  │ cover_art_url                                                │       │
│  ├──────────────────────────────────────────────────────────────┤       │
│  │ Platforms (TEXT URLs):                                      │       │
│  ├──────────────────────────────────────────────────────────────┤       │
│  │ AFRICA PRIORITY:                                             │       │
│  │   ├─ boomplay_url           (🎵 #1 in Africa)              │       │
│  │   └─ audiomack_url          (🔊 Hip-hop hub)               │       │
│  ├──────────────────────────────────────────────────────────────┤       │
│  │ GLOBAL:                                                      │       │
│  │   ├─ youtube_music_url      (▶️ Video + audio)             │       │
│  │   ├─ spotify_url            (🎧 Global leader)             │       │
│  │   ├─ apple_music_url        (🍎 Premium)                   │       │
│  │   ├─ amazon_music_url       (📦 Prime)                     │       │
│  │   ├─ deezer_url             (📻 Europe)                    │       │
│  │   ├─ tidal_url              (🌊 Hi-Fi)                     │       │
│  │   ├─ bandcamp_url           (🎹 Independent)               │       │
│  │   └─ soundcloud_url         (☁️ Community)                 │       │
│  ├──────────────────────────────────────────────────────────────┤       │
│  │ REGIONAL:                                                    │       │
│  │   ├─ anghami_url            (🎼 MENA)                      │       │
│  │   ├─ jio_saavn_url          (💎 South Asia)                │       │
│  │   └─ pimp_url               (👑 African)                   │       │
│  ├──────────────────────────────────────────────────────────────┤       │
│  │ is_active: BOOLEAN                                           │       │
│  │ distribution_status: pending|processing|completed|failed    │       │
│  │ created_at, updated_at                                       │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Indexes:                                                                │
│    idx_release_id → Fast lookup by release                             │
│    idx_user_id → User's releases                                        │
│    idx_user_release → Compound queries                                  │
│    idx_is_active → Filter active links                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  release-dsp-service.tsx (Service Layer)                                 │
│  ├─ upsertReleaseDSPUrls()                                               │
│  │  └─ Saves DSP URLs to database                                       │
│  │                                                                       │
│  ├─ getReleaseDSPUrls()                                                  │
│  │  └─ Fetches URLs for landing page                                    │
│  │                                                                       │
│  ├─ getUserReleaseDSPUrls()                                              │
│  │  └─ Lists user's releases (dashboard)                                │
│  │                                                                       │
│  ├─ updateDistributionStatus()                                           │
│  │  └─ Tracks DSP distribution state                                    │
│  │                                                                       │
│  └─ deactivateReleaseDSPUrls()                                           │
│     └─ Removes live link                                                │
│                                                                         │
│  API Endpoints (index.tsx):                                              │
│  ├─ POST   /releases/:releaseId/dsp-urls ─────→ [Auth] Save URLs       │
│  ├─ GET    /releases/:releaseId/dsp-urls ─────→ [Public] Fetch URLs    │
│  ├─ GET    /user/:userId/releases/dsp-urls ──→ [Auth] User's releases  │
│  └─ POST   /releases/:releaseId/dsp-urls/deactivate → [Auth] Deactivate│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    LISTENER FLOW (User Journey)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Listener clicks:                                                        │
│     https://amtdistro.link/s/artist-my-song                            │
│                 ↓                                                       │
│  Browser detects "/s/" slug pattern                                     │
│                 ↓                                                       │
│  App renders SmartLinkLandingPage                                       │
│                 ↓                                                       │
│  Fetch: GET /releases/:releaseId/dsp-urls (public)                     │
│                 ↓                                                       │
│  Display platforms in Africa-first order:                               │
│     ┌───────────────────────────────────────┐                           │
│     │ 🌍 African Platforms                  │                           │
│     │  🎵 Boomplay      [▶ CLICK]          │                           │
│     │  🔊 Audiomack     [▶ CLICK]          │                           │
│     │  👑 PIMP          [▶ CLICK]          │                           │
│     ├───────────────────────────────────────┤                           │
│     │ 🌐 Global Platforms                   │                           │
│     │  ▶️  YouTube Music [▶ CLICK]          │                           │
│     │  🎧 Spotify       [▶ CLICK]          │                           │
│     │  🍎 Apple Music   [▶ CLICK]          │                           │
│     │  📦 Amazon Music  [▶ CLICK]          │                           │
│     │  📻 Deezer        [▶ CLICK]          │                           │
│     │  🌊 TIDAL         [▶ CLICK]          │                           │
│     │  🎹 Bandcamp      [▶ CLICK]          │                           │
│     │  ☁️  SoundCloud    [▶ CLICK]          │                           │
│     ├───────────────────────────────────────┤                           │
│     │ 📍 Regional Platforms                 │                           │
│     │  🎼 Anghami       [▶ CLICK]          │                           │
│     │  💎 JioSaavn      [▶ CLICK]          │                           │
│     └───────────────────────────────────────┘                           │
│                 ↓                                                       │
│  Listener clicks platform (e.g., Boomplay)                             │
│                 ↓                                                       │
│  Record click event:                                                     │
│     POST /smart-links/click                                             │
│     ├─ platform: "boomplay"                                             │
│     ├─ device: "mobile"                                                 │
│     ├─ os: "iOS"                                                        │
│     ├─ country: "NG" (Nigeria)                                          │
│     └─ referrer: "instagram.com"                                        │
│                 ↓                                                       │
│  Stored in database                                                      │
│                 ↓                                                       │
│  Redirect: window.location.replace(boomplayUrl)                         │
│                 ↓                                                       │
│  Listener on Boomplay app/web 🎵                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      ANALYTICS DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Smart Link Metrics:                                                     │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Total Clicks: 1,247                                          │       │
│  │ Unique Devices: 834                                          │       │
│  │                                                              │       │
│  │ Top Platforms:                                               │       │
│  │   Boomplay    ████████████ 387 (31%) 🇳🇬                      │       │
│  │   Spotify     ██████████   298 (24%)                         │       │
│  │   Audiomack   ████████     214 (17%) 🇳🇬                      │       │
│  │   Apple       █████        124 (10%)                         │       │
│  │   YouTube     ████         102 (8%)                          │       │
│  │   Others      █████        122 (10%)                         │       │
│  │                                                              │       │
│  │ Device Breakdown:                                            │       │
│  │   Mobile:  76% ███████████████████████                      │       │
│  │   Desktop: 17% ████                                         │       │
│  │   Tablet:  7%  ██                                           │       │
│  │                                                              │       │
│  │ Geographic:                                                  │       │
│  │   🇳🇬 Nigeria:       412 clicks (33%)                        │       │
│  │   🇰🇪 Kenya:         201 clicks (16%)                        │       │
│  │   🇬🇭 Ghana:         156 clicks (13%)                        │       │
│  │   🇿🇦 South Africa:  134 clicks (11%)                        │       │
│  │   🌍 Other:         344 clicks (27%)                        │       │
│  │                                                              │       │
│  │ Referrer Sources:                                            │       │
│  │   instagram.com: 412 clicks (33%)                            │       │
│  │   twitter.com:   298 clicks (24%)                            │       │
│  │   tiktok.com:    156 clicks (13%)                            │       │
│  │   Direct:        214 clicks (17%)                            │       │
│  │   Other:         167 clicks (13%)                            │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Time Series:                                                            │
│  Clicks  │ *                                                             │
│          │ * *                                                           │
│          │ * * *     *                                                   │
│          │ * * * * * * *                                                 │
│  ────────┼─────────────────→ Days                                       │
│          Mon Tue Wed Thu Fri Sat Sun                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Component Hierarchy

```
App.tsx
├─ Route Detection
│  ├─ extractSmartLinkSlugFromPathname()
│  └─ If /s/* → render SmartLinkLandingPage
│
└─ SmartLinkLandingPage
   ├─ Header
   │  ├─ Logo
   │  └─ "Africa's Music Distribution"
   ├─ Release Info
   │  ├─ Cover Art Image
   │  ├─ Release Title
   │  ├─ Artist Name
   │  └─ Description
   ├─ Action Buttons
   │  ├─ Copy Link
   │  └─ Share (native)
   └─ Platforms Grid
      ├─ African Section 🌍
      │  ├─ PlatformCard (Boomplay)
      │  ├─ PlatformCard (Audiomack)
      │  └─ PlatformCard (PIMP)
      ├─ Global Section 🌐
      │  ├─ PlatformCard (YouTube Music)
      │  ├─ PlatformCard (Spotify)
      │  ├─ PlatformCard (Apple Music)
      │  ├─ PlatformCard (Amazon Music)
      │  ├─ PlatformCard (Deezer)
      │  ├─ PlatformCard (TIDAL)
      │  ├─ PlatformCard (Bandcamp)
      │  └─ PlatformCard (SoundCloud)
      └─ Regional Section 📍
         ├─ PlatformCard (Anghami)
         └─ PlatformCard (JioSaavn)

PlatformCard (Reusable)
├─ On Hover:
│  ├─ Scale up (1.05)
│  ├─ Show platform gradient
│  └─ Highlight text
├─ On Click:
│  ├─ Track click event
│  ├─ Set clicked state
│  ├─ Show checkmark
│  └─ Redirect after 100ms
└─ Visual States:
   ├─ Default: White/10 bg, white/10 border
   ├─ Hover: White/10 bg, white/30 border, gradient opacity
   ├─ Active: Platform gradient bg, full opacity
   └─ Visited: Dimmed gradient, checkmark icon
```

---

## Data Flow Diagram

```
ARTIST
  │
  ├─→ [POST] /releases/:id/dsp-urls
  │        ├─ releaseTitle
  │        ├─ artistName
  │        ├─ coverArtUrl
  │        └─ urls: { spotify, boomplay, ... }
  │   ↓
  └─→ release-dsp-service.upsertReleaseDSPUrls()
       │
       └─→ DATABASE: release_dsp_urls
           ├─ release_id
           ├─ user_id
           ├─ [13 platform URLs]
           ├─ is_active: true
           └─ distribution_status: completed


LISTENER
  │
  ├─→ Visit: https://amtdistro.link/s/artist-song
  │   ↓
  ├─→ App detects "/s/" pattern
  │   ↓
  ├─→ Render SmartLinkLandingPage
  │   ├─→ [GET] /releases/:id/dsp-urls (PUBLIC)
  │   │   ↓
  │   ├─→ release-dsp-service.getReleaseDSPUrls()
  │   │   ├─→ DATABASE: release_dsp_urls
  │   │   └─→ Return: { releaseTitle, artistName, urls, ... }
  │   │   ↓
  │   ├─→ Display platforms in Africa-first order
  │   │
  │   └─→ User clicks platform (e.g., Boomplay)
  │       ├─→ [POST] /smart-links/click
  │       │   ├─ platform: "boomplay"
  │       │   ├─ device: "mobile"
  │       │   ├─ os: "iOS"
  │       │   └─ country: "NG"
  │       │   ↓
  │       ├─→ DATABASE: smart_link_click_events
  │       │   └─ Record saved
  │       │
  │       └─→ window.location.replace(boomplayUrl)
  │           ↓
  │           BOOMPLAY 🎵


ANALYTICS
  │
  ├─→ [GET] /smart-links/:linkId/analytics
  │   ↓
  ├─→ smart-links-service.getSmartLinkAnalytics()
  │   │
  │   ├─→ DATABASE: smart_link_click_events
  │   │   ├─ Aggregate by platform
  │   │   ├─ Group by device
  │   │   ├─ Group by OS
  │   │   ├─ Group by country
  │   │   ├─ Group by referrer
  │   │   └─ Calculate time series
  │   │   ↓
  │   └─→ Return: {
  │       totalClicks,
  │       uniqueDevices,
  │       trend: [ { date, clicks, unique } ],
  │       platforms: [ { name, clicks, percentage } ],
  │       countries: [ { country, clicks, percentage } ],
  │       devices: [ { device, percentage } ],
  │       referrers: [ { referrer, clicks } ]
  │       }
  │       ↓
  └─→ DASHBOARD: Display analytics charts
```

---

## Security & Access Control

```
PUBLIC ENDPOINTS (No Auth)
├─ GET /releases/:releaseId/dsp-urls
│  └─ Returns data if: is_active = true
│  └─ Anyone can access
│
└─ GET / (landing page)
   └─ Renders SmartLinkLandingPage
   └─ Public access


AUTHENTICATED ENDPOINTS (Requires Auth)
├─ POST /releases/:releaseId/dsp-urls
│  └─ Requires: auth.uid() = user_id
│  └─ Creates/updates DSP URLs
│
├─ GET /user/:userId/releases/dsp-urls
│  └─ Requires: auth.uid() = :userId
│  └─ Lists user's releases
│
└─ POST /releases/:releaseId/dsp-urls/deactivate
   └─ Requires: auth.uid() = owner
   └─ Deactivates link


DATABASE RLS POLICIES
├─ SELECT
│  ├─ If auth.uid() = user_id → See own
│  └─ If is_active = true → Public read
│
├─ INSERT
│  └─ If auth.uid() = user_id → Create own only
│
├─ UPDATE
│  └─ If auth.uid() = user_id → Update own only
│
└─ DELETE
   └─ If auth.uid() = user_id → Delete own only
```

---

## Error Handling Flow

```
USER ACTION
  │
  ├─→ Create Smart Link
  │   ├─ Validation ──→ Slug taken? ──→ Show error
  │   ├─ API call ──→ Network error? ──→ Retry
  │   └─ Success ──→ Show generated link
  │
  ├─→ Visit Landing Page
  │   ├─ URL parse error ──→ Show 404
  │   ├─ Fetch DSP URLs ──→ 404? ──→ Show "Link expired"
  │   ├─ Render complete ──→ Display platforms
  │   └─ Click platform ──→ Redirect
  │
  └─→ View Analytics
      ├─ Auth missing ──→ Redirect to login
      ├─ Unauthorized ──→ Show "Access denied"
      └─ Fetch analytics ──→ Display dashboard
```

This architecture ensures:
- ✅ Scalability (indexed queries, partitioned data)
- ✅ Security (RLS, auth validation, type safety)
- ✅ Performance (caching, lazy loading, CDN)
- ✅ Reliability (error handling, retry logic)
- ✅ User Experience (Africa-first prioritization, responsive design)
