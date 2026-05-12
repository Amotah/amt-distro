// API Integration Utilities for Aggregator Distribution Platform

export interface PlatformConfig {
  id: string;
  name: string;
  apiEndpoint: string;
  authType: 'oauth' | 'api_key' | 'basic';
  status: 'connected' | 'disconnected' | 'pending';
  lastSync?: Date;
  capabilities: string[];
}

export interface DistributionStatus {
  platform: string;
  status: 'pending' | 'processing' | 'live' | 'failed' | 'rejected';
  releaseId?: string;
  submittedAt?: Date;
  liveAt?: Date;
  error?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}

/**
 * Streaming Platform Configurations
 */
export const STREAMING_PLATFORMS: PlatformConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    apiEndpoint: 'https://api.spotify.com/v1',
    authType: 'oauth',
    status: 'disconnected',
    capabilities: ['upload', 'analytics', 'playlist', 'artist_profile'],
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    apiEndpoint: 'https://api.music.apple.com/v1',
    authType: 'api_key',
    status: 'disconnected',
    capabilities: ['upload', 'analytics', 'artist_profile'],
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    apiEndpoint: 'https://www.googleapis.com/youtube/v3',
    authType: 'oauth',
    status: 'disconnected',
    capabilities: ['upload', 'analytics', 'content_id'],
  },
  {
    id: 'amazon-music',
    name: 'Amazon Music',
    apiEndpoint: 'https://music.amazon.com/api/v1',
    authType: 'api_key',
    status: 'disconnected',
    capabilities: ['upload', 'analytics'],
  },
  {
    id: 'deezer',
    name: 'Deezer',
    apiEndpoint: 'https://api.deezer.com',
    authType: 'oauth',
    status: 'disconnected',
    capabilities: ['upload', 'analytics'],
  },
  {
    id: 'tidal',
    name: 'Tidal',
    apiEndpoint: 'https://api.tidal.com/v1',
    authType: 'api_key',
    status: 'disconnected',
    capabilities: ['upload', 'analytics', 'hi-res'],
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    apiEndpoint: 'https://api.soundcloud.com',
    authType: 'oauth',
    status: 'disconnected',
    capabilities: ['upload', 'analytics', 'comments'],
  },
  {
    id: 'pandora',
    name: 'Pandora',
    apiEndpoint: 'https://api.pandora.com/v1',
    authType: 'api_key',
    status: 'disconnected',
    capabilities: ['upload', 'analytics'],
  },
  {
    id: 'audiomack',
    name: 'Audiomack',
    apiEndpoint: 'https://api.audiomack.com/v1',
    authType: 'oauth',
    status: 'disconnected',
    capabilities: ['upload', 'analytics', 'trending'],
  },
  {
    id: 'boomplay',
    name: 'Boomplay',
    apiEndpoint: 'https://api.boomplaymusic.com/v1',
    authType: 'api_key',
    status: 'disconnected',
    capabilities: ['upload', 'analytics'],
  },
];

/**
 * Generate OAuth URL for platform authentication
 */
export function generateOAuthUrl(platform: PlatformConfig, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: `AMTDISTRO_${platform.id.toUpperCase()}`,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'upload analytics user-profile',
    state: generateStateToken(),
  });
  
  return `${platform.apiEndpoint}/oauth/authorize?${params.toString()}`;
}

/**
 * Generate state token for OAuth security
 */
export function generateStateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // In production, use crypto.subtle.sign or a library like crypto-js
  // This is a simplified version
  const expectedSignature = btoa(`${secret}:${payload}`);
  return signature === expectedSignature;
}

/**
 * Create webhook payload
 */
export interface WebhookPayload {
  event: string;
  timestamp: number;
  data: any;
  signature: string;
}

export function createWebhookPayload(
  event: string,
  data: any,
  secret: string
): WebhookPayload {
  const payload = {
    event,
    timestamp: Date.now(),
    data,
    signature: '',
  };
  
  payload.signature = btoa(`${secret}:${JSON.stringify(data)}`);
  return payload;
}

/**
 * Upload release to platform (mock implementation)
 */
export async function uploadReleaseToPlatform(
  platform: string,
  releaseData: any
): Promise<DistributionStatus> {
  // Mock API call - in production, this would make actual API requests
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        platform,
        status: 'processing',
        releaseId: `${platform}_${Date.now()}`,
        submittedAt: new Date(),
      });
    }, 1000);
  });
}

/**
 * Check distribution status across platforms
 */
export async function checkDistributionStatus(
  releaseId: string
): Promise<DistributionStatus[]> {
  // Mock implementation
  const platforms = ['spotify', 'apple-music', 'youtube-music'];
  
  return platforms.map(platform => ({
    platform,
    status: Math.random() > 0.3 ? 'live' : 'processing',
    releaseId: `${platform}_${releaseId}`,
    submittedAt: new Date(Date.now() - 86400000),
    liveAt: Math.random() > 0.3 ? new Date() : undefined,
  }));
}

/**
 * Sync analytics from multiple platforms
 */
export interface PlatformAnalytics {
  platform: string;
  streams: number;
  listeners: number;
  revenue: number;
  lastUpdated: Date;
}

export async function syncAnalytics(
  platforms: string[]
): Promise<PlatformAnalytics[]> {
  // Mock implementation
  return platforms.map(platform => ({
    platform,
    streams: Math.floor(Math.random() * 100000),
    listeners: Math.floor(Math.random() * 50000),
    revenue: Math.random() * 10000,
    lastUpdated: new Date(),
  }));
}

/**
 * Batch upload to multiple platforms
 */
export interface BatchUploadResult {
  success: string[];
  failed: string[];
  pending: string[];
}

export async function batchUploadRelease(
  platforms: string[],
  releaseData: any
): Promise<BatchUploadResult> {
  const results = await Promise.allSettled(
    platforms.map(platform => uploadReleaseToPlatform(platform, releaseData))
  );
  
  const success: string[] = [];
  const failed: string[] = [];
  const pending: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.status === 'processing') {
        pending.push(platforms[index]);
      } else if (result.value.status === 'live') {
        success.push(platforms[index]);
      }
    } else {
      failed.push(platforms[index]);
    }
  });
  
  return { success, failed, pending };
}

/**
 * Validate API credentials
 */
export async function validateApiCredentials(
  platform: string,
  credentials: Record<string, string>
): Promise<boolean> {
  // Mock validation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() > 0.2); // 80% success rate
    }, 500);
  });
}

/**
 * Get platform capabilities
 */
export function getPlatformCapabilities(platformId: string): string[] {
  const platform = STREAMING_PLATFORMS.find(p => p.id === platformId);
  return platform?.capabilities || [];
}

/**
 * Check if platform supports feature
 */
export function platformSupportsFeature(
  platformId: string,
  feature: string
): boolean {
  const capabilities = getPlatformCapabilities(platformId);
  return capabilities.includes(feature);
}

/**
 * Format API error message
 */
export function formatApiError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Retry logic for failed API calls
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  
  constructor(
    private requestsPerSecond: number = 10
  ) {}
  
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        await new Promise(resolve => 
          setTimeout(resolve, 1000 / this.requestsPerSecond)
        );
      }
    }
    
    this.processing = false;
  }
}
