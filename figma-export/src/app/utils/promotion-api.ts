import { getStoredAccessToken } from './auth-session';
import { BACKEND_API_BASE_URL } from './backend-api-base';

const API_BASE_URL = BACKEND_API_BASE_URL;

export type PromoPlanId = '1-week' | '2-weeks' | '4-weeks';
export type PromotionStatus = 'pending_payment' | 'active' | 'completed';
export type PromotionApprovalStatus = 'pending' | 'approved';
export type PromotionAssetType = 'video' | 'banner' | 'graphic';

export interface UserRelease {
  id: string;
  title: string;
  type: 'single' | 'ep' | 'album';
  primaryArtist: string;
  artworkUrl: string;
  genre: string;
  releaseDate: string;
  status: 'draft' | 'validated' | 'submitted' | 'live' | 'rejected';
}

export interface PromoSubscriptionAsset {
  id: string;
  campaignId: string;
  name: string;
  type: PromotionAssetType;
  sortOrder: number;
  storageBucket?: string | null;
  storagePath?: string | null;
  url?: string | null;
  ready: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoSubscription {
  id: string;
  userId: string;
  email: string;
  planId: PromoPlanId;
  planName: string;
  amount: number;
  displayPrice: string;
  purchasedAt: string;
  expiresAt: string;
  status: PromotionStatus;
  releaseTitle: string;
  artistName: string;
  releaseId?: string | null;
  releaseImageUrl?: string | null;
  releaseType?: string | null;
  releaseGenre?: string | null;
  paymentReference?: string | null;
  adminApprovalStatus: PromotionApprovalStatus;
  approvedAt?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  assets: PromoSubscriptionAsset[];
}

interface SignedUploadTarget {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
}

function getUserToken() {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

function getAdminToken() {
  const token = sessionStorage.getItem('admin_access_token');
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

async function apiCall<T>(endpoint: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const rawBody = await response.text();

    let parsedError: string | null = null;
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as { error?: string; message?: string };
        parsedError = parsed.error || parsed.message || null;
      } catch {
        parsedError = rawBody.trim();
      }
    }

    if (response.status === 404) {
      throw new Error(
        'Promotion API endpoint not found (404). Deploy the latest Supabase Edge Function make-server-79198001 so /promotions is available.',
      );
    }

    const statusPrefix = `API error (${response.status})`;
    throw new Error(parsedError ? `${statusPrefix}: ${parsedError}` : statusPrefix);
  }

  return response.json() as Promise<T>;
}

export async function createPromotionCampaign(input: {
  planId: PromoPlanId;
  releaseTitle: string;
  artistName: string;
  releaseId?: string | null;
  releaseImageUrl?: string | null;
  releaseType?: string | null;
  releaseGenre?: string | null;
}) {
  const result = await apiCall<{ campaign: PromoSubscription }>('/promotions', getUserToken(), {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.campaign;
}

export async function getPromotionCampaigns() {
  const result = await apiCall<{ campaigns: PromoSubscription[] }>('/promotions', getUserToken());
  return result.campaigns;
}

export async function getUserReleasesForPromotion(): Promise<UserRelease[]> {
  const result = await apiCall<{ releases: Array<{
    id: string;
    title: string;
    type: 'single' | 'ep' | 'album';
    primaryArtist: string;
    artworkUrl: string;
    genre: string;
    releaseDate: string;
    status: 'draft' | 'validated' | 'submitted' | 'live' | 'rejected';
  }> }>('/releases', getUserToken());
  return result.releases;
}

export async function getAdminPromotionCampaigns() {
  const result = await apiCall<{ campaigns: PromoSubscription[] }>('/admin/promotions', getAdminToken());
  return result.campaigns;
}

export async function approvePromotionCampaign(campaignId: string, adminNotes?: string) {
  const result = await apiCall<{ campaign: PromoSubscription }>(`/admin/promotions/${campaignId}`, getAdminToken(), {
    method: 'PUT',
    body: JSON.stringify({ approve: true, adminNotes }),
  });
  return result.campaign;
}

export async function updatePromotionCampaign(campaignId: string, updates: {
  adminNotes?: string;
  status?: PromotionStatus;
}) {
  const result = await apiCall<{ campaign: PromoSubscription }>(`/admin/promotions/${campaignId}`, getAdminToken(), {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.campaign;
}

export async function createPromotionAssetUploadTarget(campaignId: string, assetId: string, file: File) {
  const result = await apiCall<{ target: SignedUploadTarget }>(
    `/admin/promotions/${campaignId}/assets/${assetId}/upload-target`,
    getAdminToken(),
    {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
      }),
    },
  );

  return result.target;
}

export async function uploadPromotionAssetFile(signedUrl: string, file: File) {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}

export async function finalizePromotionAssetUpload(campaignId: string, assetId: string, path: string) {
  const result = await apiCall<{ campaign: PromoSubscription }>(
    `/admin/promotions/${campaignId}/assets/${assetId}/finalize`,
    getAdminToken(),
    {
      method: 'POST',
      body: JSON.stringify({ path, ready: true }),
    },
  );

  return result.campaign;
}
