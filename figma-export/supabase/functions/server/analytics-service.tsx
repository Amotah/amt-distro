import * as kv from './kv_store.tsx';
import * as metadataService from './metadata-service.tsx';
import * as userService from './user-service.tsx';

export interface AnalyticsUploadRowInput {
  date?: string;
  platform?: string;
  trackId?: string;
  isrc?: string;
  trackTitle?: string;
  artistName?: string;
  streams?: number;
  listeners?: number;
  revenue?: number;
  territory?: string;
  avgStreamDurationSeconds?: number;
  saves?: number;
  playlistAdds?: number;
  followers?: number;
  ageGroup?: string;
  gender?: string;
}

export interface AnalyticsUploadReport {
  id: string;
  uploadedByUserId: string;
  fileName: string;
  reportType: string;
  platform: string;
  reportMonth: string;
  reportYear: string;
  reportPeriodLabel: string;
  status: 'processed' | 'error';
  recordsProcessed: number;
  matchedRecords: number;
  unmatchedRecords: number;
  totalStreams: number;
  totalListeners: number;
  totalRevenue: number;
  uploadedAt: string;
  updatedAt: string;
}

export interface AnalyticsRecord {
  id: string;
  reportId: string;
  uploadedByUserId: string;
  userId?: string;
  trackId?: string;
  releaseId?: string;
  platform: string;
  date: string;
  reportMonth: string;
  reportYear: string;
  periodKey: string;
  isrc?: string;
  trackTitle?: string;
  artistName?: string;
  streams: number;
  listeners: number;
  revenue: number;
  territory?: string;
  avgStreamDurationSeconds?: number;
  saves: number;
  playlistAdds: number;
  followers: number;
  ageGroup?: string;
  gender?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  metrics: {
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
  };
  trend: Array<{
    date: string;
    label: string;
    streams: number;
    listeners: number;
  }>;
  platformBreakdown: Array<{
    name: string;
    streams: number;
    listeners: number;
    revenue: number;
  }>;
  geographyBreakdown: Array<{
    country: string;
    streams: number;
    percentage: number;
  }>;
  demographics: Array<{
    age: string;
    male: number;
    female: number;
    other: number;
  }>;
  lastUpdated: string | null;
}

export interface AnalyticsCatalogPerformance {
  topSongs: Array<{
    trackId?: string;
    releaseId?: string;
    songName: string;
    platform: string;
    streams: number;
    revenue: number;
  }>;
  topReleases: Array<{
    releaseId: string;
    releaseName: string;
    releaseType: 'ep' | 'album';
    streams: number;
    revenue: number;
    releaseDate: string;
    trend: 'rising' | 'steady' | 'cooling';
  }>;
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleanedValue = value.replace(/,/g, '').trim();
    const parsedValue = Number(cleanedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function normalizePlatformName(value?: string) {
  return normalizeText(value)?.replace(/ analytics$/i, '') || 'Unknown';
}

function normalizeGender(value?: string): 'male' | 'female' | 'other' | undefined {
  const normalizedValue = normalizeText(value)?.toLowerCase();
  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue.startsWith('m')) {
    return 'male';
  }

  if (normalizedValue.startsWith('f')) {
    return 'female';
  }

  return 'other';
}

function normalizeDateValue(value: string | undefined, fallbackMonth: string, fallbackYear: string): string {
  if (value) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  return new Date(`${fallbackYear}-${fallbackMonth}-01T00:00:00.000Z`).toISOString();
}

async function resolveTrackOwnership(input: AnalyticsUploadRowInput): Promise<{
  userId?: string;
  trackId?: string;
  releaseId?: string;
  trackTitle?: string;
  artistName?: string;
}> {
  const providedTrackId = normalizeText(input.trackId);
  let trackId = providedTrackId;

  if (!trackId) {
    const normalizedIsrc = normalizeText(input.isrc);
    if (normalizedIsrc) {
      const foundTrackId = await kv.get<string>(`isrc:track:${normalizedIsrc}`);
      if (typeof foundTrackId === 'string') {
        trackId = foundTrackId;
      }
    }
  }

  if (!trackId) {
    return {
      trackTitle: normalizeText(input.trackTitle),
      artistName: normalizeText(input.artistName),
    };
  }

  const track = await metadataService.getTrackById(trackId);
  if (!track) {
    return {
      trackId,
      trackTitle: normalizeText(input.trackTitle),
      artistName: normalizeText(input.artistName),
    };
  }

  const release = await metadataService.getReleaseById(track.releaseId);

  return {
    userId: release?.userId,
    trackId: track.id,
    releaseId: release?.id,
    trackTitle: normalizeText(input.trackTitle) || track.title,
    artistName: normalizeText(input.artistName) || release?.primaryArtist,
  };
}

export async function ingestAnalyticsReport(input: {
  uploadedByUserId: string;
  fileName: string;
  reportType: string;
  platform?: string;
  reportMonth: string;
  reportYear: string;
  rows: AnalyticsUploadRowInput[];
}): Promise<AnalyticsUploadReport> {
  const normalizedRows = Array.isArray(input.rows) ? input.rows : [];
  if (normalizedRows.length === 0) {
    throw new Error('Analytics upload requires at least one data row');
  }

  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();
  const platform = normalizePlatformName(input.platform || input.reportType);
  const reportPeriodLabel = `${input.reportMonth}/${input.reportYear}`;

  let matchedRecords = 0;
  let unmatchedRecords = 0;
  let totalStreams = 0;
  let totalListeners = 0;
  let totalRevenue = 0;
  let processedRecords = 0;

  for (const row of normalizedRows) {
    const ownership = await resolveTrackOwnership(row);
    const analyticsRecordId = crypto.randomUUID();
    const streams = normalizeNumber(row.streams);
    const listeners = normalizeNumber(row.listeners);
    const revenue = normalizeNumber(row.revenue);
    const saves = normalizeNumber(row.saves);
    const playlistAdds = normalizeNumber(row.playlistAdds);
    const followers = normalizeNumber(row.followers);
    const avgStreamDurationSeconds = normalizeNumber(row.avgStreamDurationSeconds);
    const date = normalizeDateValue(normalizeText(row.date), input.reportMonth, input.reportYear);
    const analyticsRecord: AnalyticsRecord = {
      id: analyticsRecordId,
      reportId,
      uploadedByUserId: input.uploadedByUserId,
      userId: ownership.userId,
      trackId: ownership.trackId,
      releaseId: ownership.releaseId,
      platform: normalizePlatformName(row.platform || platform),
      date,
      reportMonth: input.reportMonth,
      reportYear: input.reportYear,
      periodKey: `${input.reportYear}-${input.reportMonth}`,
      isrc: normalizeText(row.isrc),
      trackTitle: ownership.trackTitle,
      artistName: ownership.artistName,
      streams,
      listeners,
      revenue,
      territory: normalizeText(row.territory),
      avgStreamDurationSeconds: avgStreamDurationSeconds > 0 ? avgStreamDurationSeconds : undefined,
      saves,
      playlistAdds,
      followers,
      ageGroup: normalizeText(row.ageGroup),
      gender: normalizeGender(row.gender),
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`analytics-record:${analyticsRecordId}`, analyticsRecord);
    await kv.set(`analytics-record-report:${reportId}:${analyticsRecordId}`, true);

    if (ownership.userId) {
      await kv.set(`analytics-record-user:${ownership.userId}:${analyticsRecordId}`, true);
      matchedRecords += 1;
    } else {
      unmatchedRecords += 1;
    }

    if (ownership.trackId) {
      await kv.set(`analytics-record-track:${ownership.trackId}:${analyticsRecordId}`, true);
    }

    processedRecords += 1;
    totalStreams += streams;
    totalListeners += listeners;
    totalRevenue += revenue;
  }

  const report: AnalyticsUploadReport = {
    id: reportId,
    uploadedByUserId: input.uploadedByUserId,
    fileName: input.fileName,
    reportType: input.reportType,
    platform,
    reportMonth: input.reportMonth,
    reportYear: input.reportYear,
    reportPeriodLabel,
    status: 'processed',
    recordsProcessed: processedRecords,
    matchedRecords,
    unmatchedRecords,
    totalStreams,
    totalListeners,
    totalRevenue,
    uploadedAt: now,
    updatedAt: now,
  };

  await kv.set(`analytics-upload:${reportId}`, report);
  await kv.set(`analytics-upload-admin:${input.uploadedByUserId}:${reportId}`, true);

  return report;
}

export async function listAnalyticsUploads(limit: number = 50): Promise<AnalyticsUploadReport[]> {
  const reportEntries = await kv.getEntriesByPrefix('analytics-upload:');
  const reports = reportEntries
    .map((entry) => entry.value as AnalyticsUploadReport)
    .filter((report) => report && typeof report === 'object' && typeof report.id === 'string');

  return reports
    .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
    .slice(0, limit);
}

async function loadRecordsForUserId(userId: string): Promise<AnalyticsRecord[]> {
  const recordEntries = await kv.getEntriesByPrefix(`analytics-record-user:${userId}:`);
  const records = await Promise.all(recordEntries.map(async (entry) => {
    const recordId = entry.key.split(':').pop();
    if (!recordId) {
      return null;
    }

    return await kv.get<AnalyticsRecord>(`analytics-record:${recordId}`);
  }));

  return records.filter((record): record is AnalyticsRecord => Boolean(record));
}

async function loadScopedAnalyticsRecords(authUserId: string, range: string): Promise<AnalyticsRecord[]> {
  const profile = await userService.getUserByUserId(authUserId);
  if (!profile) {
    return [];
  }

  const scopedUserId = profile.userId || authUserId;
  const records = await loadRecordsForUserId(scopedUserId);
  return filterRecordsByRange(records, range);
}

function filterRecordsByRange(records: AnalyticsRecord[], range: string): AnalyticsRecord[] {
  if (range === 'all') {
    return records;
  }

  const now = new Date();
  const lowerBound = new Date(now);
  if (range === '7days') {
    lowerBound.setDate(now.getDate() - 7);
  } else if (range === '30days') {
    lowerBound.setDate(now.getDate() - 30);
  } else if (range === '90days') {
    lowerBound.setDate(now.getDate() - 90);
  } else {
    lowerBound.setFullYear(now.getFullYear() - 1);
  }

  return records.filter((record) => new Date(record.date) >= lowerBound);
}

function buildTrendLabel(dateKey: string, useMonthlyLabels: boolean) {
  if (useMonthlyLabels) {
    const [year, month] = dateKey.split('-');
    const labelDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    return labelDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

export async function getAnalyticsSummaryForAuthUser(authUserId: string, range: string): Promise<AnalyticsSummary> {
  const filteredRecords = await loadScopedAnalyticsRecords(authUserId, range);
  const uploadReports = await listAnalyticsUploads(500);

  if (filteredRecords.length === 0) {
    return emptyAnalyticsSummary();
  }

  let totalStreams = 0;
  let reportedListeners = 0;
  let totalRevenue = 0;
  let totalSaves = 0;
  let totalPlaylistAdds = 0;
  let totalFollowers = 0;
  let weightedDurationSum = 0;
  let weightedDurationStreams = 0;

  const territories = new Set<string>();
  const platformMap = new Map<string, { streams: number; listeners: number; revenue: number }>();
  const geographyMap = new Map<string, number>();
  const demographicsMap = new Map<string, { male: number; female: number; other: number }>();
  const useMonthlyTrend = range === 'year' || range === 'all';
  const trendMap = new Map<string, { streams: number; listeners: number }>();

  for (const record of filteredRecords) {
    totalStreams += record.streams;
    reportedListeners += record.listeners;
    totalRevenue += record.revenue;
    totalSaves += record.saves;
    totalPlaylistAdds += record.playlistAdds;
    totalFollowers += record.followers;

    if (record.avgStreamDurationSeconds && record.streams > 0) {
      weightedDurationSum += record.avgStreamDurationSeconds * record.streams;
      weightedDurationStreams += record.streams;
    }

    if (record.territory) {
      territories.add(record.territory);
      geographyMap.set(record.territory, (geographyMap.get(record.territory) || 0) + record.streams);
    }

    const platformBucket = platformMap.get(record.platform) || { streams: 0, listeners: 0, revenue: 0 };
    platformBucket.streams += record.streams;
    platformBucket.listeners += record.listeners;
    platformBucket.revenue += record.revenue;
    platformMap.set(record.platform, platformBucket);

    if (record.ageGroup && record.gender) {
      const demographicBucket = demographicsMap.get(record.ageGroup) || { male: 0, female: 0, other: 0 };
      demographicBucket[record.gender] += record.listeners || record.streams;
      demographicsMap.set(record.ageGroup, demographicBucket);
    }

    const trendKey = useMonthlyTrend
      ? new Date(record.date).toISOString().slice(0, 7)
      : new Date(record.date).toISOString().slice(0, 10);
    const trendBucket = trendMap.get(trendKey) || { streams: 0, listeners: 0 };
    trendBucket.streams += record.streams;
    trendBucket.listeners += record.listeners;
    trendMap.set(trendKey, trendBucket);
  }

  const reportCount = new Set(
    uploadReports
      .filter((report) => filteredRecords.some((record) => record.reportId === report.id))
      .map((report) => report.id)
  ).size;

  const geographyBreakdown = Array.from(geographyMap.entries())
    .map(([country, streams]) => ({
      country,
      streams,
      percentage: totalStreams > 0 ? (streams / totalStreams) * 100 : 0,
    }))
    .sort((left, right) => right.streams - left.streams)
    .slice(0, 6);

  return {
    metrics: {
      totalStreams,
      reportedListeners,
      countries: territories.size,
      avgStreamDurationSeconds: weightedDurationStreams > 0 ? weightedDurationSum / weightedDurationStreams : null,
      totalRevenue,
      totalSaves,
      totalPlaylistAdds,
      totalFollowers,
      records: filteredRecords.length,
      reports: reportCount,
    },
    trend: Array.from(trendMap.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, values]) => ({
        date,
        label: buildTrendLabel(date, useMonthlyTrend),
        streams: values.streams,
        listeners: values.listeners,
      })),
    platformBreakdown: Array.from(platformMap.entries())
      .map(([name, values]) => ({ name, ...values }))
      .sort((left, right) => right.streams - left.streams),
    geographyBreakdown,
    demographics: Array.from(demographicsMap.entries())
      .map(([age, values]) => ({ age, ...values }))
      .sort((left, right) => left.age.localeCompare(right.age)),
    lastUpdated: filteredRecords
      .map((record) => record.updatedAt)
      .sort((left, right) => right.localeCompare(left))[0] || null,
  };
}

function deriveReleaseTrend(monthlyStreams: number[], releaseDate: string): 'rising' | 'steady' | 'cooling' {
  if (monthlyStreams.length >= 2) {
    const latest = monthlyStreams[monthlyStreams.length - 1];
    const previous = monthlyStreams[monthlyStreams.length - 2];

    if (previous <= 0) {
      return latest > 0 ? 'rising' : 'steady';
    }

    const change = (latest - previous) / previous;
    if (change >= 0.15) {
      return 'rising';
    }

    if (change <= -0.15) {
      return 'cooling';
    }
  }

  const parsedReleaseDate = new Date(releaseDate);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  if (!Number.isNaN(parsedReleaseDate.getTime()) && parsedReleaseDate >= ninetyDaysAgo) {
    return 'rising';
  }

  return 'steady';
}

export async function getAnalyticsCatalogPerformanceForAuthUser(authUserId: string, range: string): Promise<AnalyticsCatalogPerformance> {
  const filteredRecords = await loadScopedAnalyticsRecords(authUserId, range);
  if (filteredRecords.length === 0) {
    return {
      topSongs: [],
      topReleases: [],
    };
  }

  const uniqueTrackIds = Array.from(new Set(filteredRecords.map((record) => record.trackId).filter((value): value is string => Boolean(value))));
  const uniqueReleaseIds = Array.from(new Set(filteredRecords.map((record) => record.releaseId).filter((value): value is string => Boolean(value))));
  const trackEntries = await Promise.all(uniqueTrackIds.map(async (trackId) => [trackId, await metadataService.getTrackById(trackId)] as const));
  const releaseEntries = await Promise.all(uniqueReleaseIds.map(async (releaseId) => [releaseId, await metadataService.getReleaseById(releaseId)] as const));

  const trackMap = new Map(trackEntries.flatMap(([trackId, track]) => track ? [[trackId, track] as const] : []));
  const releaseMap = new Map(releaseEntries.flatMap(([releaseId, release]) => release ? [[releaseId, release] as const] : []));

  const songMap = new Map<string, AnalyticsCatalogPerformance['topSongs'][number]>();
  const releasePerformanceMap = new Map<string, {
    releaseId: string;
    releaseName: string;
    releaseType: 'ep' | 'album';
    releaseDate: string;
    streams: number;
    revenue: number;
    monthlyStreams: Map<string, number>;
  }>();

  for (const record of filteredRecords) {
    const track = record.trackId ? trackMap.get(record.trackId) : null;
    const release = record.releaseId ? releaseMap.get(record.releaseId) : null;
    const songName = record.trackTitle || track?.title || 'Untitled Track';
    const songKey = `${record.trackId || songName}:${record.platform}`;
    const songBucket = songMap.get(songKey) || {
      trackId: record.trackId,
      releaseId: record.releaseId,
      songName,
      platform: record.platform,
      streams: 0,
      revenue: 0,
    };

    songBucket.streams += record.streams;
    songBucket.revenue += record.revenue;
    songMap.set(songKey, songBucket);

    if (!release || (release.type !== 'ep' && release.type !== 'album')) {
      continue;
    }

    const releaseBucket = releasePerformanceMap.get(release.id) || {
      releaseId: release.id,
      releaseName: release.title,
      releaseType: release.type,
      releaseDate: release.releaseDate,
      streams: 0,
      revenue: 0,
      monthlyStreams: new Map<string, number>(),
    };

    releaseBucket.streams += record.streams;
    releaseBucket.revenue += record.revenue;

    const monthKey = new Date(record.date).toISOString().slice(0, 7);
    releaseBucket.monthlyStreams.set(monthKey, (releaseBucket.monthlyStreams.get(monthKey) || 0) + record.streams);
    releasePerformanceMap.set(release.id, releaseBucket);
  }

  return {
    topSongs: Array.from(songMap.values())
      .sort((left, right) => right.streams - left.streams)
      .slice(0, 8),
    topReleases: Array.from(releasePerformanceMap.values())
      .map((release) => ({
        releaseId: release.releaseId,
        releaseName: release.releaseName,
        releaseType: release.releaseType,
        streams: release.streams,
        revenue: release.revenue,
        releaseDate: release.releaseDate,
        trend: deriveReleaseTrend(
          Array.from(release.monthlyStreams.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([, streams]) => streams),
          release.releaseDate,
        ),
      }))
      .sort((left, right) => right.streams - left.streams)
      .slice(0, 6),
  };
}

export function emptyAnalyticsSummary(): AnalyticsSummary {
  return {
    metrics: {
      totalStreams: 0,
      reportedListeners: 0,
      countries: 0,
      avgStreamDurationSeconds: null,
      totalRevenue: 0,
      totalSaves: 0,
      totalPlaylistAdds: 0,
      totalFollowers: 0,
      records: 0,
      reports: 0,
    },
    trend: [],
    platformBreakdown: [],
    geographyBreakdown: [],
    demographics: [],
    lastUpdated: null,
  };
}