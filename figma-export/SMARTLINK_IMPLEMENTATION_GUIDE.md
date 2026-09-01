# Smart Link Landing Page Implementation Guide

## 🎯 What We Built

An Africa-focused smart-link system that creates branded landing pages for music releases, showing all available platforms with clicks tracked and analytics enabled.

**Result:** `amtdistro.link/artist/song` → Landing page with Boomplay, Audiomack, YouTube Music, Spotify, etc. prioritized for African listeners

---

## 📊 Quick Architecture

```
Artist Upload
    ↓
Distribution to DSPs (Spotify, Boomplay, etc.)
    ↓
Collect DSP URLs
    ↓
Save to database (release_dsp_urls)
    ↓
Generate smart link: /s/song-title
    ↓
User clicks link
    ↓
SmartLinkLandingPage displays all platforms (Africa-first)
    ↓
User selects platform
    ↓
Click tracked
    ↓
Redirect to DSP
```

---

## 📁 Files Created/Modified

### New Files Created

1. **Database Migration**
   - Path: `supabase/migrations/20260824000000_create_release_dsp_urls.sql`
   - Purpose: Schema for storing DSP URLs per release
   - Platforms: 13 DSP columns (Spotify, Boomplay, Audiomack, etc.)

2. **Backend Service**
   - Path: `supabase/functions/make-server-79198001/release-dsp-service.tsx`
   - Purpose: CRUD operations for DSP URLs
   - Functions: upsert, get, getUserList, deactivate

3. **Frontend Component**
   - Path: `src/app/components/SmartLinkLandingPage.tsx`
   - Purpose: Landing page showing all platforms
   - Features: Africa-first ordering, click tracking, sharing

4. **Documentation**
   - Path: `SMARTLINK_LANDING_PAGE_GUIDE.md`
   - Comprehensive system documentation

### Files Modified

1. **Backend Index**
   - Path: `supabase/functions/make-server-79198001/index.tsx`
   - Changes: Added 4 API endpoints for DSP URL management

---

## 🔌 Integration Points

### 1. After Release Distribution

When DSPs accept and distribute a release, they return URLs. Use this endpoint to save them:

```typescript
// Save DSP URLs after distribution
const dspUrls = {
  spotify: 'https://open.spotify.com/album/xxx',
  apple_music: 'https://music.apple.com/us/album/xxx',
  youtube_music: 'https://music.youtube.com/channel/xxx',
  boomplay: 'https://www.boomplay.com/albums/xxx',
  audiomack: 'https://www.audiomack.com/album/xxx',
  amazon_music: 'https://music.amazon.com/albums/xxx',
  deezer: 'https://www.deezer.com/album/xxx',
  tidal: 'https://listen.tidal.com/album/xxx',
  // ... other platforms
};

const response = await fetch(
  `/make-server-79198001/releases/${releaseId}/dsp-urls`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      releaseTitle: release.title,
      artistName: release.primaryArtist,
      coverArtUrl: release.artworkUrl,
      urls: dspUrls
    })
  }
);
```

### 2. Create Smart Link

Generate a slug and create the link:

```typescript
import { buildSmartLinkUrl, normalizeSmartLinkSlug } from './utils/smartLinkUrl';

const slug = normalizeSmartLinkSlug(`${artistName} ${releaseTitle}`);
const smartLink = buildSmartLinkUrl(slug); // /s/artist-name-release-title

// Share with users
console.log(`Listen on all platforms: ${smartLink}`);
```

### 3. Landing Page Display

When user visits a smart-link URL, render the landing page:

```typescript
import { SmartLinkLandingPage } from './components/SmartLinkLandingPage';

// Fetch DSP URLs
const response = await fetch(
  `/make-server-79198001/releases/${releaseId}/dsp-urls`
);
const dspData = await response.json();

// Render landing page
return (
  <SmartLinkLandingPage
    releaseTitle={dspData.data.releaseTitle}
    artistName={dspData.data.artistName}
    coverArtUrl={dspData.data.coverArtUrl}
    dspUrls={dspData.data.urls}
    slug={slug}
  />
);
```

---

## 🌍 Platform Ordering (Africa-First)

### Primary Tier 🌍 African Platforms
1. **Boomplay** — #1 in Africa, dominant in Nigeria/Kenya/Ghana
2. **Audiomack** — Hip-hop hub, strong in West Africa
3. **PIMP** — African-focused platform

### Secondary Tier 🌐 Global Giants
4. **YouTube Music** — Video/audio hybrid
5. **Spotify** — Global leader
6. **Apple Music** — Premium segment
7. **Amazon Music** — Prime integration
8. **Deezer** — European/global reach
9. **TIDAL** — Hi-Fi audio
10. **Bandcamp** — Independent artists
11. **SoundCloud** — Hip-hop community

### Tertiary Tier 📍 Regional
12. **Anghami** — MENA (Middle East & North Africa)
13. **JioSaavn** — South Asia (India, Pakistan, Bangladesh)

---

## 📱 Component Features

### SmartLinkLandingPage.tsx

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
- ✅ Africa-first platform ordering
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Platform click tracking
- ✅ Copy link button
- ✅ Share button (native sharing)
- ✅ Gradient per platform
- ✅ Hover effects & interactions
- ✅ Section grouping (Africa/Global/Regional)

**Styling:**
- Dark theme with gradient (suitable for music)
- Tailwind CSS responsive grid
- Platform cards with hover scale
- Accessible color contrasts

---

## 📊 Analytics

Every click is tracked with:

- **Platform** — Which DSP was clicked
- **Device** — Mobile/tablet/desktop
- **OS** — iOS/Android/Windows/macOS/Linux
- **Country** — Geolocation
- **Referrer** — Where link was shared from
- **Timestamp** — When click happened

**Access Analytics:**
```typescript
const analytics = await fetch(
  `/make-server-79198001/smart-links/${linkId}/analytics?range=30`
);
// Returns: total clicks, per-platform breakdown, device/OS/country distribution
```

---

## 🔒 Security

### Row-Level Security (RLS)
- Users can only manage their own DSP URLs
- Public can view only active DSP URLs
- Authenticated endpoints require auth token

### Database Policies
```sql
-- Users own their data
CREATE POLICY "Users can view their own DSP URLs"
  ON release_dsp_urls FOR SELECT
  USING (auth.uid() = user_id);

-- Public can see active links only
CREATE POLICY "Public can view active DSP URLs for live releases"
  ON release_dsp_urls FOR SELECT
  USING (is_active = true);
```

---

## 🚀 Deployment Checklist

- [ ] Run migration: `supabase migration up`
- [ ] Deploy backend functions (index.tsx with new endpoints)
- [ ] Deploy frontend component (SmartLinkLandingPage.tsx)
- [ ] Test create smart link → save DSP URLs → access landing page
- [ ] Verify platform click tracking works
- [ ] Test QR code generation
- [ ] Check analytics dashboard displays clicks
- [ ] Test mobile responsiveness
- [ ] Verify RLS policies work
- [ ] Load test with concurrent users

---

## 📈 Expected Usage

**Per Artist:**
- 1-3 smart links per release (normal, deluxe, remix versions)
- Average 100-500 clicks per link in first month
- Boomplay/Audiomack typically 30-40% of traffic from Africa

**Per Platform:**
- Boomplay: ~25% of clicks from Nigeria, Kenya, Ghana
- Audiomack: ~15% from hip-hop audiences
- Spotify: ~20% globally
- YouTube Music: ~15% (video-heavy users)
- Apple Music: ~10% (premium segment)
- Others: ~15% combined

---

## 💡 Pro Tips

### 1. Customize Platform Ordering
Edit `AFRICA_FIRST_PLATFORMS` in SmartLinkLandingPage.tsx to change order, add/remove platforms, customize colors.

### 2. Track Referrer Source
When sharing smart link, append `?ref=instagram` to track which social platform traffic comes from.

### 3. A/B Test Ordering
Create two versions of landing page with different platform orders and measure click distribution.

### 4. Integration with Email
Include smart link in artist email signatures for release announcements.

### 5. Influencer Tracking
Create unique slugs per influencer and track their referrer analytics.

---

## 🆘 Troubleshooting

### Landing page shows 404
- Verify release_id exists in database
- Check DSP URLs were saved correctly
- Verify release is marked as active

### Platform links don't work
- Ensure DSP URLs are valid URLs
- Check DSP is still alive (may have taken down release)
- Verify URLs weren't truncated in database

### Clicks not tracking
- Check browser console for fetch errors
- Verify auth token is valid
- Ensure click endpoint is accessible

### Performance issues
- Add indexes if not present
- Cache DSP URLs in component state
- Lazy load platform cards on mobile

---

## 📚 Related Documentation

- [Full System Guide](./SMARTLINK_LANDING_PAGE_GUIDE.md)
- [Smart Link URL Utilities](./src/app/utils/smartLinkUrl.ts)
- [Smart Link Click Analytics](./src/app/components/dashboard/SmartLinksView.tsx)

---

## 🎉 Summary

The Smart Link Landing Page system transforms AMTDistro from a distribution tool into a discovery platform. Artists no longer just distribute music; they create branded experiences that intelligently route listeners to their favorite platforms.

**Key Innovation:** Africa-first ordering means Boomplay and Audiomack users see their preferred platforms first—a design choice that respects regional preferences while maintaining global reach.
