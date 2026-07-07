import { getStoredAccessToken } from './auth-session';
import { getSupabaseClient } from '../../../utils/supabase/client';
import { BACKEND_API_BASE_URL } from './backend-api-base';

/**
 * User API Client
 * Handles user-specific API calls (profile, settings, etc.)
 * Uses regular user auth token instead of admin token
 */

const API_BASE_URL = BACKEND_API_BASE_URL;
const USER_PROFILE_ENDPOINTS = ['/users/profile', '/users/me'] as const;
const RELEASE_CACHE_STORAGE_KEY = 'amtdistro-release-cache';

// Get user auth token — always prefer the live Supabase session so we never
// send expired tokens after the 1-hour JWT lifetime.
async function getUserAuthToken(): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Keep sessionStorage/localStorage in sync
      sessionStorage.setItem('access_token', session.access_token);
      return session.access_token;
    }
  } catch {
    // fall through to legacy fallback
  }
  const token = getStoredAccessToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

type ReleaseCacheRecord = {
  releases: Release[];
  tracksByReleaseId: Record<string, ReleaseTrack[]>;
  deliveriesByReleaseId: Record<string, DSPDelivery[]>;
  updatedAt: string;
};

type ReleaseCacheMap = Record<string, ReleaseCacheRecord>;

function getCurrentUserId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.sessionStorage.getItem('user_id') || '';
}

function readReleaseCacheMap(): ReleaseCacheMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(RELEASE_CACHE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ReleaseCacheMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeReleaseCacheMap(cacheMap: ReleaseCacheMap) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(RELEASE_CACHE_STORAGE_KEY, JSON.stringify(cacheMap));
  } catch {
    // Ignore storage errors and keep network behavior intact.
  }
}

function updateReleaseCache(mutator: (current: ReleaseCacheRecord) => ReleaseCacheRecord) {
  const userId = getCurrentUserId();
  if (!userId) {
    return;
  }

  const cacheMap = readReleaseCacheMap();
  const current = cacheMap[userId] || {
    releases: [],
    tracksByReleaseId: {},
    deliveriesByReleaseId: {},
    updatedAt: new Date().toISOString(),
  };

  cacheMap[userId] = {
    ...mutator(current),
    updatedAt: new Date().toISOString(),
  };

  writeReleaseCacheMap(cacheMap);
}

function upsertCachedRelease(release: Release) {
  updateReleaseCache((current) => {
    const releases = current.releases.some((item) => item.id === release.id)
      ? current.releases.map((item) => item.id === release.id ? { ...item, ...release } : item)
      : [release, ...current.releases];

    return {
      ...current,
      releases,
    };
  });
}

function removeCachedTrack(track: ReleaseTrack) {
  updateReleaseCache((current) => {
    const releaseTracks = current.tracksByReleaseId[track.releaseId] || [];
    return {
      ...current,
      tracksByReleaseId: {
        ...current.tracksByReleaseId,
        [track.releaseId]: releaseTracks.filter((item) => item.id !== track.id),
      },
    };
  });
}

function upsertCachedTrack(track: ReleaseTrack) {
  updateReleaseCache((current) => {
    const releaseTracks = current.tracksByReleaseId[track.releaseId] || [];
    const nextTracks = releaseTracks.some((item) => item.id === track.id)
      ? releaseTracks.map((item) => item.id === track.id ? { ...item, ...track } : item)
      : [...releaseTracks, track];

    return {
      ...current,
      tracksByReleaseId: {
        ...current.tracksByReleaseId,
        [track.releaseId]: nextTracks,
      },
    };
  });
}

export function getCachedUserReleases(): Release[] {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const cacheMap = readReleaseCacheMap();
  return cacheMap[userId]?.releases || [];
}

export function getCachedReleaseDetails(releaseId: string): { release: Release | null; tracks: ReleaseTrack[] } {
  const userId = getCurrentUserId();
  if (!userId) {
    return { release: null, tracks: [] };
  }

  const cacheMap = readReleaseCacheMap();
  const cache = cacheMap[userId];
  if (!cache) {
    return { release: null, tracks: [] };
  }

  return {
    release: cache.releases.find((item) => item.id === releaseId) || null,
    tracks: cache.tracksByReleaseId[releaseId] || [],
  };
}

export function getCachedReleaseDeliveries(releaseId: string): DSPDelivery[] {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const cacheMap = readReleaseCacheMap();
  return cacheMap[userId]?.deliveriesByReleaseId[releaseId] || [];
}

// Generic API call helper for user endpoints
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getUserAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

async function apiCallWithToken<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

async function tryUserProfileEndpoints<T>(
  token: string,
  options: RequestInit = {}
): Promise<T> {
  let lastError: Error | null = null;

  for (const endpoint of USER_PROFILE_ENDPOINTS) {
    try {
      return await apiCallWithToken<T>(endpoint, token, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  throw lastError || new Error('Unable to load user profile');
}

// ==================== USER PROFILE ====================

export interface UserProfile {
  id: string;
  userId: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  artistName?: string;
  labelName?: string;
  role: 'artist' | 'partner' | 'admin';
  subscriptionTier: 'artist' | 'super_artist' | 'partner';
  isVerified: boolean;
  country?: string;
  state?: string;
  bio?: string;
  genres?: string[];
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };
  verificationStatus?: 'verified' | 'pending' | 'unverified';
  verification?: {
    emailConfirmed: boolean;
    idVerified: boolean;
    idVerificationOptional: boolean;
    profileReviewed: boolean;
    idDocumentUrl?: string;
    requestNotes?: string;
    requestedAt?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  };
  removedArtists?: Array<{
    artistId: string;
    artistName?: string;
    artistEmail?: string;
    retentionOption: 'retain-all' | 'retain-financials' | 'remove-roster-only';
    reason?: string;
    removedAt: string;
  }>;
  profileImage?: string;
  bannerImage?: string;
  createdAt: string;
  updatedAt: string;
}

export const CURRENT_USER_PROFILE_UPDATED_EVENT = 'amtdistro:user-profile-updated';

export function syncStoredCurrentUserProfile(profile: UserProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem('user_role', profile.role);
  window.sessionStorage.setItem('user_id', profile.userId || profile.id);
  window.sessionStorage.setItem('user_subscription_tier', profile.subscriptionTier);

  if (profile.role !== 'admin') {
    window.sessionStorage.removeItem('admin_role');
    window.sessionStorage.removeItem('admin_permissions');
  }

  window.dispatchEvent(new CustomEvent(CURRENT_USER_PROFILE_UPDATED_EVENT, {
    detail: {
      role: profile.role,
      subscriptionTier: profile.subscriptionTier,
    },
  }));
}

/**
 * Get the current logged-in user's profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const result = await tryUserProfileEndpoints<{ user: UserProfile }>(await getUserAuthToken());
  syncStoredCurrentUserProfile(result.user);
  return result.user;
}

/**
 * Update the current logged-in user's profile
 */
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const result = await tryUserProfileEndpoints<{ user: UserProfile }>(await getUserAuthToken(), {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  syncStoredCurrentUserProfile(result.user);
  return result.user;
}

export async function getCurrentUserProfileWithToken(token: string): Promise<UserProfile> {
  const result = await tryUserProfileEndpoints<{ user: UserProfile }>(token);
  syncStoredCurrentUserProfile(result.user);
  return result.user;
}

export async function createArtistProfileWithToken(
  token: string,
  data: {
    email: string;
    artistName: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    bannerImage?: string;
    subscriptionTier?: UserProfile['subscriptionTier'];
  }
): Promise<UserProfile> {
  const result = await apiCallWithToken<{ artist: UserProfile }>('/users/artist', token, {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      artistName: data.artistName,
      firstName: data.firstName,
      lastName: data.lastName,
      profileImage: data.profileImage,
      bannerImage: data.bannerImage,
      subscriptionTier: data.subscriptionTier || 'artist',
    }),
  });

  syncStoredCurrentUserProfile(result.artist);
  return result.artist;
}

export async function createArtistProfile(
  data: {
    email: string;
    artistName: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    bannerImage?: string;
    subscriptionTier?: UserProfile['subscriptionTier'];
  }
): Promise<UserProfile> {
  return createArtistProfileWithToken(getUserAuthToken(), data);
}

export async function createLabelProfileWithToken(
  token: string,
  data: {
    email: string;
    labelName: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    bannerImage?: string;
    description?: string;
    website?: string;
  }
): Promise<UserProfile> {
  const result = await apiCallWithToken<{ label: UserProfile }>('/users/label', token, {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      labelName: data.labelName,
      firstName: data.firstName,
      lastName: data.lastName,
      profileImage: data.profileImage,
      bannerImage: data.bannerImage,
      description: data.description,
      website: data.website,
    }),
  });

  syncStoredCurrentUserProfile(result.label);
  return result.label;
}

export async function createLabelProfile(
  data: {
    email: string;
    labelName: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    bannerImage?: string;
    description?: string;
    website?: string;
  }
): Promise<UserProfile> {
  return createLabelProfileWithToken(getUserAuthToken(), data);
}

export async function createManagedArtistAccount(
  data: {
    email: string;
    artistName: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    bannerImage?: string;
    password?: string;
    defaultPassword?: string;
  }
): Promise<UserProfile> {
  const result = await apiCall<{ artist: UserProfile }>('/users/label/artists/create', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      artistName: data.artistName,
      firstName: data.firstName,
      lastName: data.lastName,
      profileImage: data.profileImage,
      bannerImage: data.bannerImage,
      password: data.password,
      defaultPassword: data.defaultPassword,
    }),
  });

  return result.artist;
}

export async function getLabelArtists(): Promise<UserProfile[]> {
  const result = await apiCall<{ artists: UserProfile[] }>('/users/label/artists');
  return result.artists;
}

export async function linkArtistAccountToLabel(email: string): Promise<UserProfile> {
  const result = await apiCall<{ artist: UserProfile; artists: UserProfile[] }>('/users/label/artists/link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  return result.artist;
}

export async function updateLabelArtistVerification(
  artistId: string,
  verification: Partial<NonNullable<UserProfile['verification']>>
): Promise<UserProfile> {
  const result = await apiCall<{ artist: UserProfile }>(`/users/label/artists/${artistId}/verification`, {
    method: 'PUT',
    body: JSON.stringify({ verification }),
  });

  return result.artist;
}

export async function removeLabelArtist(
  artistId: string,
  retentionOption: 'retain-all' | 'retain-financials' | 'remove-roster-only',
  reason?: string,
): Promise<UserProfile[]> {
  const result = await apiCall<{ artists: UserProfile[] }>(`/users/label/artists/${artistId}/remove`, {
    method: 'POST',
    body: JSON.stringify({ retentionOption, reason }),
  });

  return result.artists;
}

/**
 * Change user password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  const result = await apiCall<{ success: boolean }>('/users/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return result;
}

/**
 * Get user statistics (uploads, streams, earnings)
 */
export interface UserStats {
  totalUploads: number;
  totalStreams: number;
  totalEarnings: number;
  monthlyStreams: number;
  monthlyEarnings: number;
  recentReleases: number;
}

export async function getUserStats(): Promise<UserStats> {
  const result = await apiCall<{ stats: UserStats }>('/users/stats');
  return result.stats;
}

// ==================== RELEASES ====================

export interface Release {
  id: string;
  userId: string;
  upc?: string;
  upcRequested?: boolean;
  title: string;
  version?: string;
  type: 'single' | 'ep' | 'album';
  artworkPath: string;
  artworkUrl: string;
  primaryArtist: string;
  featuredArtists?: string[];
  label?: string;
  releaseDate: string;
  originalReleaseDate?: string;
  genre: string;
  subgenre?: string;
  copyrightYear: number;
  copyrightText: string;
  publishingRights: string;
  language: string;
  trackIds: string[];
  status: 'draft' | 'validated' | 'submitted' | 'live' | 'rejected' | 'processing';
  validationErrors?: string[];
  createdAt: string;
  updatedAt: string;
  audioPreviewUrl?: string;
  audioFileName?: string;
  selectedPlatforms?: string[];
}

export interface TrackContributor {
  id: string;
  name: string;
  role: 'primary_artist' | 'featured_artist' | 'producer' | 'composer' | 'lyricist' | 'remixer';
}

export interface ReleaseTrack {
  id: string;
  releaseId: string;
  title: string;
  version?: string;
  trackNumber: number;
  discNumber: number;
  duration: number;
  isrc?: string;
  isrcRequested?: boolean;
  language: string;
  explicit: boolean;
  genre: string;
  subgenre?: string;
  contributors: TrackContributor[];
  lyrics?: string;
  audioFilePath: string;
  audioFileUrl: string;
  previewStart?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DSPDelivery {
  id: string;
  releaseId: string;
  platform: string;
  status: 'pending' | 'processing' | 'delivered' | 'ingested' | 'live' | 'failed' | 'rejected' | 'takedown';
  ddexXml?: string;
  submittedAt?: string;
  deliveredAt?: string;
  goLiveDate?: string;
  platformReleaseId?: string;
  platformUrl?: string;
  errorMessage?: string;
  retryCount: number;
  lastStatusCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionBatch {
  id: string;
  releaseId: string;
  userId: string;
  platforms: string[];
  deliveryIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export async function getUserReleases(): Promise<Release[]> {
  const result = await apiCall<{ releases: Release[] }>('/releases');
  updateReleaseCache((current) => ({
    ...current,
    releases: result.releases,
  }));
  return result.releases;
}

export async function getReleaseById(releaseId: string): Promise<{ release: Release; tracks: ReleaseTrack[] }> {
  const result = await apiCall<{ release: Release; tracks: ReleaseTrack[] }>(`/releases/${releaseId}`);
  upsertCachedRelease(result.release);
  updateReleaseCache((current) => ({
    ...current,
    tracksByReleaseId: {
      ...current.tracksByReleaseId,
      [releaseId]: result.tracks,
    },
  }));
  return result;
}

export async function createRelease(data: Omit<Release, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Release> {
  const result = await apiCall<{ release: Release }>('/releases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  upsertCachedRelease(result.release);
  return result.release;
}

export async function updateRelease(releaseId: string, updates: Partial<Release>): Promise<Release> {
  const result = await apiCall<{ release: Release }>(`/releases/${releaseId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  upsertCachedRelease(result.release);
  return result.release;
}

export async function createReleaseTrack(
  releaseId: string,
  data: Omit<ReleaseTrack, 'id' | 'createdAt' | 'updatedAt' | 'releaseId'>
): Promise<ReleaseTrack> {
  const result = await apiCall<{ track: ReleaseTrack }>(`/releases/${releaseId}/tracks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  upsertCachedTrack(result.track);
  return result.track;
}

export async function updateReleaseTrack(trackId: string, updates: Partial<ReleaseTrack>): Promise<ReleaseTrack> {
  const result = await apiCall<{ track: ReleaseTrack }>(`/tracks/${trackId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  upsertCachedTrack(result.track);
  return result.track;
}

export async function deleteReleaseTrack(trackId: string): Promise<{ success: boolean; track: ReleaseTrack }> {
  const result = await apiCall<{ success: boolean; track: ReleaseTrack }>(`/tracks/${trackId}`, {
    method: 'DELETE',
  });
  removeCachedTrack(result.track);
  return result;
}

export async function distributeRelease(releaseId: string, platforms: string[]): Promise<DistributionBatch> {
  const result = await apiCall<{ batch: DistributionBatch }>(`/releases/${releaseId}/distribute`, {
    method: 'POST',
    body: JSON.stringify({ platforms }),
  });
  return result.batch;
}

export async function getReleaseDeliveries(releaseId: string): Promise<DSPDelivery[]> {
  const result = await apiCall<{ deliveries: DSPDelivery[] }>(`/releases/${releaseId}/deliveries`);
  updateReleaseCache((current) => ({
    ...current,
    deliveriesByReleaseId: {
      ...current.deliveriesByReleaseId,
      [releaseId]: result.deliveries,
    },
  }));
  return result.deliveries;
}
