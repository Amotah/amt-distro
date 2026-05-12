import type { AdminAnalyticsUploadRowInput } from './admin-api';

function normalizeHeader(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.replace(/,/g, '').trim();
    if (!normalizedValue) {
      return undefined;
    }

    const numericValue = Number(normalizedValue);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  return undefined;
}

function parseDurationToSeconds(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  if (/^\d+(\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  const parts = trimmedValue.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return undefined;
  }

  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }

  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }

  return undefined;
}

function parseDateValue(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpochDate = new Date(Date.UTC(1899, 11, 30));
    excelEpochDate.setUTCDate(excelEpochDate.getUTCDate() + value);
    return excelEpochDate.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  return undefined;
}

export async function parseAnalyticsUploadFile(file: File, defaultPlatform: string): Promise<AdminAnalyticsUploadRowInput[]> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rawRows.length < 2) {
    return [];
  }

  const headers = rawRows[0].map(normalizeHeader);
  const columnIndexes = {
    date: findHeaderIndex(headers, ['date', 'day', 'report_date']),
    platform: findHeaderIndex(headers, ['platform', 'service', 'store']),
    trackId: findHeaderIndex(headers, ['track_id', 'song_id']),
    isrc: findHeaderIndex(headers, ['isrc']),
    trackTitle: findHeaderIndex(headers, ['track_title', 'title', 'track_name', 'song_title']),
    artistName: findHeaderIndex(headers, ['artist_name', 'artist']),
    streams: findHeaderIndex(headers, ['streams', 'plays', 'stream_count', 'play_count']),
    listeners: findHeaderIndex(headers, ['listeners', 'unique_listeners', 'listener_count']),
    revenue: findHeaderIndex(headers, ['revenue', 'earnings']),
    territory: findHeaderIndex(headers, ['territory', 'country', 'region']),
    duration: findHeaderIndex(headers, ['avg_stream_duration', 'average_stream_duration', 'stream_duration', 'duration_seconds']),
    saves: findHeaderIndex(headers, ['saves', 'save_count']),
    playlistAdds: findHeaderIndex(headers, ['playlist_adds', 'playlist_add_count']),
    followers: findHeaderIndex(headers, ['followers', 'follower_count']),
    ageGroup: findHeaderIndex(headers, ['age_group', 'age']),
    gender: findHeaderIndex(headers, ['gender', 'sex']),
  };

  return rawRows.slice(1)
    .map((row) => ({
      date: columnIndexes.date >= 0 ? parseDateValue(row[columnIndexes.date]) : undefined,
      platform: columnIndexes.platform >= 0 ? String(row[columnIndexes.platform] || '').trim() || defaultPlatform : defaultPlatform,
      trackId: columnIndexes.trackId >= 0 ? String(row[columnIndexes.trackId] || '').trim() || undefined : undefined,
      isrc: columnIndexes.isrc >= 0 ? String(row[columnIndexes.isrc] || '').trim() || undefined : undefined,
      trackTitle: columnIndexes.trackTitle >= 0 ? String(row[columnIndexes.trackTitle] || '').trim() || undefined : undefined,
      artistName: columnIndexes.artistName >= 0 ? String(row[columnIndexes.artistName] || '').trim() || undefined : undefined,
      streams: parseNumber(columnIndexes.streams >= 0 ? row[columnIndexes.streams] : undefined),
      listeners: parseNumber(columnIndexes.listeners >= 0 ? row[columnIndexes.listeners] : undefined),
      revenue: parseNumber(columnIndexes.revenue >= 0 ? row[columnIndexes.revenue] : undefined),
      territory: columnIndexes.territory >= 0 ? String(row[columnIndexes.territory] || '').trim() || undefined : undefined,
      avgStreamDurationSeconds: parseDurationToSeconds(columnIndexes.duration >= 0 ? row[columnIndexes.duration] : undefined),
      saves: parseNumber(columnIndexes.saves >= 0 ? row[columnIndexes.saves] : undefined),
      playlistAdds: parseNumber(columnIndexes.playlistAdds >= 0 ? row[columnIndexes.playlistAdds] : undefined),
      followers: parseNumber(columnIndexes.followers >= 0 ? row[columnIndexes.followers] : undefined),
      ageGroup: columnIndexes.ageGroup >= 0 ? String(row[columnIndexes.ageGroup] || '').trim() || undefined : undefined,
      gender: columnIndexes.gender >= 0 ? String(row[columnIndexes.gender] || '').trim() || undefined : undefined,
    }))
    .filter((row) => row.streams || row.listeners || row.revenue || row.trackId || row.isrc || row.trackTitle);
}