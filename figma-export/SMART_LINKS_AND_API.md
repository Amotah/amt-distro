# AMTDISTRO - Smart Links & API Integration Documentation

## Overview
AMTDISTRO is a comprehensive music distribution platform designed for Nigerian artists with advanced features including smart links, API integrations, and intelligent routing algorithms.

## Features Implemented

### 1. Smart Links System

#### Key Features:
- **Universal Music Links**: Create single links that direct users to all streaming platforms
- **Intelligent Routing**: Automatic platform detection based on user's device and OS
- **QR Code Generation**: Downloadable QR codes for offline promotion
- **Real-time Analytics**: Track clicks, devices, countries, and platform preferences
- **Custom Slugs**: Create memorable, branded URLs (e.g., `amtdistro.link/your-song`)

#### Algorithms Implemented:
1. **Slug Generation Algorithm** (`generateSlug`)
   - Converts text to URL-safe format
   - Removes special characters
   - Handles spaces and hyphens properly

2. **Device Detection** (`detectDevice`)
   - Identifies mobile, tablet, or desktop
   - Uses user agent parsing

3. **OS Detection** (`detectOS`)
   - Detects iOS, Android, Windows, macOS, Linux
   - Platform-specific routing logic

4. **Smart Routing Algorithm** (`getPreferredPlatform`)
   - iOS users → Apple Music (priority)
   - Android users → YouTube Music (priority)
   - Windows users → Spotify (priority)
   - Fallback to available platforms

5. **Click Tracking** (`createClickEvent`)
   - Records timestamp, device, OS, location
   - Tracks referrer and platform choice
   - Generates analytics data

6. **Geographic Detection** (`getApproximateLocation`)
   - Uses timezone to determine region
   - Privacy-friendly location tracking

#### Usage:
1. Navigate to **Marketing** → **Smart Links**
2. Click **Create Link**
3. Fill in song/album details
4. Add streaming platform URLs
5. Enable smart routing options
6. Generate and share your link

### 2. API Integration System

#### Supported Platforms:
- Spotify
- Apple Music
- YouTube Music
- Amazon Music
- Deezer
- Tidal
- SoundCloud
- Pandora
- Audiomack
- Boomplay

#### Key Features:

**Platform Connection:**
- OAuth and API Key authentication support
- Real-time connection status monitoring
- Last sync timestamp tracking
- Platform capability detection

**Webhooks:**
- Configure webhook endpoints
- Event-based notifications:
  - `release.submitted`
  - `release.processing`
  - `release.live`
  - `release.failed`
  - `analytics.updated`
  - `payout.processed`
- Webhook signature validation
- Enable/disable webhooks individually

**Distribution Management:**
- Batch upload to multiple platforms
- Auto-retry failed uploads
- Rate limiting to prevent API throttling
- Automatic analytics synchronization

#### Algorithms & Utilities:

1. **OAuth Generation** (`generateOAuthUrl`)
   - Creates secure OAuth authorization URLs
   - Includes state tokens for security
   - Handles redirects properly

2. **Webhook Validation** (`validateWebhookSignature`)
   - Verifies webhook authenticity
   - Prevents unauthorized requests

3. **Batch Upload** (`batchUploadRelease`)
   - Distributes to multiple platforms simultaneously
   - Handles partial failures gracefully
   - Returns success/failed/pending statuses

4. **Rate Limiter** (Class-based)
   - Queues API requests
   - Configurable requests per second
   - Prevents rate limit errors

5. **Retry Logic** (`retryApiCall`)
   - Automatic retry on failure
   - Exponential backoff
   - Configurable retry attempts

#### Usage:
1. Navigate to **Settings** → **API Integrations**
2. Select a platform to connect
3. Complete OAuth or enter API key
4. Configure webhooks (optional)
5. Adjust integration settings
6. Monitor connection status

### 3. Responsive Design

All components are fully responsive with:
- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`
- Touch-friendly UI elements
- Optimized layouts for all screen sizes

#### Responsive Elements:
- Flexible grid layouts (2-column on mobile, 4-column on desktop)
- Collapsible navigation
- Adaptive text sizes
- Mobile-optimized forms
- Stack-to-row transitions

### 4. Distribution Workflow

```
Upload Music → Connect Platforms → Configure Distribution → Submit → Track Status
```

**Step 1: Upload**
- Audio files (WAV, FLAC, MP3)
- Cover art
- Metadata

**Step 2: Select Platforms**
- Choose connected platforms
- Or connect new ones via API Integration

**Step 3: Distribution**
- Batch upload algorithm distributes to all selected platforms
- Real-time status updates via webhooks

**Step 4: Analytics**
- Aggregate data from all platforms
- Unified dashboard
- Export capabilities

## Technical Stack

### Frontend:
- React 18 with TypeScript
- Tailwind CSS v4
- Radix UI components
- Lucide icons
- QRCode.js
- Chart.js (for analytics)

### Algorithms:
- URL slug generation
- Device/OS detection
- Smart routing logic
- Click tracking & analytics
- Rate limiting
- Retry mechanisms
- Webhook validation

### File Structure:
```
/src/app/
  ├── components/
  │   ├── CreateSmartLink.tsx    # Smart links creation UI
  │   ├── ApiIntegrations.tsx    # API management UI
  │   ├── Settings.tsx           # Settings hub
  │   └── Marketing.tsx          # Marketing dashboard
  ├── utils/
  │   ├── smartLinkAlgorithms.ts # Smart link logic
  │   └── apiIntegration.ts      # API integration logic
  └── App.tsx                    # Main application
```

## API Integration Guide

### Connecting a Platform:

**For OAuth Platforms (Spotify, YouTube, Deezer):**
```typescript
1. Click "Connect" on platform
2. Redirected to platform OAuth page
3. Authorize AMTDISTRO
4. Automatically redirected back
5. Connection confirmed
```

**For API Key Platforms (Apple Music, Tidal, Amazon):**
```typescript
1. Click "Connect" on platform
2. Enter API key from platform dashboard
3. Click "Connect"
4. Credentials validated
5. Connection confirmed
```

### Using Webhooks:

```typescript
// Example webhook payload structure
{
  event: "release.live",
  timestamp: 1710936000000,
  data: {
    releaseId: "spotify_123456",
    platform: "spotify",
    status: "live"
  },
  signature: "encrypted_signature_here"
}
```

**Validate incoming webhooks:**
```typescript
import { validateWebhookSignature } from './utils/apiIntegration';

const isValid = validateWebhookSignature(
  payload,
  signature,
  secretKey
);
```

## Smart Link Routing Examples

### Example 1: iOS User
```
User clicks: amtdistro.link/summer-vibes
Device: iPhone
OS: iOS
→ Redirects to: Apple Music (highest priority for iOS)
```

### Example 2: Android User
```
User clicks: amtdistro.link/summer-vibes
Device: Android Phone
OS: Android
→ Redirects to: YouTube Music (highest priority for Android)
```

### Example 3: Windows Desktop
```
User clicks: amtdistro.link/summer-vibes
Device: Desktop
OS: Windows
→ Redirects to: Spotify (highest priority for Windows)
```

## Analytics Tracking

### Tracked Metrics:
- **Total Clicks**: All link visits
- **Unique Clicks**: Deduplicated visitors
- **Device Breakdown**: Mobile/Tablet/Desktop percentages
- **Platform Distribution**: Which platforms users chose
- **Geographic Data**: Country/region breakdown
- **Conversion Rate**: Clicks to actual plays

### Data Privacy:
- No personal identifying information stored
- Timezone-based geolocation (approximate)
- Anonymous device fingerprinting
- GDPR compliant

## Performance Optimization

### Rate Limiting:
- Default: 10 requests/second
- Configurable in settings
- Prevents API throttling
- Queue-based request management

### Caching:
- Analytics data cached for 5 minutes
- Platform status cached for 1 hour
- Reduces API calls

### Error Handling:
- Automatic retry on failure (up to 3 attempts)
- Exponential backoff
- Graceful degradation
- User-friendly error messages

## Security Features

1. **OAuth Security:**
   - State token validation
   - CSRF protection
   - Secure token storage

2. **Webhook Security:**
   - Signature verification
   - Secret key validation
   - Replay attack prevention

3. **API Key Storage:**
   - Encrypted at rest
   - Never exposed to client
   - Revocable anytime

## Future Enhancements

- [ ] Advanced analytics with conversion tracking
- [ ] A/B testing for smart links
- [ ] Custom landing pages
- [ ] Deep linking support
- [ ] Pre-save campaigns
- [ ] Email capture on smart link pages
- [ ] Integration with more platforms (150+)
- [ ] Bulk operations for multiple releases
- [ ] Scheduled releases
- [ ] Territory-specific distribution

## Support

For questions or issues:
- Email: support@amtdistro.com
- Documentation: https://docs.amtdistro.com
- API Reference: https://api.amtdistro.com/docs

## License

Proprietary - AMTDISTRO Platform
© 2026 AMTDISTRO. All rights reserved.
