import * as kv from './kv_store.tsx';
import * as royaltyService from './royalty-service.tsx';

/**
 * Fraud Detection Service
 * Detects abnormal streaming patterns and flags suspicious accounts
 */

export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudRuleType = 
  | 'abnormal_stream_spike'
  | 'suspicious_location_pattern'
  | 'bot_streaming_detected'
  | 'velocity_abuse'
  | 'duplicate_streams'
  | 'abnormal_completion_rate';

export interface FraudAlert {
  id: string;
  userId: string;
  trackId: string;
  ruleType: FraudRuleType;
  riskLevel: FraudRiskLevel;
  description: string;
  metadata: any;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface FraudScore {
  userId: string;
  score: number; // 0-100, higher = more suspicious
  riskLevel: FraudRiskLevel;
  factors: Array<{
    rule: FraudRuleType;
    contribution: number;
    description: string;
  }>;
  lastUpdated: string;
}

export interface StreamingPattern {
  trackId: string;
  period: string; // YYYY-MM-DD
  streams: number;
  uniqueListeners: number;
  territories: string[];
  platforms: string[];
  avgCompletionRate: number;
  peakHour: number;
}

// Thresholds for fraud detection
const THRESHOLDS = {
  SPIKE_MULTIPLIER: 3, // 3x normal is suspicious
  MIN_COMPLETION_RATE: 0.3, // Less than 30% completion is suspicious
  MAX_COMPLETION_RATE: 0.95, // More than 95% completion is suspicious (bots)
  SINGLE_TERRITORY_THRESHOLD: 0.9, // 90% from one territory
  VELOCITY_DAILY_LIMIT: 100000, // 100K streams per day is suspicious for new artists
  BOT_PATTERN_THRESHOLD: 0.85, // Similarity to known bot patterns
};

// Analyze streaming pattern for fraud
export async function analyzeStreamingPattern(
  trackId: string,
  pattern: StreamingPattern
): Promise<FraudAlert[]> {
  const alerts: FraudAlert[] = [];
  const track = await kv.get(`track:${trackId}`);
  if (!track) return alerts;

  // Get historical patterns
  const historicalPatterns = await getHistoricalPatterns(trackId, 30);
  
  // Rule 1: Abnormal stream spike
  const avgStreams = calculateAverage(historicalPatterns.map(p => p.streams));
  if (pattern.streams > avgStreams * THRESHOLDS.SPIKE_MULTIPLIER && avgStreams > 0) {
    alerts.push(await createAlert(
      trackId,
      'abnormal_stream_spike',
      'high',
      `Stream count (${pattern.streams}) is ${Math.round(pattern.streams / avgStreams)}x higher than average`,
      { currentStreams: pattern.streams, avgStreams, multiplier: pattern.streams / avgStreams }
    ));
  }

  // Rule 2: Abnormal completion rate (too low or too high)
  if (pattern.avgCompletionRate < THRESHOLDS.MIN_COMPLETION_RATE) {
    alerts.push(await createAlert(
      trackId,
      'bot_streaming_detected',
      'medium',
      `Abnormally low completion rate: ${(pattern.avgCompletionRate * 100).toFixed(1)}%`,
      { completionRate: pattern.avgCompletionRate }
    ));
  } else if (pattern.avgCompletionRate > THRESHOLDS.MAX_COMPLETION_RATE) {
    alerts.push(await createAlert(
      trackId,
      'bot_streaming_detected',
      'high',
      `Suspiciously high completion rate: ${(pattern.avgCompletionRate * 100).toFixed(1)}% (potential bot activity)`,
      { completionRate: pattern.avgCompletionRate }
    ));
  }

  // Rule 3: Suspicious location pattern (too concentrated)
  if (pattern.territories.length > 0) {
    const topTerritoryPercent = calculateTopTerritoryPercentage(pattern);
    if (topTerritoryPercent > THRESHOLDS.SINGLE_TERRITORY_THRESHOLD) {
      alerts.push(await createAlert(
        trackId,
        'suspicious_location_pattern',
        'medium',
        `${(topTerritoryPercent * 100).toFixed(1)}% of streams from single territory`,
        { territories: pattern.territories, topTerritoryPercent }
      ));
    }
  }

  // Rule 4: Velocity abuse (too many streams too quickly)
  if (pattern.streams > THRESHOLDS.VELOCITY_DAILY_LIMIT) {
    const trackAge = await getTrackAge(trackId);
    if (trackAge < 30) { // New track
      alerts.push(await createAlert(
        trackId,
        'velocity_abuse',
        'critical',
        `Excessive streams (${pattern.streams.toLocaleString()}) for a ${trackAge}-day-old track`,
        { streams: pattern.streams, trackAge }
      ));
    }
  }

  // Rule 5: Low listener-to-stream ratio (duplicate streams)
  if (pattern.uniqueListeners > 0) {
    const ratio = pattern.streams / pattern.uniqueListeners;
    if (ratio > 20) { // Each listener averaged 20+ streams
      alerts.push(await createAlert(
        trackId,
        'duplicate_streams',
        'high',
        `Abnormal stream-to-listener ratio: ${ratio.toFixed(1)}:1`,
        { streams: pattern.streams, uniqueListeners: pattern.uniqueListeners, ratio }
      ));
    }
  }

  return alerts;
}

// Create fraud alert
async function createAlert(
  trackId: string,
  ruleType: FraudRuleType,
  riskLevel: FraudRiskLevel,
  description: string,
  metadata: any
): Promise<FraudAlert> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get track owner
  const track = await kv.get<any>(`track:${trackId}`);
  const userId = track?.releaseId 
    ? (await kv.get<any>(`release:${track.releaseId}`))?.userId 
    : 'unknown';

  const alert: FraudAlert = {
    id,
    userId,
    trackId,
    ruleType,
    riskLevel,
    description,
    metadata,
    status: 'active',
    createdAt: now,
  };

  await kv.set(`fraud:alert:${id}`, alert);
  await kv.set(`fraud:track:${trackId}:${id}`, true);
  await kv.set(`fraud:user:${userId}:${id}`, true);

  return alert;
}

// Calculate fraud score for user
export async function calculateUserFraudScore(userId: string): Promise<FraudScore> {
  const alerts = await getUserFraudAlerts(userId);
  const activeAlerts = alerts.filter(a => a.status === 'active');

  let score = 0;
  const factors: FraudScore['factors'] = [];

  // Weight alerts by risk level
  const weights = {
    low: 10,
    medium: 25,
    high: 40,
    critical: 60,
  };

  const ruleContributions: Record<FraudRuleType, number> = {
    abnormal_stream_spike: 0,
    suspicious_location_pattern: 0,
    bot_streaming_detected: 0,
    velocity_abuse: 0,
    duplicate_streams: 0,
    abnormal_completion_rate: 0,
  };

  for (const alert of activeAlerts) {
    const weight = weights[alert.riskLevel];
    score += weight;
    ruleContributions[alert.ruleType] += weight;
  }

  // Normalize score to 0-100
  score = Math.min(100, score);

  // Build factors list
  for (const [rule, contribution] of Object.entries(ruleContributions)) {
    if (contribution > 0) {
      factors.push({
        rule: rule as FraudRuleType,
        contribution,
        description: getFraudRuleDescription(rule as FraudRuleType),
      });
    }
  }

  // Determine risk level
  let riskLevel: FraudRiskLevel = 'low';
  if (score >= 80) riskLevel = 'critical';
  else if (score >= 50) riskLevel = 'high';
  else if (score >= 25) riskLevel = 'medium';

  const fraudScore: FraudScore = {
    userId,
    score,
    riskLevel,
    factors,
    lastUpdated: new Date().toISOString(),
  };

  await kv.set(`fraud:score:${userId}`, fraudScore);

  return fraudScore;
}

// Get fraud alerts for user
export async function getUserFraudAlerts(userId: string): Promise<FraudAlert[]> {
  const keys = await kv.getByPrefix(`fraud:user:${userId}:`);
  const alerts: FraudAlert[] = [];

  for (const key of keys) {
    const alertId = key.key.split(':').pop();
    if (alertId) {
      const alert = await kv.get<FraudAlert>(`fraud:alert:${alertId}`);
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  return alerts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get fraud alerts for track
export async function getTrackFraudAlerts(trackId: string): Promise<FraudAlert[]> {
  const keys = await kv.getByPrefix(`fraud:track:${trackId}:`);
  const alerts: FraudAlert[] = [];

  for (const key of keys) {
    const alertId = key.key.split(':').pop();
    if (alertId) {
      const alert = await kv.get<FraudAlert>(`fraud:alert:${alertId}`);
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  return alerts;
}

// Resolve fraud alert
export async function resolveAlert(
  alertId: string,
  status: 'resolved' | 'false_positive',
  resolvedBy: string,
  notes?: string
): Promise<FraudAlert | null> {
  const alert = await kv.get<FraudAlert>(`fraud:alert:${alertId}`);
  if (!alert) return null;

  alert.status = status;
  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = resolvedBy;
  if (notes) alert.notes = notes;

  await kv.set(`fraud:alert:${alertId}`, alert);

  // Recalculate user fraud score
  await calculateUserFraudScore(alert.userId);

  return alert;
}

// Flag user account
export async function flagUserAccount(
  userId: string,
  reason: string,
  flaggedBy: string
): Promise<void> {
  await kv.set(`fraud:flagged:${userId}`, {
    userId,
    reason,
    flaggedBy,
    flaggedAt: new Date().toISOString(),
  });
}

// Check if user is flagged
export async function isUserFlagged(userId: string): Promise<boolean> {
  const flag = await kv.get(`fraud:flagged:${userId}`);
  return flag !== null;
}

// Helper functions
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function calculateTopTerritoryPercentage(pattern: StreamingPattern): number {
  // Simplified - in production would have actual territory distribution
  return pattern.territories.length === 1 ? 1.0 : 0.5;
}

async function getTrackAge(trackId: string): Promise<number> {
  const track = await kv.get<any>(`track:${trackId}`);
  if (!track || !track.createdAt) return 0;
  
  const createdDate = new Date(track.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function getHistoricalPatterns(
  trackId: string,
  days: number
): Promise<StreamingPattern[]> {
  // Simplified - would query actual historical data
  return [];
}

function getFraudRuleDescription(rule: FraudRuleType): string {
  const descriptions: Record<FraudRuleType, string> = {
    abnormal_stream_spike: 'Sudden spike in stream count',
    suspicious_location_pattern: 'Streams concentrated in suspicious locations',
    bot_streaming_detected: 'Automated streaming behavior detected',
    velocity_abuse: 'Excessive streams in short time period',
    duplicate_streams: 'High ratio of streams to unique listeners',
    abnormal_completion_rate: 'Unusual track completion patterns',
  };
  return descriptions[rule];
}

// Get fraud statistics
export async function getFraudStatistics(): Promise<{
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  flaggedUsers: number;
  alertsByType: Record<FraudRuleType, number>;
}> {
  // Simplified implementation
  return {
    totalAlerts: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    flaggedUsers: 0,
    alertsByType: {
      abnormal_stream_spike: 0,
      suspicious_location_pattern: 0,
      bot_streaming_detected: 0,
      velocity_abuse: 0,
      duplicate_streams: 0,
      abnormal_completion_rate: 0,
    },
  };
}
