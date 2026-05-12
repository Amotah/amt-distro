import * as kv from './kv_store.tsx';
import * as metadataService from './metadata-service.tsx';

/**
 * Royalty Service
 * Handles report ingestion, split calculations, and earnings tracking
 */

export interface RoyaltySplit {
  userId: string;
  percentage: number;
  role: 'artist' | 'producer' | 'composer' | 'label' | 'publisher';
  name: string;
}

export interface StreamingReport {
  id: string;
  platform: string;
  reportDate: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  isrc: string;
  trackId?: string;
  trackTitle: string;
  artistName: string;
  streams: number;
  revenue: number; // in Naira
  territory: string;
  rawData: any;
  processedAt: string;
  createdAt: string;
}

export interface Earning {
  id: string;
  userId: string;
  trackId: string;
  releaseId: string;
  platform: string;
  reportId: string;
  period: string;
  streams: number;
  grossRevenue: number; // Total before splits
  netRevenue: number; // After splits
  splitPercentage: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  createdAt: string;
  updatedAt: string;
}

export interface UserBalance {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  lastPayoutDate?: string;
  lastPayoutAmount?: number;
  currency: 'NGN';
  updatedAt: string;
}

export interface RoyaltyUploadRowInput {
  reportDate?: string;
  isrc?: string;
  trackTitle?: string;
  artistName?: string;
  streams?: number;
  revenue?: number;
  territory?: string;
}

export interface RoyaltyUploadBatch {
  id: string;
  uploadedByUserId: string;
  fileName: string;
  reportType: 'royalties';
  platform: string;
  reportMonth: string;
  reportYear: string;
  reportPeriodLabel: string;
  status: 'processed' | 'error';
  recordsProcessed: number;
  matchedRecords: number;
  unmatchedRecords: number;
  earningsCreated: number;
  totalStreams: number;
  totalRevenue: number;
  uploadedAt: string;
  updatedAt: string;
  fileSizeBytes?: number;
  errorMessage?: string;
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
    const normalizedValue = value.replace(/,/g, '').trim();
    const numericValue = Number(normalizedValue);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return 0;
}

function getReportPeriodBounds(reportMonth: string, reportYear: string) {
  const monthIndex = Math.max(1, Math.min(12, Number(reportMonth) || 1));
  const numericYear = Number(reportYear) || new Date().getUTCFullYear();
  const startDate = new Date(Date.UTC(numericYear, monthIndex - 1, 1));
  const endDate = new Date(Date.UTC(numericYear, monthIndex, 0));

  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

// Parse CSV streaming report (generic format)
export function parseCSVReport(csvContent: string): Partial<StreamingReport>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Invalid CSV format: No data rows');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const reports: Partial<StreamingReport>[] = [];

  // Expected headers: isrc, track_title, artist_name, streams, revenue, territory, report_date
  const isrcIdx = headers.findIndex(h => h.includes('isrc'));
  const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('track'));
  const artistIdx = headers.findIndex(h => h.includes('artist'));
  const streamsIdx = headers.findIndex(h => h.includes('stream'));
  const revenueIdx = headers.findIndex(h => h.includes('revenue') || h.includes('earning'));
  const territoryIdx = headers.findIndex(h => h.includes('territory') || h.includes('country'));
  const dateIdx = headers.findIndex(h => h.includes('date'));

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < headers.length) continue;

    reports.push({
      isrc: values[isrcIdx] || '',
      trackTitle: values[titleIdx] || '',
      artistName: values[artistIdx] || '',
      streams: parseInt(values[streamsIdx]) || 0,
      revenue: parseFloat(values[revenueIdx]) || 0,
      territory: values[territoryIdx] || 'Unknown',
      reportDate: values[dateIdx] || new Date().toISOString(),
    });
  }

  return reports;
}

// Ingest streaming report
export async function ingestStreamingReport(
  platform: string,
  reportPeriod: { start: string; end: string },
  reports: Partial<StreamingReport>[]
): Promise<string[]> {
  const reportIds: string[] = [];

  for (const report of reports) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Try to find track by ISRC
    let trackId: string | undefined;
    if (report.isrc) {
      const foundTrackId = await kv.get(`isrc:track:${report.isrc}`);
      if (typeof foundTrackId === 'string') {
        trackId = foundTrackId;
      }
    }

    const streamingReport: StreamingReport = {
      id,
      platform,
      reportDate: report.reportDate || now,
      reportPeriod,
      isrc: report.isrc || '',
      trackId,
      trackTitle: report.trackTitle || '',
      artistName: report.artistName || '',
      streams: report.streams || 0,
      revenue: report.revenue || 0,
      territory: report.territory || 'Unknown',
      rawData: report,
      processedAt: now,
      createdAt: now,
    };

    await kv.set(`report:${id}`, streamingReport);
    await kv.set(`report:platform:${platform}:${id}`, true);
    
    if (trackId) {
      await kv.set(`report:track:${trackId}:${id}`, true);
    }

    reportIds.push(id);
  }

  return reportIds;
}

export async function ingestRoyaltyUploadBatch(input: {
  uploadedByUserId: string;
  fileName: string;
  platform: string;
  reportMonth: string;
  reportYear: string;
  rows: RoyaltyUploadRowInput[];
  fileSizeBytes?: number;
}): Promise<RoyaltyUploadBatch> {
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    throw new Error('Royalty upload requires at least one data row');
  }

  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const reportPeriod = getReportPeriodBounds(input.reportMonth, input.reportYear);
  const reportIds = await ingestStreamingReport(
    input.platform,
    reportPeriod,
    input.rows.map((row) => ({
      reportDate: normalizeText(row.reportDate),
      isrc: normalizeText(row.isrc),
      trackTitle: normalizeText(row.trackTitle),
      artistName: normalizeText(row.artistName),
      streams: normalizeNumber(row.streams),
      revenue: normalizeNumber(row.revenue),
      territory: normalizeText(row.territory) || 'Unknown',
    }))
  );

  let matchedRecords = 0;
  let unmatchedRecords = 0;
  let earningsCreated = 0;
  let totalStreams = 0;
  let totalRevenue = 0;
  const processingErrors: string[] = [];

  for (const reportId of reportIds) {
    await kv.set(`royalty-batch-report:${batchId}:${reportId}`, true);

    const report = await kv.get<StreamingReport>(`report:${reportId}`);
    if (!report) {
      continue;
    }

    totalStreams += report.streams;
    totalRevenue += report.revenue;

    if (!report.trackId) {
      unmatchedRecords += 1;
      continue;
    }

    try {
      const earnings = await processReportEarnings(reportId);
      matchedRecords += 1;
      earningsCreated += earnings.length;
    } catch (error) {
      unmatchedRecords += 1;
      processingErrors.push(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  const batch: RoyaltyUploadBatch = {
    id: batchId,
    uploadedByUserId: input.uploadedByUserId,
    fileName: input.fileName,
    reportType: 'royalties',
    platform: input.platform,
    reportMonth: input.reportMonth,
    reportYear: input.reportYear,
    reportPeriodLabel: `${input.reportMonth}/${input.reportYear}`,
    status: processingErrors.length > 0 ? 'error' : 'processed',
    recordsProcessed: reportIds.length,
    matchedRecords,
    unmatchedRecords,
    earningsCreated,
    totalStreams,
    totalRevenue,
    uploadedAt: now,
    updatedAt: now,
    fileSizeBytes: input.fileSizeBytes,
    errorMessage: processingErrors.length > 0 ? processingErrors.slice(0, 3).join('; ') : undefined,
  };

  await kv.set(`royalty-batch:${batchId}`, batch);
  await kv.set(`royalty-batch-admin:${input.uploadedByUserId}:${batchId}`, true);

  return batch;
}

export async function listRoyaltyUploadBatches(limit: number = 50): Promise<RoyaltyUploadBatch[]> {
  const batchEntries = await kv.getEntriesByPrefix('royalty-batch:');
  const batches = batchEntries
    .map((entry) => entry.value as RoyaltyUploadBatch)
    .filter((batch) => batch && typeof batch === 'object' && typeof batch.id === 'string');

  return batches
    .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
    .slice(0, limit);
}

// Calculate and distribute earnings from report
export async function processReportEarnings(reportId: string): Promise<Earning[]> {
  const report = await kv.get<StreamingReport>(`report:${reportId}`);
  if (!report) {
    throw new Error('Report not found');
  }

  if (!report.trackId) {
    throw new Error('Cannot process earnings: Track not found for ISRC');
  }

  const track = await metadataService.getTrackById(report.trackId);
  if (!track) {
    throw new Error('Track metadata not found');
  }

  const release = await metadataService.getReleaseById(track.releaseId);
  if (!release) {
    throw new Error('Release metadata not found');
  }

  // Get royalty splits for the track
  const splits = await getTrackRoyaltySplits(report.trackId);
  
  const earnings: Earning[] = [];
  const now = new Date().toISOString();

  for (const split of splits) {
    const earningId = crypto.randomUUID();
    const netRevenue = report.revenue * (split.percentage / 100);

    const earning: Earning = {
      id: earningId,
      userId: split.userId,
      trackId: report.trackId,
      releaseId: track.releaseId,
      platform: report.platform,
      reportId: report.id,
      period: `${report.reportPeriod.start}_${report.reportPeriod.end}`,
      streams: report.streams,
      grossRevenue: report.revenue,
      netRevenue,
      splitPercentage: split.percentage,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`earning:${earningId}`, earning);
    await kv.set(`earning:user:${split.userId}:${earningId}`, true);
    await kv.set(`earning:track:${report.trackId}:${earningId}`, true);

    // Update user balance
    await updateUserBalance(split.userId, netRevenue);

    earnings.push(earning);
  }

  return earnings;
}

// Set royalty splits for a track
export async function setTrackRoyaltySplits(
  trackId: string,
  splits: RoyaltySplit[]
): Promise<void> {
  // Validate splits add up to 100%
  const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Royalty splits must add up to 100%, got ${totalPercentage}%`);
  }

  await kv.set(`splits:track:${trackId}`, splits);
}

// Get royalty splits for a track
export async function getTrackRoyaltySplits(trackId: string): Promise<RoyaltySplit[]> {
  const splits = await kv.get<RoyaltySplit[]>(`splits:track:${trackId}`);
  
  if (!splits || splits.length === 0) {
    // Default: 100% to track owner
    const track = await metadataService.getTrackById(trackId);
    if (!track) return [];

    const release = await metadataService.getReleaseById(track.releaseId);
    if (!release) return [];

    return [{
      userId: release.userId,
      percentage: 100,
      role: 'artist',
      name: release.primaryArtist,
    }];
  }

  return splits;
}

// Update user balance
async function updateUserBalance(userId: string, amount: number): Promise<void> {
  let balance = await kv.get<UserBalance>(`balance:${userId}`);

  if (!balance) {
    balance = {
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      currency: 'NGN',
      updatedAt: new Date().toISOString(),
    };
  }

  balance.pendingBalance += amount;
  balance.totalEarnings += amount;
  balance.updatedAt = new Date().toISOString();

  await kv.set(`balance:${userId}`, balance);
}

// Get user balance
export async function getUserBalance(userId: string): Promise<UserBalance> {
  let balance = await kv.get<UserBalance>(`balance:${userId}`);

  if (!balance) {
    balance = {
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      currency: 'NGN',
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`balance:${userId}`, balance);
  }

  return balance;
}

// Approve pending earnings (move to available balance)
export async function approveEarnings(earningIds: string[]): Promise<void> {
  for (const earningId of earningIds) {
    const earning = await kv.get<Earning>(`earning:${earningId}`);
    if (!earning || earning.status !== 'pending') continue;

    // Update earning status
    earning.status = 'approved';
    earning.updatedAt = new Date().toISOString();
    await kv.set(`earning:${earningId}`, earning);

    // Move from pending to available
    const balance = await getUserBalance(earning.userId);
    balance.pendingBalance -= earning.netRevenue;
    balance.availableBalance += earning.netRevenue;
    balance.updatedAt = new Date().toISOString();
    await kv.set(`balance:${earning.userId}`, balance);
  }
}

// Get user earnings
export async function getUserEarnings(
  userId: string,
  limit: number = 50
): Promise<Earning[]> {
  const earningKeys = await kv.getByPrefix(`earning:user:${userId}:`);
  const earnings: Earning[] = [];

  for (const key of earningKeys.slice(0, limit)) {
    const earningId = key.key.split(':').pop();
    if (earningId) {
      const earning = await kv.get<Earning>(`earning:${earningId}`);
      if (earning) {
        earnings.push(earning);
      }
    }
  }

  return earnings.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get track earnings
export async function getTrackEarnings(trackId: string): Promise<Earning[]> {
  const earningKeys = await kv.getByPrefix(`earning:track:${trackId}:`);
  const earnings: Earning[] = [];

  for (const key of earningKeys) {
    const earningId = key.key.split(':').pop();
    if (earningId) {
      const earning = await kv.get<Earning>(`earning:${earningId}`);
      if (earning) {
        earnings.push(earning);
      }
    }
  }

  return earnings;
}

// Get earnings statistics
export async function getUserEarningsStats(userId: string): Promise<{
  totalStreams: number;
  totalRevenue: number;
  platformBreakdown: Record<string, { streams: number; revenue: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; streams: number }>;
}> {
  const earnings = await getUserEarnings(userId, 1000);
  
  let totalStreams = 0;
  let totalRevenue = 0;
  const platformBreakdown: Record<string, { streams: number; revenue: number }> = {};
  const monthlyData: Record<string, { revenue: number; streams: number }> = {};

  for (const earning of earnings) {
    totalStreams += earning.streams;
    totalRevenue += earning.netRevenue;

    // Platform breakdown
    if (!platformBreakdown[earning.platform]) {
      platformBreakdown[earning.platform] = { streams: 0, revenue: 0 };
    }
    platformBreakdown[earning.platform].streams += earning.streams;
    platformBreakdown[earning.platform].revenue += earning.netRevenue;

    // Monthly trend
    const month = new Date(earning.createdAt).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, streams: 0 };
    }
    monthlyData[month].revenue += earning.netRevenue;
    monthlyData[month].streams += earning.streams;
  }

  const monthlyTrend = Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalStreams,
    totalRevenue,
    platformBreakdown,
    monthlyTrend,
  };
}
