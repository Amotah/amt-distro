import * as kv from './kv_store.tsx';

/**
 * ISRC (International Standard Recording Code) Service
 * Format: CC-XXX-YY-NNNNN
 * CC = Country Code (NG for Nigeria)
 * XXX = Registrant Code (assigned by ISRC agency)
 * YY = Year of registration
 * NNNNN = Designation code (unique number)
 */

/**
 * UPC (Universal Product Code) Service
 * Also known as EAN for international releases
 * Format: 13 digits for EAN-13 (most common for music)
 */

const COUNTRY_CODE = 'NG'; // Nigeria
const REGISTRANT_CODE = 'AMT'; // AMTDISTRO registrant code

// Counter for generating sequential codes
let isrcCounter = 0;
let upcCounter = 0;

// Initialize counters from storage
async function initializeCounters() {
  const isrcCount = await kv.get('counter:isrc') || 0;
  const upcCount = await kv.get('counter:upc') || 0;
  
  isrcCounter = typeof isrcCount === 'number' ? isrcCount : 0;
  upcCounter = typeof upcCount === 'number' ? upcCount : 0;
}

// Initialize on module load
await initializeCounters();

/**
 * Generate a new ISRC code
 * Format: NG-AMT-24-00001
 */
export async function generateISRC(): Promise<string> {
  // Increment counter
  isrcCounter++;
  await kv.set('counter:isrc', isrcCounter);

  // Get current year (last 2 digits)
  const year = new Date().getFullYear().toString().slice(-2);

  // Format designation code (5 digits, zero-padded)
  const designation = isrcCounter.toString().padStart(5, '0');

  // Construct ISRC
  const isrc = `${COUNTRY_CODE}-${REGISTRANT_CODE}-${year}-${designation}`;

  // Store in registry to prevent duplication
  await kv.set(`isrc:${isrc}`, {
    code: isrc,
    generatedAt: new Date().toISOString(),
    status: 'active',
  });

  return isrc;
}

function normalizeISRC(isrc: string): string {
  return isrc.trim().toUpperCase();
}

/**
 * Validate ISRC format
 */
export function validateISRC(isrc: string): boolean {
  // Format: CC-XXX-YY-NNNNN
  const pattern = /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/;
  return pattern.test(isrc);
}

/**
 * Check if ISRC exists in registry
 */
export async function isrcExists(isrc: string): Promise<boolean> {
  const record = await kv.get(`isrc:${isrc}`);
  return record !== null;
}

/**
 * Generate a new UPC/EAN-13 code
 * Format: 13 digits
 * Structure: [Country Prefix (3)] + [Company Prefix (4-7)] + [Product Code (2-5)] + [Check Digit (1)]
 */
export async function generateUPC(): Promise<string> {
  // Increment counter
  upcCounter++;
  await kv.set('counter:upc', upcCounter);

  // Country prefix for Nigeria-based company (using 615 as example)
  const countryPrefix = '615';
  
  // Company prefix (AMTDISTRO identifier)
  const companyPrefix = '2024';
  
  // Product code (6 digits, zero-padded)
  const productCode = upcCounter.toString().padStart(6, '0');

  // Calculate check digit
  const baseCode = countryPrefix + companyPrefix + productCode;
  const checkDigit = calculateUPCCheckDigit(baseCode);

  // Construct UPC
  const upc = baseCode + checkDigit;

  // Store in registry to prevent duplication
  await kv.set(`upc:${upc}`, {
    code: upc,
    generatedAt: new Date().toISOString(),
    status: 'active',
  });

  return upc;
}

function normalizeUPC(upc: string): string {
  return upc.trim();
}

/**
 * Calculate UPC check digit using modulo 10 algorithm
 */
function calculateUPCCheckDigit(code: string): string {
  let sum = 0;
  
  // Process each digit
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i]);
    // Odd positions (from right) are multiplied by 3
    if ((code.length - i) % 2 === 0) {
      sum += digit * 3;
    } else {
      sum += digit;
    }
  }

  // Calculate check digit
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Validate UPC/EAN-13 format and check digit
 */
export function validateUPC(upc: string): boolean {
  // Must be 13 digits
  if (!/^\d{13}$/.test(upc)) {
    return false;
  }

  // Validate check digit
  const baseCode = upc.slice(0, 12);
  const providedCheckDigit = upc.slice(12);
  const calculatedCheckDigit = calculateUPCCheckDigit(baseCode);

  return providedCheckDigit === calculatedCheckDigit;
}

/**
 * Check if UPC exists in registry
 */
export async function upcExists(upc: string): Promise<boolean> {
  const record = await kv.get(`upc:${upc}`);
  return record !== null;
}

/**
 * Assign ISRC to a track
 */
export async function assignISRCToTrack(trackId: string): Promise<string> {
  // Check if track already has ISRC
  const existingISRC = await kv.get(`track:isrc:${trackId}`);
  if (existingISRC) {
    return existingISRC as string;
  }

  // Generate new ISRC
  const isrc = await generateISRC();

  return await setISRCForTrack(trackId, isrc);
}

export async function setISRCForTrack(trackId: string, isrc: string): Promise<string> {
  const normalizedISRC = normalizeISRC(isrc);

  if (!validateISRC(normalizedISRC)) {
    throw new Error('Invalid ISRC format. Use CC-XXX-YY-NNNNN.');
  }

  const existingTrackId = await getTrackByISRC(normalizedISRC);
  if (existingTrackId && existingTrackId !== trackId) {
    throw new Error('ISRC is already assigned to another track.');
  }

  const previousISRC = await kv.get(`track:isrc:${trackId}`);
  if (previousISRC && previousISRC !== normalizedISRC) {
    await kv.del(`isrc:track:${previousISRC}`);
  }

  await kv.set(`track:isrc:${trackId}`, normalizedISRC);
  await kv.set(`isrc:track:${normalizedISRC}`, trackId);
  await kv.set(`isrc:${normalizedISRC}`, {
    code: normalizedISRC,
    generatedAt: new Date().toISOString(),
    status: 'active',
  });

  return normalizedISRC;
}

/**
 * Assign UPC to a release
 */
export async function assignUPCToRelease(releaseId: string): Promise<string> {
  // Check if release already has UPC
  const existingUPC = await kv.get(`release:upc:${releaseId}`);
  if (existingUPC) {
    return existingUPC as string;
  }

  // Generate new UPC
  const upc = await generateUPC();

  return await setUPCForRelease(releaseId, upc);
}

export async function setUPCForRelease(releaseId: string, upc: string): Promise<string> {
  const normalizedUPC = normalizeUPC(upc);

  if (!validateUPC(normalizedUPC)) {
    throw new Error('Invalid UPC format. Use a valid 13-digit UPC/EAN code.');
  }

  const existingReleaseId = await getReleaseByUPC(normalizedUPC);
  if (existingReleaseId && existingReleaseId !== releaseId) {
    throw new Error('UPC is already assigned to another release.');
  }

  const previousUPC = await kv.get(`release:upc:${releaseId}`);
  if (previousUPC && previousUPC !== normalizedUPC) {
    await kv.del(`upc:release:${previousUPC}`);
  }

  await kv.set(`release:upc:${releaseId}`, normalizedUPC);
  await kv.set(`upc:release:${normalizedUPC}`, releaseId);
  await kv.set(`upc:${normalizedUPC}`, {
    code: normalizedUPC,
    generatedAt: new Date().toISOString(),
    status: 'active',
  });

  return normalizedUPC;
}

/**
 * Get track ID by ISRC
 */
export async function getTrackByISRC(isrc: string): Promise<string | null> {
  return await kv.get(`isrc:track:${isrc}`);
}

/**
 * Get release ID by UPC
 */
export async function getReleaseByUPC(upc: string): Promise<string | null> {
  return await kv.get(`upc:release:${upc}`);
}

/**
 * Deactivate ISRC (if track is deleted)
 */
export async function deactivateISRC(isrc: string): Promise<boolean> {
  const record = await kv.get(`isrc:${isrc}`);
  if (!record) return false;

  await kv.set(`isrc:${isrc}`, {
    ...(record as object),
    status: 'inactive',
    deactivatedAt: new Date().toISOString(),
  });

  return true;
}

/**
 * Deactivate UPC (if release is deleted)
 */
export async function deactivateUPC(upc: string): Promise<boolean> {
  const record = await kv.get(`upc:${upc}`);
  if (!record) return false;

  await kv.set(`upc:${upc}`, {
    ...(record as object),
    status: 'inactive',
    deactivatedAt: new Date().toISOString(),
  });

  return true;
}

/**
 * Batch generate ISRCs for multiple tracks
 */
export async function batchGenerateISRCs(trackIds: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const trackId of trackIds) {
    const isrc = await assignISRCToTrack(trackId);
    results.set(trackId, isrc);
  }

  return results;
}

/**
 * Get statistics
 */
export async function getCodeStatistics(): Promise<{
  isrcGenerated: number;
  upcGenerated: number;
}> {
  const isrcCount = await kv.get('counter:isrc') || 0;
  const upcCount = await kv.get('counter:upc') || 0;

  return {
    isrcGenerated: typeof isrcCount === 'number' ? isrcCount : 0,
    upcGenerated: typeof upcCount === 'number' ? upcCount : 0,
  };
}
