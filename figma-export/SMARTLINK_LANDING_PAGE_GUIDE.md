# AMTDistro Africa-Focused Smart Link System

## Overview

The AMTDistro Smart Link System is an Africa-first alternative to Songlink/Odesli that creates beautiful, branded landing pages for music releases across all digital platforms.

**Key Features:**
- 🌍 **Africa-First Platform Ordering**: Boomplay, Audiomack, YouTube Music featured first
- 🎨 **Artist Branding**: Custom cover art, artist name, release title
- 📊 **Click Analytics**: Track which platforms users prefer
- 🔗 **Shareable Links**: Easy URL sharing and QR codes
- 📱 **Fully Responsive**: Mobile, tablet, desktop optimized
- ⚡ **Fast Redirects**: Device-aware platform selection
- 🌐 **Multi-Platform**: 13+ platforms supported

## Architecture

### Database Schema

**`release_dsp_urls` Table** — Stores DSP URLs for each release
```sql
- id: UUID (primary key)
- release_id: UUID (from releases table)
- user_id: UUID (from auth.users)
- release_title: TEXT
- artist_name: TEXT
- cover_art_url: TEXT

DSP Platform URLs (all TEXT):
- spotify_url
- apple_music_url
- youtube_music_url
- boomplay_url (Africa priority)
- audiomack_url (Africa priority)
- amazon_music_url
- deezer_url
- tidal_url
- bandcamp_url
- soundcloud_url
- pimp_url (Africa)
- anghami_url (MENA)
- jio_saavn_url (South Asia)

Metadata:
- is_active: BOOLEAN
- distribution_status: TEXT (pending, processing, completed, failed)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Backend Services

#### `release-dsp-service.tsx`
Manages DSP URL persistence and retrieval.

**Key Functions:**
```typescript
// Save DSP URLs for a release
upsertReleaseDSPUrls(releaseId, userId, data)

// Get DSP URLs for public access
getReleaseDSPUrls(releaseId)

// Get all releases for a user
getUserReleaseDSPUrls(userId)

// Deactivate a release's smart link
deactivateReleaseDSPUrls(releaseId)

// Update distribution status
updateDistributionStatus(releaseId, status)
```

### Backend Endpoints

#### Public Endpoints (No Auth)

**GET `/make-server-79198001/releases/:releaseId/dsp-urls`**
- Returns DSP URLs for a release
- Used by landing page to display platforms
- Response: `{ success: true, data: ReleaseDSPUrls }`

#### Authenticated Endpoints

**POST `/make-server-79198001/releases/:releaseId/dsp-urls`**
- Save DSP URLs for a release
- Required: `releaseTitle`, `artistName`, `urls` object
- Response: `{ success: true, data: ReleaseDSPUrls }`

**GET `/make-server-79198001/user/:userId/releases/dsp-urls`**
- Get all releases with DSP URLs for authenticated user
- Returns: Array of `ReleaseDSPUrls`

**POST `/make-server-79198001/releases/:releaseId/dsp-urls/deactivate`**
- Deactivate a release's smart link
- Response: `{ success: true, message: 'DSP URLs deactivated' }`

### Frontend Components

#### `SmartLinkLandingPage.tsx`
Public-facing component that displays all available platforms for a release.

**Props:**
```typescript
interface SmartLinkLandingPageProps {
  releaseId?: string;
  releaseTitle: string;
  artistName: string;
  coverArtUrl?: string;
  dspUrls: DSPUrl;
  slug?: string;
}
```

**Features:**
- Africa-first platform ordering
- Responsive grid layout (1 col mobile, 2 col tablet+)
- Platform click tracking
- Copy link & share buttons
- Gradient backgrounds per platform
- Loading/clicked states

**Platform Sections:**
1. **African Platforms** 🌍
   - Boomplay
   - Audiomack
   - PIMP

2. **Global Streaming** 🌐
   - Spotify
   - Apple Music
   - YouTube Music
   - Amazon Music
   - Deezer
   - TIDAL
   - Bandcamp
   - SoundCloud

3. **Regional Platforms** 📍
   - Anghami (MENA)
   - JioSaavn (South Asia)

## Integration Flow

### 1. Artist Uploads Release

```
Artist → Upload Release
  ↓
Generate ISRC/UPC
  ↓
Submit to DSPs (distribution-service)
  ↓
DSPs process and generate URLs
  ↓
Collect URLs from DSPs
```

### 2. Store DSP URLs

```
Collected URLs
  ↓
POST /releases/:releaseId/dsp-urls
  ↓
upsertReleaseDSPUrls()
  ↓
Stored in release_dsp_urls table
```

### 3. Create Smart Link

```
Artist creates smart link
  ↓
Auto-generate slug from release title
  ↓
Generate: amtdistro.link/artist/song
  ↓
URL format: /s/[normalized-slug]
  ↓
Share with audience
```

### 4. User Visits Link

```
User clicks: amtdistro.link/artist/song
  ↓
App detects release slug
  ↓
Renders SmartLinkLandingPage
  ↓
Fetches DSP URLs from database
  ↓
Displays all platform options
  ↓
User selects platform
  ↓
Click tracked & recorded
  ↓
Redirect to DSP platform
```

### 5. Analytics

```
Click recorded with:
- Platform selected
- Device type (mobile/tablet/desktop)
- OS (iOS, Android, Windows, macOS, Linux)
- Country (geo-location)
- Referrer (where link was shared)
  ↓
Stored in database
  ↓
Available in dashboard analytics
```

## Africa-Focused Platform Ordering

The system prioritizes platforms popular in Africa:

### Tier 1: African Platforms 🌍
1. **Boomplay** — #1 streaming service in Africa
   - Dominant in Nigeria, Kenya, Ghana, South Africa
   - Largest user base on continent

2. **Audiomack** — Hip-hop & independent music hub
   - Strong African artist community
   - Popular in West Africa, especially Nigeria

3. **PIMP** — African music platform
   - Growing market share
   - Artist-friendly monetization

### Tier 2: Global Giants 🌐
4. **YouTube Music** — Video platform advantage
   - Massive reach across Africa
   - Monetization opportunity for artists

5. **Spotify** — Global leader
   - Available worldwide
   - Strong in urban centers

6. **Apple Music** — Premium segment
   - iPhone/Mac ecosystem
   - High-value listeners

7. **Amazon Music** — Streaming service
   - Prime Video integration
   - Regional availability

8. **Deezer** — European stronghold
   - Growing African presence
   - Local payment options

9. **TIDAL** — Hi-Fi audio
   - Artist-owned platform
   - Quality-focused listeners

10. **Bandcamp** — Independent artists
    - Direct artist-fan connection
    - Fair revenue split

11. **SoundCloud** — Hip-hop hub
    - User-generated content
    - Artist promotion platform

### Tier 3: Regional Specialists 📍
12. **Anghami** — MENA region
    - Middle East & North Africa focus
    - Arabic language support

13. **JioSaavn** — South Asia
    - India, Pakistan, Bangladesh
    - Regional language support

## Usage Example

### Artist Dashboard Workflow

```typescript
// 1. After release is distributed, collect DSP URLs
const dspUrls = {
  spotify: 'https://open.spotify.com/album/...',
  apple_music: 'https://music.apple.com/us/album/...',
  youtube_music: 'https://music.youtube.com/...',
  boomplay: 'https://www.boomplay.com/albums/...',
  audiomack: 'https://www.audiomack.com/album/...',
  // ... other platforms
};

// 2. Save DSP URLs to database
const response = await fetch('/make-server-79198001/releases/:releaseId/dsp-urls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    releaseTitle: 'My Song',
    artistName: 'My Artist',
    coverArtUrl: 'https://...',
    urls: dspUrls
  })
});

// 3. Create smart link
const smartLink = buildSmartLinkUrl(slug); // /s/my-song

// 4. Share with audience
// Link now redirects to landing page showing all platforms
```

### User Journey

```typescript
// User clicks: amtdistro.link/artist/my-song

// 1. App detects release slug from URL
extractSmartLinkSlugFromPathname(pathname, knownPublicPaths)
// Returns: 'artist/my-song'

// 2. Render SmartLinkLandingPage
<SmartLinkLandingPage
  releaseTitle={data.releaseTitle}
  artistName={data.artistName}
  coverArtUrl={data.coverArtUrl}
  dspUrls={data.urls}
/>

// 3. Landing page displays all platforms
// Africa-first ordering:
// - Boomplay (featured)
// - Audiomack (featured)
// - YouTube Music
// - Spotify
// - Apple Music
// - etc.

// 4. User clicks platform
onClick={() => handlePlatformClick('boomplay', boomplayUrl)}
// - Records click event
// - Redirects to Boomplay

// 5. Click tracked in analytics
// - Platform: 'boomplay'
// - Device: 'mobile'
// - OS: 'iOS'
// - Country: 'NG' (geolocation)
```

## Configuration & Customization

### Add New Platform

To add a new platform to the landing page:

1. **Update Database Schema** — Add new column to `release_dsp_urls`
2. **Update Service** — Add new field to `DSPUrl` interface and `upsertReleaseDSPUrls()`
3. **Update Component** — Add to `AFRICA_FIRST_PLATFORMS` array with icon and branding
4. **Update Ordering** — Place in appropriate tier (African/Global/Regional)

### Customize Branding

Edit `AFRICA_FIRST_PLATFORMS` in `SmartLinkLandingPage.tsx`:

```typescript
const AFRICA_FIRST_PLATFORMS = [
  {
    key: 'boomplay',
    name: 'Boomplay',
    icon: '🎵',                    // Change icon (emoji or custom)
    color: 'from-yellow-500 to-orange-500',  // Tailwind gradient
    textColor: 'text-yellow-600',  // Tailwind color
    description: '#1 in Africa',   // Platform description
    region: 'Africa',              // Tier grouping
  },
  // ...
];
```

### Customize Styles

The landing page uses Tailwind CSS. Key elements:

- **Header**: Dark gradient with blur
- **Cover Art**: 256x256px on desktop, 192x192px mobile
- **Platform Cards**: Hover scale (1.05), click scale (0.95)
- **Gradients**: Per-platform custom colors
- **Layout**: Responsive grid (1 col → 2 col)

## Analytics Dashboard

Display smart link analytics in artist dashboard:

```typescript
// Component to show in artist dashboard
<SmartLinkAnalytics
  releaseId={releaseId}
  days={30}
/>

// Shows:
- Total clicks
- Clicks per platform
- Device breakdown
- OS distribution
- Geographic distribution
- Referrer sources
- Time series trend
```

## Performance Optimization

### Database Indexes
- `release_id` — Fast lookup by release
- `user_id` — User's releases
- `user_id + release_id` — Compound queries
- `is_active` — Filter active links

### Caching Strategy
- Cache DSP URLs in browser localStorage
- Cache platform list in component
- Prefetch common releases

### CDN Optimization
- Serve cover art through CDN
- Optimize images for mobile
- Lazy load platform cards

## Security Considerations

### RLS Policies
- Users can only view their own DSP URLs
- Public can view active DSP URLs for live releases
- Authenticated required for create/update/delete

### Rate Limiting
- Implement rate limiting on click tracking
- Prevent click fraud
- Monitor unusual patterns

### Data Validation
- Validate DSP URLs are proper URLs
- Validate release ownership
- Validate user permissions

## Testing Checklist

- [ ] Create smart link from dashboard
- [ ] Verify landing page loads
- [ ] Click each platform link
- [ ] Verify click tracking in database
- [ ] Check mobile responsiveness
- [ ] Test QR code generation
- [ ] Verify analytics aggregation
- [ ] Test error states (no URLs, not found)
- [ ] Verify RLS security policies
- [ ] Test with different user types

## Future Enhancements

1. **Deep Linking** — Direct platform selection via URL param
2. **A/B Testing** — Test different platform orderings
3. **Custom Domains** — Artist subdomain smart links
4. **Batch Distribution** — Mass DSP URL collection
5. **Advance Analytics** — Revenue per click, conversion rates
6. **Influencer Tracking** — Referrer analytics per person
7. **AI Recommendations** — ML-based platform ordering
8. **Live Notifications** — Real-time click count
9. **Social Integrations** — Direct share to socials
10. **White Label** — Reseller/label branding
