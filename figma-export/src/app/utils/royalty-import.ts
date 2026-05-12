import type { AdminRoyaltyUploadRowInput } from './admin-api';

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

export async function parseRoyaltyUploadFile(file: File): Promise<AdminRoyaltyUploadRowInput[]> {
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
    reportDate: findHeaderIndex(headers, ['report_date', 'date', 'day']),
    isrc: findHeaderIndex(headers, ['isrc']),
    trackTitle: findHeaderIndex(headers, ['track_title', 'title', 'track_name', 'song_title']),
    artistName: findHeaderIndex(headers, ['artist_name', 'artist']),
    streams: findHeaderIndex(headers, ['streams', 'plays', 'stream_count', 'play_count']),
    revenue: findHeaderIndex(headers, ['revenue', 'earnings', 'amount']),
    territory: findHeaderIndex(headers, ['territory', 'country', 'region']),
  };

  return rawRows.slice(1)
    .map((row) => ({
      reportDate: columnIndexes.reportDate >= 0 ? parseDateValue(row[columnIndexes.reportDate]) : undefined,
      isrc: columnIndexes.isrc >= 0 ? String(row[columnIndexes.isrc] || '').trim() || undefined : undefined,
      trackTitle: columnIndexes.trackTitle >= 0 ? String(row[columnIndexes.trackTitle] || '').trim() || undefined : undefined,
      artistName: columnIndexes.artistName >= 0 ? String(row[columnIndexes.artistName] || '').trim() || undefined : undefined,
      streams: parseNumber(columnIndexes.streams >= 0 ? row[columnIndexes.streams] : undefined),
      revenue: parseNumber(columnIndexes.revenue >= 0 ? row[columnIndexes.revenue] : undefined),
      territory: columnIndexes.territory >= 0 ? String(row[columnIndexes.territory] || '').trim() || undefined : undefined,
    }))
    .filter((row) => row.streams || row.revenue || row.isrc || row.trackTitle);
}