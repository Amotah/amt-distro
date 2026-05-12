// Smart Link Algorithms for AMTDISTRO Platform

/**
 * Generate a URL-safe slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a short unique ID for links
 */
export function generateShortId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Validate streaming platform URL
 */
export function validatePlatformUrl(platform: string, url: string): boolean {
  if (!url) return false;
  
  const platformPatterns: Record<string, RegExp> = {
    spotify: /^https?:\/\/(open\.)?spotify\.com\/.+/i,
    'apple-music': /^https?:\/\/music\.apple\.com\/.+/i,
    'youtube-music': /^https?:\/\/music\.youtube\.com\/.+/i,
    'amazon-music': /^https?:\/\/music\.amazon\.com\/.+/i,
    deezer: /^https?:\/\/(www\.)?deezer\.com\/.+/i,
    tidal: /^https?:\/\/(listen\.)?tidal\.com\/.+/i,
    soundcloud: /^https?:\/\/(www\.)?soundcloud\.com\/.+/i,
    pandora: /^https?:\/\/(www\.)?pandora\.com\/.+/i,
  };

  return platformPatterns[platform]?.test(url) ?? false;
}

/**
 * Detect user's device type
 */
export function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    return 'tablet';
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec/i.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Detect user's operating system
 */
export function detectOS(): 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  if (/windows/.test(userAgent)) return 'windows';
  if (/mac os/.test(userAgent)) return 'macos';
  if (/linux/.test(userAgent)) return 'linux';
  
  return 'unknown';
}

/**
 * Smart routing algorithm - determines best platform based on device/OS
 */
export function getPreferredPlatform(
  platforms: Record<string, string>,
  device: string,
  os: string
): string | null {
  // Priority mapping based on device and OS
  const platformPriority: Record<string, string[]> = {
    ios: ['apple-music', 'spotify', 'youtube-music', 'amazon-music'],
    android: ['youtube-music', 'spotify', 'amazon-music', 'deezer'],
    windows: ['spotify', 'youtube-music', 'amazon-music', 'deezer'],
    macos: ['apple-music', 'spotify', 'youtube-music', 'amazon-music'],
    linux: ['spotify', 'youtube-music', 'deezer', 'soundcloud'],
    unknown: ['spotify', 'apple-music', 'youtube-music', 'amazon-music'],
  };

  const priorityList = platformPriority[os] || platformPriority['unknown'];
  
  // Find first available platform from priority list
  for (const platform of priorityList) {
    if (platforms[platform]) {
      return platforms[platform];
    }
  }
  
  // If no priority match, return first available platform
  const availablePlatforms = Object.values(platforms).filter(Boolean);
  return availablePlatforms.length > 0 ? availablePlatforms[0] : null;
}

/**
 * Track click event with analytics data
 */
export interface ClickEvent {
  linkId: string;
  timestamp: number;
  device: string;
  os: string;
  country?: string;
  referrer?: string;
  platform?: string;
}

export function createClickEvent(linkId: string, platform?: string): ClickEvent {
  return {
    linkId,
    timestamp: Date.now(),
    device: detectDevice(),
    os: detectOS(),
    country: getApproximateLocation(),
    referrer: document.referrer || 'direct',
    platform,
  };
}

/**
 * Get approximate location based on timezone
 */
export function getApproximateLocation(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Map timezones to general regions
  if (timezone.includes('Africa')) return 'Africa';
  if (timezone.includes('Europe')) return 'Europe';
  if (timezone.includes('Asia')) return 'Asia';
  if (timezone.includes('America')) return 'Americas';
  if (timezone.includes('Australia') || timezone.includes('Pacific')) return 'Oceania';
  
  return 'Unknown';
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(clicks: number, conversions: number): string {
  if (clicks === 0) return '0%';
  return ((conversions / clicks) * 100).toFixed(1) + '%';
}

/**
 * Generate analytics summary
 */
export interface AnalyticsSummary {
  totalClicks: number;
  uniqueClicks: number;
  platforms: Record<string, number>;
  devices: Record<string, number>;
  countries: Record<string, number>;
  conversionRate: string;
}

export function generateAnalyticsSummary(events: ClickEvent[]): AnalyticsSummary {
  const uniqueUsers = new Set(events.map(e => `${e.device}-${e.os}-${e.timestamp}`));
  
  const platforms: Record<string, number> = {};
  const devices: Record<string, number> = {};
  const countries: Record<string, number> = {};
  
  events.forEach(event => {
    if (event.platform) {
      platforms[event.platform] = (platforms[event.platform] || 0) + 1;
    }
    devices[event.device] = (devices[event.device] || 0) + 1;
    if (event.country) {
      countries[event.country] = (countries[event.country] || 0) + 1;
    }
  });
  
  return {
    totalClicks: events.length,
    uniqueClicks: uniqueUsers.size,
    platforms,
    devices,
    countries,
    conversionRate: calculateConversionRate(events.length, uniqueUsers.size),
  };
}

/**
 * Extract platform from URL
 */
export function extractPlatformFromUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('spotify')) return 'Spotify';
  if (lowerUrl.includes('apple')) return 'Apple Music';
  if (lowerUrl.includes('youtube')) return 'YouTube Music';
  if (lowerUrl.includes('amazon')) return 'Amazon Music';
  if (lowerUrl.includes('deezer')) return 'Deezer';
  if (lowerUrl.includes('tidal')) return 'Tidal';
  if (lowerUrl.includes('soundcloud')) return 'SoundCloud';
  if (lowerUrl.includes('pandora')) return 'Pandora';
  
  return null;
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
