import { projectId } from '../../../utils/supabase/info';
import { getStoredAccessToken } from './auth-session';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-79198001`;

export interface ListenerCatalogTrack {
  id: string;
  releaseId: string;
  title: string;
  artistName: string;
  artworkUrl: string;
  audioUrl: string;
  duration: number;
  genre: string;
  playCount: number;
  downloadCount: number;
  qualifiedPlayCount: number;
  isDownloadable: boolean;
}

export interface ListenerCatalogRelease {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string;
  releaseDate: string;
  type: 'single' | 'ep' | 'album';
  genre: string;
  trackCount: number;
  totalStreams: number;
  totalDownloads: number;
}

export interface ListenerCatalogArtist {
  slug: string;
  name: string;
  genre: string;
  releaseCount: number;
  totalStreams: number;
}

export interface ListenerCatalogResponse {
  summary: {
    liveReleases: number;
    streamableTracks: number;
    artists: number;
    totalQualifiedStreams: number;
    totalDownloads: number;
  };
  featuredReleases: ListenerCatalogRelease[];
  trendingTracks: ListenerCatalogTrack[];
  spotlightArtists: ListenerCatalogArtist[];
  genreHighlights: Array<{ genre: string; releases: number }>;
}

export interface ListenerSummaryResponse {
  library: {
    savedTracks: number;
    downloads: number;
    followedArtists: number;
  };
  rewards: {
    availableBalance: number;
    pendingBalance: number;
    lifetimeEarned: number;
    qualifiedStreams: number;
    qualifiedDownloads: number;
  };
  recentDownloads: Array<{
    id: string;
    trackId: string;
    title: string;
    artistName: string;
    createdAt: string;
  }>;
  savedTrackPreview: Array<{
    id: string;
    trackId: string;
    title: string;
    artistName: string;
    createdAt: string;
  }>;
  followedArtistPreview: Array<{
    id: string;
    artistName: string;
    createdAt: string;
  }>;
  recentRewardTransactions: Array<{
    id: string;
    amount: number;
    transactionType: string;
    status: string;
    createdAt: string;
  }>;
}

export interface ArtistListenerMonetizationSummary {
  qualifiedStreams: number;
  qualifiedDownloads: number;
  grossRevenue: number;
  netArtistRevenue: number;
  listenerRewardsFunded: number;
  platformFees: number;
  recentEntries: Array<{
    id: string;
    trackId: string;
    title: string;
    artistName: string;
    revenueType: string;
    netArtistAmount: number;
    createdAt: string;
  }>;
}

export interface RecordListenerEventPayload {
  trackId: string;
  releaseId: string;
  artistName: string;
  eventType: 'play_start' | 'play_progress' | 'play_complete' | 'download' | 'save' | 'follow' | 'share';
  listenedSeconds?: number;
  completionRate?: number;
  sessionId: string;
  deviceFingerprint: string;
  sourcePlatform?: string;
  country?: string;
  deviceType?: string;
  metadata?: Record<string, unknown>;
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}, requireAuth = false): Promise<T> {
  const token = getStoredAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = 'Bearer ' + token;
  } else if (requireAuth) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export function buildListenerSessionId() {
  if (typeof window === 'undefined') {
    return 'server-session';
  }

  const key = 'amtdistro-listener-session-id';
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = `sess-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function buildListenerDeviceFingerprint() {
  if (typeof window === 'undefined') {
    return 'server-device';
  }

  const key = 'amtdistro-listener-device-id';
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = `dev-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function getListenerDeviceType() {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export async function getListenerCatalog() {
  return apiCall<ListenerCatalogResponse>('/listener/catalog');
}

export async function recordListenerEvent(payload: RecordListenerEventPayload) {
  return apiCall<{
    eventId: string;
    isQualified: boolean;
    qualificationReason: string;
    estimatedArtistPayout: number;
    estimatedListenerReward: number;
  }>('/listener/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getListenerSummary() {
  return apiCall<ListenerSummaryResponse>('/listener/summary', {}, true);
}

export async function getArtistListenerMonetizationSummary() {
  const result = await apiCall<{ summary: ArtistListenerMonetizationSummary }>('/listener/artist-monetization', {}, true);
  return result.summary;
}
