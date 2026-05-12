import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface SmartLinkClickEvent {
  id?: string;
  linkId: string;
  userId: string;
  platform: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  country?: string;
  referrer?: string;
  createdAt?: string;
}

export interface SmartLinkAnalytics {
  linkId: string;
  totalClicks: number;
  uniqueDevices: number;
  trend: Array<{ date: string; clicks: number; unique: number }>;
  platforms: Array<{ name: string; clicks: number; percentage: number }>;
  countries: Array<{ country: string; clicks: number; percentage: number }>;
  referrers: Array<{ referrer: string; clicks: number; percentage: number }>;
  devices: Array<{ device: string; percentage: number }>;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Record a click event for a smart link
 */
export async function recordClickEvent(
  linkId: string,
  userId: string,
  event: Omit<SmartLinkClickEvent, 'id' | 'userId' | 'createdAt'>
): Promise<SmartLinkClickEvent> {
  const { data, error } = await supabase
    .from('smart_link_click_events')
    .insert({
      link_id: linkId,
      user_id: userId,
      platform: event.platform,
      device_type: event.deviceType,
      os: event.os,
      country: event.country || null,
      referrer: event.referrer || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording click event:', error);
    throw new Error(`Failed to record click event: ${error.message}`);
  }

  return {
    id: data.id,
    linkId: data.link_id,
    userId: data.user_id,
    platform: data.platform,
    deviceType: data.device_type,
    os: data.os,
    country: data.country,
    referrer: data.referrer,
    createdAt: data.created_at,
  };
}

/**
 * Get aggregated analytics for a smart link
 */
export async function getSmartLinkAnalytics(
  linkId: string,
  userId: string,
  days: number = 7
): Promise<SmartLinkAnalytics> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Fetch all click events for this link within the date range
  const { data: events, error } = await supabase
    .from('smart_link_click_events')
    .select('*')
    .eq('link_id', linkId)
    .eq('user_id', userId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching analytics:', error);
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }

  if (!events || events.length === 0) {
    return {
      linkId,
      totalClicks: 0,
      uniqueDevices: 0,
      trend: [],
      platforms: [],
      countries: [],
      referrers: [],
      devices: [],
    };
  }

  // Compute aggregates
  const trend = computeTrend(events);
  const platforms = computePlatforms(events);
  const countries = computeCountries(events);
  const referrers = computeReferrers(events);
  const devices = computeDevices(events);
  const uniqueDevices = new Set(
    events.map((e) => `${e.device_type}_${e.os}`)
  ).size;

  return {
    linkId,
    totalClicks: events.length,
    uniqueDevices,
    trend,
    platforms,
    countries,
    referrers,
    devices,
  };
}

function computeTrend(
  events: any[]
): Array<{ date: string; clicks: number; unique: number }> {
  const grouped: Record<
    string,
    { clicks: number; devices: Set<string> }
  > = {};

  events.forEach((event) => {
    const date = new Date(event.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (!grouped[date]) {
      grouped[date] = { clicks: 0, devices: new Set() };
    }

    grouped[date].clicks++;
    grouped[date].devices.add(`${event.device_type}_${event.os}`);
  });

  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      clicks: data.clicks,
      unique: data.devices.size,
    }))
    .sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return aDate.getTime() - bDate.getTime();
    });
}

function computePlatforms(
  events: any[]
): Array<{ name: string; clicks: number; percentage: number }> {
  const grouped: Record<string, number> = {};
  let total = 0;

  events.forEach((event) => {
    grouped[event.platform] = (grouped[event.platform] || 0) + 1;
    total++;
  });

  return Object.entries(grouped)
    .map(([name, clicks]) => ({
      name,
      clicks: clicks as number,
      percentage: Math.round(((clicks as number) / total) * 100 * 100) / 100,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function computeCountries(
  events: any[]
): Array<{ country: string; clicks: number; percentage: number }> {
  const grouped: Record<string, number> = {};
  let total = 0;

  events.forEach((event) => {
    if (event.country) {
      grouped[event.country] = (grouped[event.country] || 0) + 1;
      total++;
    }
  });

  if (total === 0) {
    return [];
  }

  return Object.entries(grouped)
    .map(([country, clicks]) => ({
      country,
      clicks: clicks as number,
      percentage: Math.round(((clicks as number) / total) * 100 * 100) / 100,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function computeReferrers(
  events: any[]
): Array<{ referrer: string; clicks: number; percentage: number }> {
  const grouped: Record<string, number> = {};
  let total = 0;

  events.forEach((event) => {
    if (event.referrer) {
      grouped[event.referrer] = (grouped[event.referrer] || 0) + 1;
      total++;
    }
  });

  if (total === 0) {
    return [];
  }

  return Object.entries(grouped)
    .map(([referrer, clicks]) => ({
      referrer,
      clicks: clicks as number,
      percentage: Math.round(((clicks as number) / total) * 100 * 100) / 100,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function computeDevices(
  events: any[]
): Array<{ device: string; percentage: number }> {
  const grouped: Record<string, number> = {};
  let total = events.length;

  events.forEach((event) => {
    grouped[event.device_type] = (grouped[event.device_type] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([device, count]) => ({
      device,
      percentage: Math.round(((count as number) / total) * 100 * 100) / 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
