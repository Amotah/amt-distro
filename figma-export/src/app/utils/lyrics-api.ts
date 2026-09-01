import { projectId } from '../../../utils/supabase/info';
import { getSupabaseClient } from '../../../utils/supabase/client';
import { getStoredAccessToken } from './auth-session';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-79198001`;

export interface LyricsEntry {
  id: string;
  track_id: string;
  artist_id?: string | null;
  release_id?: string | null;
  title: string;
  artist_name: string;
  album_name?: string | null;
  lyrics_text: string;
  synced_lyrics?: string | null;
  lyrics_language: string;
  isrc?: string | null;
  upc?: string | null;
  genre?: string | null;
  release_date?: string | null;
  artwork_url?: string | null;
  source: 'upload' | 'admin-import' | 'artist-submission' | 'public-submission' | 'public-request';
  lyrics_type: 'plain' | 'synced';
  copyright_status: 'uncleared' | 'review-required' | 'cleared';
  verification_status: 'pending' | 'verified' | 'rejected';
  is_published: boolean;
  streaming_links?: Record<string, string>;
  view_count: number;
  stream_count: number;
  submitter_name?: string | null;
  submitter_email?: string | null;
  request_note?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface LyricsListResult {
  data: LyricsEntry[];
  count: number;
}

export interface SearchableTrack {
  trackId: string;
  title: string;
  artistName: string;
  albumName: string;
  artworkUrl: string;
  genre?: string;
  releaseDate?: string;
}

// Same Supabase Auth session backs both regular users and admins in this app.
async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch {
    // fall through to storage fallback
  }
  return getStoredAccessToken() || sessionStorage.getItem('admin_access_token');
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (requireAuth) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

/** URL-safe, lowercase, hyphenated slug used for /lyrics/:artistSlug/:songSlug style links. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

// ── Public catalog (no auth) ─────────────────────────────────────────────

export async function getPublicLyrics(params: {
  search?: string;
  genre?: string;
  language?: string;
  sort?: 'trending' | 'latest';
  limit?: number;
  offset?: number;
} = {}): Promise<LyricsListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'All') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiCall<LyricsListResult>(`/lyrics/public${suffix}`, {}, false);
}

export async function getPublicLyricsById(lyricsId: string): Promise<{ lyrics: LyricsEntry }> {
  return apiCall<{ lyrics: LyricsEntry }>(`/lyrics/public/${lyricsId}`, {}, false);
}

export async function getPublicLyricsByArtist(artistSlug: string): Promise<LyricsListResult> {
  return apiCall<LyricsListResult>(`/lyrics/public/artist/${encodeURIComponent(artistSlug)}`, {}, false);
}

export async function getPublicLyricsByAlbum(albumSlug: string): Promise<LyricsListResult> {
  return apiCall<LyricsListResult>(`/lyrics/public/album/${encodeURIComponent(albumSlug)}`, {}, false);
}

/** Search the live (publicly released) catalog for a track to attach a submission/request to. */
export async function searchLiveTracks(query: string): Promise<SearchableTrack[]> {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  const result = await apiCall<{ tracks: SearchableTrack[] }>(`/lyrics/search-tracks${suffix}`, {}, false);
  return result.tracks;
}

/** Anyone (signed in or not) can submit full lyrics or request lyrics for a live track. */
export async function submitPublicLyrics(input: {
  trackId: string;
  mode: 'submit' | 'request';
  lyricsText?: string;
  requestNote?: string;
  submitterName?: string;
  submitterEmail?: string;
  language?: string;
}): Promise<{ lyrics: LyricsEntry; isRequest: boolean }> {
  return apiCall('/lyrics/public/submit', { method: 'POST', body: JSON.stringify(input) }, false);
}

// ── Signed-in user: submit / manage own lyrics ───────────────────────────

export async function submitLyrics(input: {
  trackId: string;
  lyricsText?: string;
  requestNote?: string;
  isRequest?: boolean;
  language?: string;
}): Promise<{ lyrics: LyricsEntry; isRequest: boolean }> {
  return apiCall('/lyrics', { method: 'POST', body: JSON.stringify(input) });
}

export async function getMyLyrics(verificationStatus?: string): Promise<LyricsListResult> {
  const suffix = verificationStatus ? `?verificationStatus=${encodeURIComponent(verificationStatus)}` : '';
  return apiCall<LyricsListResult>(`/lyrics/mine${suffix}`);
}

export async function getMyLyricsEntry(lyricsId: string): Promise<{ lyrics: LyricsEntry }> {
  return apiCall(`/lyrics/${lyricsId}`);
}

export async function updateMyLyrics(lyricsId: string, updates: {
  lyricsText?: string;
  language?: string;
  genre?: string;
}): Promise<{ lyrics: LyricsEntry }> {
  return apiCall(`/lyrics/${lyricsId}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deleteMyLyrics(lyricsId: string): Promise<{ success: boolean }> {
  return apiCall(`/lyrics/${lyricsId}`, { method: 'DELETE' });
}

// ── Admin: manage all lyrics ──────────────────────────────────────────────

export async function getAdminLyrics(params: {
  verificationStatus?: string;
  genre?: string;
  language?: string;
  artistName?: string;
  search?: string;
  isPublished?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<LyricsListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiCall<LyricsListResult>(`/admin/lyrics${suffix}`);
}

export async function createAdminLyrics(input: {
  trackId: string;
  title?: string;
  artistName?: string;
  albumName?: string;
  lyricsText: string;
  language?: string;
  genre?: string;
}): Promise<{ lyrics: LyricsEntry }> {
  return apiCall('/admin/lyrics', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateAdminLyrics(lyricsId: string, updates: {
  title?: string;
  lyricsText?: string;
  albumName?: string;
  genre?: string;
  language?: string;
  artworkUrl?: string;
  copyrightStatus?: 'uncleared' | 'review-required' | 'cleared';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  isPublished?: boolean;
}): Promise<{ lyrics: LyricsEntry }> {
  return apiCall(`/admin/lyrics/${lyricsId}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function deleteAdminLyrics(lyricsId: string): Promise<{ success: boolean }> {
  return apiCall(`/admin/lyrics/${lyricsId}`, { method: 'DELETE' });
}
