# AMTDistro Smart Links / Music FanLink System — Complete Implementation

## 📋 System Overview

A comprehensive music distribution smart-link platform inspired by ToneDen, Odesli/Songlink, Feature.fm, Linkfire, and Promoly—but built exclusively for AMTDistro with original branding and Africa-first platform prioritization.

### What It Does

**Artist Flow:**
1. Artist enters ISRC, UPC, Spotify URL, Apple Music URL, YouTube Music URL, or selects existing release
2. System auto-resolves release metadata from AMTDistro database or external providers
3. System identifies available DSP URLs
4. Artist creates beautiful landing page with customizable branding
5. System generates shareable link: `link.amtdistro.com/artist/release-title`
6. Artist gets QR code, analytics, and sharing tools

**Listener Flow:**
1. Listener clicks smart link
2. Landing page displays all available platforms (Africa-first ordering)
3. Listener clicks preferred platform
4. Click tracked and recorded
5. Listener redirected to DSP

**Artist Dashboard:**
1. View all smart links with metadata
2. See analytics (views, clicks, CTR, by platform/country/device)
3. Customize landing page (theme, buttons, social links)
4. Manage platforms (enable/disable, reorder)
5. QR code generation
6. Link sharing and copying

---

## 🗄️ Database Schema

### `smart_links` Table
Core metadata for each smart link.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | Artist/label owner |
| release_id | UUID | Reference to releases table |
| title | TEXT | Release title |
| artist_name | TEXT | Artist name |
| slug | TEXT UNIQUE | URL slug (e.g., tope-banjo-my-victory) |
| link_type | TEXT | 'standard' or 'presave' |
| description | TEXT | Optional description |
| isrc | TEXT | International Standard Recording Code |
| upc | TEXT | Universal Product Code |
| artwork_url | TEXT | Cover art URL |
| status | TEXT | active, draft, expired, presave |
| is_public | BOOLEAN | Public visibility |
| total_views | INTEGER | Landing page views |
| total_clicks | INTEGER | Platform clicks |
| presave_release_date | DATE | For pre-save links |
| presave_enabled | BOOLEAN | Enable pre-save |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |
| published_at | TIMESTAMPTZ | Publish timestamp |

**Indexes:** user_id, release_id, slug, status, isrc, upc, created_at

**RLS Policies:**
- Users view own smart links
- Public views active smart links
- Users create/update/delete own only

---

### `smart_link_services` Table
Individual platform URLs and performance metrics.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| smart_link_id | UUID | References smart_links |
| platform_key | TEXT | spotify, apple_music, etc. |
| platform_name | TEXT | Display name |
| platform_url | TEXT | Direct URL to track/album |
| platform_id | TEXT | DSP's internal ID |
| icon_url | TEXT | Platform logo/icon |
| display_name | TEXT | Custom display name |
| display_order | INTEGER | Sort order |
| enabled | BOOLEAN | Show/hide platform |
| click_count | INTEGER | Total clicks on this platform |
| view_count | INTEGER | Views of this platform option |
| last_clicked_at | TIMESTAMPTZ | Last click timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

**Unique Constraint:** (smart_link_id, platform_key)

**Indexes:** smart_link_id, platform_key, enabled, display_order

**RLS Policies:**
- Users manage services for own smart links
- Public views services for active smart links

---

### `platform_directory` Table
Master list of supported platforms with configuration.

| Column | Type | Purpose |
|--------|------|---------|
| platform_key | TEXT UNIQUE | Internal key (spotify, boomplay, etc.) |
| platform_name | TEXT | Display name |
| logo_url | TEXT | Logo image |
| brand_color | TEXT | Hex color for UI |
| enabled | BOOLEAN | Available for selection |
| is_featured | BOOLEAN | Prominently featured |
| default_order_global | INTEGER | Global ordering |
| default_order_africa | INTEGER | Africa-specific ordering |
| default_order_nigeria | INTEGER | Nigeria-specific ordering |
| category | TEXT | streaming, social, download, video |
| regions_supported | TEXT[] | Supported countries |
| supports_pre_save | BOOLEAN | Can pre-save |
| requires_isrc | BOOLEAN | Needs ISRC |
| requires_upc | BOOLEAN | Needs UPC |

**Data:** 20+ platforms pre-configured

**Africa-First Ordering:**
1. Boomplay
2. Audiomack
3. PIMP
4. YouTube Music
5. Spotify
6. Apple Music
... (etc.)

---

### `smart_link_settings` Table
Customization and branding options per smart link.

| Column | Type | Purpose |
|--------|------|---------|
| smart_link_id | UUID | References smart_links (unique) |
| theme | TEXT | light, dark, custom |
| background_color | TEXT | Hex color |
| background_image_url | TEXT | Optional background image |
| button_style | TEXT | pill, rounded, square |
| button_color | TEXT | Hex color |
| button_hover_effect | TEXT | scale, glow, shadow |
| show_artist_bio | BOOLEAN | Display artist bio |
| show_cover_art | BOOLEAN | Display cover art |
| show_amtdistro_branding | BOOLEAN | Show AMTDistro logo |
| show_release_info | BOOLEAN | Display metadata |
| show_share_buttons | BOOLEAN | Enable sharing |
| show_social_links | BOOLEAN | Display social icons |
| social_links | JSONB | {"instagram": "...", "twitter": "..."} |
| artist_profile_url | TEXT | Link to artist profile |
| custom_css | TEXT | Custom CSS (paid only) |
| custom_domain | TEXT UNIQUE | Custom domain (paid only) |
| remove_branding | BOOLEAN | Remove AMTDistro branding (paid) |

**RLS Policies:** Users manage settings for own smart links

---

### `smart_link_clicks` Table
Existing table - Click analytics with metadata.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| link_id | TEXT | References smart_link slug or ID |
| user_id | UUID | Artist who owns the link |
| platform | TEXT | Which platform was clicked |
| device_type | TEXT | mobile, tablet, desktop |
| os | TEXT | iOS, Android, Windows, macOS, Linux |
| country | TEXT | Country code (geolocation) |
| referrer | TEXT | Where link was shared from |
| created_at | TIMESTAMPTZ | Click timestamp |

**Indexes:** link_id, user_id, created_at

---

## 🔧 Backend Services

### `metadata-resolution-service.tsx`

**Purpose:** Resolve release metadata from multiple sources.

**Provider Architecture:**
```
MetadataResolutionService (coordinator)
  ├─ AMTDistroProvider (AMTDistro database) - Priority 100
  ├─ ExternalProviderAdapter (Spotify, Apple Music, etc.) - Priority 50
  └─ Future providers
```

**Methods:**
- `resolveByISRC(isrc)` → MetadataResolution
- `resolveByUPC(upc)` → MetadataResolution
- `resolveByURL(url)` → MetadataResolution

**Returns:**
```typescript
{
  matched: boolean,
  artist?: string,
  title?: string,
  releaseType?: 'single' | 'ep' | 'album',
  artworkUrl?: string,
  isrc?: string,
  upc?: string,
  releaseDate?: string,
  label?: string,
  genre?: string,
  services?: [
    { platform: 'spotify', url: 'https://...' },
    { platform: 'apple_music', url: 'https://...' },
    // etc.
  ]
}
```

**Key Features:**
- First searches AMTDistro database
- Falls back to external providers
- Extensible provider interface
- Error handling and logging
- Caching ready

---

### `smart-links-comprehensive-service.tsx`

**Purpose:** Core smart link CRUD operations and settings management.

**Functions:**

```typescript
// Smart Link Management
createSmartLink(userId, data)
getSmartLinkBySlug(slug) // Public access
getUserSmartLinks(userId)
updateSmartLink(id, userId, updates)
deleteSmartLink(id, userId)

// Service (Platform) Management
addSmartLinkService(smartLinkId, userId, data)
getSmartLinkServices(smartLinkId)
updateSmartLinkService(serviceId, smartLinkId, userId, updates)
deleteSmartLinkService(serviceId, smartLinkId, userId)

// Settings Management
getOrCreateSmartLinkSettings(smartLinkId, userId)
updateSmartLinkSettings(smartLinkId, userId, updates)

// Analytics
incrementSmartLinkViews(smartLinkId)
incrementServiceClicks(serviceId, smartLinkId)
```

**Security:** All operations enforce RLS via database policies

---

## 🔌 API Endpoints

### Smart Link Management

**POST `/api/smart-links`**
- Create a new smart link
- Auth: Required
- Body: `{ title, artistName, slug, dspUrls, ... }`

**GET `/api/smart-links`**
- List user's smart links
- Auth: Required
- Query params: `{ search, status, type, limit, offset }`

**GET `/api/smart-links/:slug`**
- Get smart link by slug (public)
- Auth: Not required
- Returns: Link metadata + services

**PATCH `/api/smart-links/:id`**
- Update smart link
- Auth: Required (owner only)
- Body: Partial smart link data

**DELETE `/api/smart-links/:id`**
- Delete smart link
- Auth: Required (owner only)

### Metadata Resolution

**POST `/api/smart-links/resolve`**
- Resolve release by ISRC, UPC, or URL
- Auth: Optional (rate-limited if not auth)
- Body: `{ isrc? | upc? | url? }`
- Returns: MetadataResolution

### Platform Services

**POST `/api/smart-links/:id/services`**
- Add DSP URL to smart link
- Auth: Required (owner)
- Body: `{ platformKey, platformUrl, displayOrder }`

**PATCH `/api/smart-links/:id/services/:serviceId`**
- Update platform service
- Auth: Required (owner)
- Body: Partial service data

**DELETE `/api/smart-links/:id/services/:serviceId`**
- Remove platform
- Auth: Required (owner)

### Settings & Customization

**GET `/api/smart-links/:id/settings`**
- Get customization settings
- Auth: Required (owner)

**PATCH `/api/smart-links/:id/settings`**
- Update customization
- Auth: Required (owner)
- Body: Partial settings data

### Analytics

**GET `/api/smart-links/:id/analytics`**
- Get analytics for smart link
- Auth: Required (owner)
- Query params: `{ range: '7days' | '30days' | '90days' }`
- Returns: Views, clicks, platforms, countries, devices, referrers

**POST `/api/smart-links/:id/events`**
- Record click event
- Auth: Optional
- Body: `{ serviceId, country?, referrer?, deviceType, os }`

---

## 🎨 Frontend Components

### Smart Links Dashboard

**Path:** `/dashboard/smart-links`

**Views:**
1. **All Smart Links** — List view with filters
   - Search by title/artist
   - Filter: All, Singles, EPs, Albums, Active, Draft, Pre-save
   - Sort: Newest, Most Views, Most Clicks, CTR
   - Columns: Artwork, Title, Artist, Type, Platforms, Views, Clicks, CTR, Created, Status
   - Actions: View, Edit, Analytics, Copy Link, Share, QR Code, Delete

2. **Create Smart Link** — Wizard interface
   - Step 1: Find Release (ISRC, UPC, URL, or select existing)
   - Step 2: Confirm Metadata
   - Step 3: Select Platforms
   - Step 4: Customize (theme, buttons, social links)
   - Step 5: Review & Create
   - Result: Shareable link, QR code, analytics link

3. **Smart Link Detail** — View individual link
   - Link metadata
   - Available platforms
   - Performance stats
   - Actions: Edit, Analytics, QR, Share

4. **Analytics** — Comprehensive analytics dashboard
   - Key metrics: Views, Clicks, CTR
   - Platform performance (bar chart)
   - Geographic distribution (map/table)
   - Device breakdown (pie chart)
   - Time series trends
   - Referrer breakdown
   - Date range selector

### Public Smart Link Landing Page

**URL Format:** `link.amtdistro.com/{artist-slug}/{release-slug}`

**Features:**
- Responsive design (mobile-first)
- Cover artwork
- Artist name & release title
- Platform buttons (Africa-first ordering)
- Copy link button
- Share button (native)
- QR code generation
- Analytics tracking
- Customizable branding (theme, colors, buttons)
- Optional social links
- Pre-save countdown (for upcoming releases)
- Optional email capture

**Mobile Priority:**
- Single column layout
- Large tap targets (48px+)
- Full-width images
- Bottom action buttons
- Simplified header

---

## 🌍 Africa-First Platform Strategy

### Regional Ordering

**Nigeria (Primary Market):**
1. Boomplay (30-40% of traffic)
2. Spotify (20-25%)
3. Audiomack (15-20%)
4. Apple Music (10-15%)
5. YouTube Music (10-15%)
6. Others (5-10%)

**Other African Countries:**
1. Boomplay
2. Audiomack
3. YouTube Music
4. Spotify
5. Apple Music
... (etc.)

**Global (Non-Africa):**
1. Spotify
2. Apple Music
3. YouTube Music
4. Amazon Music
5. Deezer
... (etc.)

### Implementation
- Platform directory stores regional ordering
- Frontend queries appropriate ordering
- Artists can customize ordering manually
- Analytics show regional preferences

---

## 🔒 Security Implementation

### Row-Level Security (RLS)

Every table has policies:
- **SELECT** — Users see own data + public data
- **INSERT** — Users create own only
- **UPDATE** — Users update own only
- **DELETE** — Users delete own only
- **Admin** — Admins have full access

### Input Validation

- URL validation (https://)
- Slug format (alphanumeric + hyphens)
- ISRC format validation
- UPC/EAN format validation
- Email validation
- Custom CSS sanitization

### Rate Limiting

- Metadata resolution: 100/hour per IP (auth) or 10/hour (public)
- Click tracking: No limit (user-based)
- API endpoints: Standard rate limits

### Privacy

- No unnecessary data collection
- Geolocation opt-in where legal
- GDPR/CCPA compliant
- Analytics anonymization ready
- Secure API key storage (env vars)

---

## 📊 Analytics Features

### Tracked Metrics

**Per Smart Link:**
- Total landing page views
- Total platform clicks
- Click-through rate (CTR)
- Unique visitors
- First visit date
- Last visit date

**Per Platform:**
- Click count
- Click percentage
- View rate (how many times shown)

**Demographic:**
- Country/region
- Device type (mobile, tablet, desktop)
- Operating system
- Browser
- Referrer source

**Time Series:**
- Views over time
- Clicks over time
- Platform performance over time

### Dashboard Displays

- Key metrics cards (Views, Clicks, CTR)
- Platform performance chart (bar)
- Geographic distribution (map/table)
- Device breakdown (pie)
- Time series trends (line)
- Referrer breakdown (table)
- Date range filtering

---

## 🎁 Feature Tiers

### Free Tier
- ✅ Create 5 smart links
- ✅ Basic analytics (7-day)
- ✅ Platform selection
- ✅ QR code
- ✅ Share link
- ✅ AMTDistro branding shown

### Artist Tier
- ✅ All Free features
- ✅ Unlimited smart links
- ✅ 90-day analytics
- ✅ Advanced filtering/sorting
- ✅ Custom social links
- ✅ Theme customization

### Super Artist Tier
- ✅ All Artist features
- ✅ Remove AMTDistro branding
- ✅ Custom CSS
- ✅ Tracking pixels
- ✅ Email capture (pre-save)
- ✅ Advanced theme options

### Label Tier
- ✅ All Super Artist features
- ✅ Multiple artist accounts
- ✅ Team collaboration
- ✅ Sub-labels support
- ✅ Batch operations
- ✅ Advanced reporting

---

## 🚀 Implementation Checklist

### Database
- [ ] Run 4 migrations (smart_links, smart_link_services, platform_directory, smart_link_settings)
- [ ] Verify indexes created
- [ ] Test RLS policies
- [ ] Seed platform_directory with 20+ platforms

### Backend Services
- [ ] Deploy metadata-resolution-service
- [ ] Deploy smart-links-comprehensive-service
- [ ] Create API endpoints (CRUD, resolve, analytics)
- [ ] Add rate limiting
- [ ] Setup error handling

### Frontend
- [ ] Build SmartLinks Dashboard (list view)
- [ ] Build Create Smart Link (wizard)
- [ ] Build Analytics Dashboard
- [ ] Build Public Landing Page
- [ ] Build Customization Panel
- [ ] Add QR code generation
- [ ] Add sharing functionality

### Integrations
- [ ] Connect to existing releases
- [ ] Connect to existing artist profiles
- [ ] Automatic link creation after distribution
- [ ] Pre-save system
- [ ] Email capture integration (Mailchimp, ConvertKit)

### Testing
- [ ] Unit tests (services)
- [ ] Integration tests (API)
- [ ] E2E tests (dashboard flows)
- [ ] Analytics accuracy verification
- [ ] RLS policy verification
- [ ] Performance testing

### Documentation
- [ ] API documentation
- [ ] User guide (creating smart links)
- [ ] Analytics guide
- [ ] Customization guide
- [ ] Admin guide (platform management)

### Launch
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Analytics dashboard verification
- [ ] Beta user testing
- [ ] Marketing assets
- [ ] User communication

---

## 📝 Usage Examples

### Create Smart Link from ISRC

```typescript
// 1. Resolve metadata
const metadata = await metadataService.resolveByISRC('NGXXX2600001');

// 2. Create smart link
const smartLink = await smartLinksService.createSmartLink(userId, {
  title: metadata.title,
  artistName: metadata.artist,
  slug: generateSlug(`${metadata.artist}-${metadata.title}`),
  linkType: 'standard',
  isrc: metadata.isrc,
  upc: metadata.upc,
  artworkUrl: metadata.artworkUrl,
  status: 'active',
  isPublic: true,
  presaveEnabled: false,
});

// 3. Add platform services
for (const service of metadata.services) {
  await smartLinksService.addSmartLinkService(smartLink.id, userId, {
    platformKey: service.platform,
    platformName: getPlatformName(service.platform),
    platformUrl: service.url,
    displayOrder: getPlatformOrder(service.platform),
    enabled: true,
  });
}

// 4. Get customization settings
const settings = await smartLinksService.getOrCreateSmartLinkSettings(smartLink.id, userId);

// Result: Smart link ready at link.amtdistro.com/{artist}/{title}
```

### Track Click

```typescript
// Listener clicks platform
await fetch('/api/smart-links/:id/events', {
  method: 'POST',
  body: JSON.stringify({
    serviceId: serviceId,
    country: 'NG',
    referrer: 'instagram.com',
    deviceType: 'mobile',
    os: 'iOS'
  })
});

// Analytics automatically updated
```

---

## 🎯 Success Metrics

**Week 1:**
- 100+ artists create smart links
- 10K+ landing page views
- Platform adoption tracking

**Month 1:**
- 500+ active smart links
- 100K+ landing page views
- Boomplay + Audiomack = 45%+ of traffic

**Quarter 1:**
- 2K+ smart links
- 500K+ landing page views
- Complete analytics available
- Africa-first strategy validated

---

## 🔮 Future Enhancements

1. **AI-Powered Recommendations** — ML suggests best platform ordering per region
2. **Influencer Tracking** — Track each influencer's smart link performance
3. **White Label** — Resellers/labels can customize platform completely
4. **Batch Operations** — Create smart links for multiple releases at once
5. **Smart Link Networks** — Group related releases, cross-promote
6. **Integration Marketplace** — Zapier, Make, native Stripe/Mailchimp
7. **Advanced Segmentation** — Target specific audiences, A/B test ordering
8. **Revenue Optimization** — Recommend highest-paying platforms
9. **Team Collaboration** — Multi-user access with permissions
10. **Real-Time Notifications** — Notify artist when link goes viral

---

## 📞 Support

See separate documentation for:
- [API Reference](./API_REFERENCE.md)
- [Administrator Guide](./ADMIN_GUIDE.md)
- [Analytics Guide](./ANALYTICS_GUIDE.md)
- [Customization Guide](./CUSTOMIZATION_GUIDE.md)
