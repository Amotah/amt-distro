import { getStoredAccessToken } from './auth-session';
import { BACKEND_API_BASE_URL } from './backend-api-base';

const API_BASE_URL = BACKEND_API_BASE_URL;

export interface AnalyticsMetricSummary {
  totalStreams: number;
  reportedListeners: number;
  countries: number;
  avgStreamDurationSeconds: number | null;
  totalRevenue: number;
  totalSaves: number;
  totalPlaylistAdds: number;
  totalFollowers: number;
  records: number;
  reports: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  label: string;
  streams: number;
  listeners: number;
}

export interface AnalyticsPlatformPoint {
  name: string;
  streams: number;
  listeners: number;
  revenue: number;
}

export interface AnalyticsGeographyPoint {
  country: string;
  streams: number;
  percentage: number;
}

export interface AnalyticsDemographicPoint {
  age: string;
  male: number;
  female: number;
  other: number;
}

export interface AnalyticsSummary {
  metrics: AnalyticsMetricSummary;
  trend: AnalyticsTrendPoint[];
  platformBreakdown: AnalyticsPlatformPoint[];
  geographyBreakdown: AnalyticsGeographyPoint[];
  demographics: AnalyticsDemographicPoint[];
  lastUpdated: string | null;
}

export interface AnalyticsTopSong {
  trackId?: string;
  releaseId?: string;
  songName: string;
  platform: string;
  streams: number;
  revenue: number;
}

export interface AnalyticsTopRelease {
  releaseId: string;
  releaseName: string;
  releaseType: 'ep' | 'album';
  streams: number;
  revenue: number;
  releaseDate: string;
  trend: 'rising' | 'steady' | 'cooling';
}

export interface AnalyticsCatalogPerformance {
  topSongs: AnalyticsTopSong[];
  topReleases: AnalyticsTopRelease[];
}

function getUserAuthToken(): string {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return token;
}

async function analyticsApiCall<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${getUserAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function getAnalyticsSummary(range: string) {
  const query = new URLSearchParams({ range });
  const result = await analyticsApiCall<{ summary: AnalyticsSummary }>(`/analytics/summary?${query.toString()}`);
  return result.summary;
}

export async function getAnalyticsCatalogPerformance(range: string) {
  const query = new URLSearchParams({ range });
  const result = await analyticsApiCall<{ performance: AnalyticsCatalogPerformance }>(`/analytics/catalog-performance?${query.toString()}`);
  return result.performance;
}