import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import * as metadataService from './metadata-service.tsx';
import * as fraudService from './fraud-detection-service.tsx';

type MonetizationRuleRow = {
  min_stream_seconds: number;
  min_completion_rate: number;
  max_qualified_plays_per_listener_per_day: number;
  max_downloads_per_listener_per_day: number;
  stream_artist_payout: number;
  download_artist_payout: number;
  stream_listener_reward: number;
  download_listener_reward: number;
  platform_fee_percent: number;
};

type ListenerPlaybackEventRow = {
  id: string;
  listener_user_id: string | null;
  session_id: string | null;
  device_fingerprint: string;
  track_id: string;
  release_id: string;
  artist_name: string;
  event_type: string;
  listened_seconds: number;
  completion_rate: number;
  source_platform: string;
  country: string | null;
  device_type: string | null;
  is_qualified: boolean;
  qualification_reason: string | null;
  estimated_artist_payout: number;
  estimated_listener_reward: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export interface ListenerCatalogTrack {
  id: string;
  releaseId: string;
  title: string;
  artistName: string;
  artworkUrl: string;
  audioUrl: string;
  duration: number;
  genre: string;
  playCount: number;
  downloadCount: number;
  qualifiedPlayCount: number;
  isDownloadable: boolean;
}

export interface ListenerCatalogRelease {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string;
  releaseDate: string;
  type: 'single' | 'ep' | 'album';
  genre: string;
  trackCount: number;
  totalStreams: number;
  totalDownloads: number;
}

export interface ListenerCatalogArtist {
  slug: string;
  name: string;
  genre: string;
  releaseCount: number;
  totalStreams: number;
}

export interface ListenerCatalogResponse {
  summary: {
    liveReleases: number;
    streamableTracks: number;
    artists: number;
    totalQualifiedStreams: number;
    totalDownloads: number;
  };
  featuredReleases: ListenerCatalogRelease[];
  trendingTracks: ListenerCatalogTrack[];
  spotlightArtists: ListenerCatalogArtist[];
  genreHighlights: Array<{ genre: string; releases: number }>;
}

export interface RecordListenerEventInput {
  listenerUserId?: string | null;
  trackId: string;
  releaseId: string;
  eventType: 'play_start' | 'play_progress' | 'play_complete' | 'download' | 'save' | 'follow' | 'share';
  listenedSeconds?: number;
  completionRate?: number;
  sessionId?: string;
  deviceFingerprint: string;
  sourcePlatform?: string;
  country?: string;
  deviceType?: string;
  artistName?: string;
  metadata?: Record<string, unknown>;
}

export interface ListenerSummaryResponse {
  library: {
    savedTracks: number;
    downloads: number;
    followedArtists: number;
  };
  rewards: {
    availableBalance: number;
    pendingBalance: number;
    lifetimeEarned: number;
    qualifiedStreams: number;
    qualifiedDownloads: number;
  };
  recentDownloads: Array<{
    id: string;
    trackId: string;
    title: string;
    artistName: string;
    createdAt: string;
  }>;
  savedTrackPreview: Array<{
    id: string;
    trackId: string;
    title: string;
    artistName: string;
    createdAt: string;
  }>;
  followedArtistPreview: Array<{
    id: string;
    artistName: string;
    createdAt: string;
  }>;
  recentRewardTransactions: Array<{
    id: string;
    amount: number;
    transactionType: string;
    status: string;
    createdAt: string;
  }>;
}

export interface ArtistMonetizationSummary {
  qualifiedStreams: number;
  qualifiedDownloads: number;
  grossRevenue: number;
  netArtistRevenue: number;
  listenerRewardsFunded: number;
  platformFees: number;
  recentEntries: Array<{
    id: string;
    trackId: string;
    title: string;
    artistName: string;
    revenueType: string;
    netArtistAmount: number;
    createdAt: string;
  }>;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const DEFAULT_RULES: MonetizationRuleRow = {
  min_stream_seconds: 30,
  min_completion_rate: 0.55,
  max_qualified_plays_per_listener_per_day: 20,
  max_downloads_per_listener_per_day: 5,
  stream_artist_payout: 7.5,
  download_artist_payout: 35,
  stream_listener_reward: 0.25,
  download_listener_reward: 1,
  platform_fee_percent: 15,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function getMonetizationRules(): Promise<MonetizationRuleRow> {
  const { data } = await supabase
    .from('platform_monetization_rules')
    .select('min_stream_seconds,min_completion_rate,max_qualified_plays_per_listener_per_day,max_downloads_per_listener_per_day,stream_artist_payout,download_artist_payout,stream_listener_reward,download_listener_reward,platform_fee_percent')
    .eq('id', 'default')
    .maybeSingle();

  return data || DEFAULT_RULES;
}

async function getAllLiveReleases() {
  const entries = await kv.getEntriesByPrefix('release:user:');
  const releaseIds = uniqueBy(
    entries
      .map((entry) => String(entry.key || '').split(':').pop() || '')
      .filter((value) => value.length > 8),
    (value) => value,
  );

  const releases = await Promise.all(
    releaseIds.map(async (releaseId) => metadataService.getReleaseById(releaseId).catch(() => null)),
  );

  return releases
    .filter((release): release is NonNullable<typeof release> => Boolean(release && release.status === 'live'))
    .sort((a, b) => new Date(b.releaseDate || b.createdAt).getTime() - new Date(a.releaseDate || a.createdAt).getTime());
}

async function getTrackEngagementMap(trackIds: string[]) {
  if (trackIds.length === 0) {
    return new Map<string, { plays: number; qualifiedPlays: number; downloads: number }>();
  }

  const { data, error } = await supabase
    .from('listener_playback_events')
    .select('track_id,event_type,is_qualified')
    .in('track_id', trackIds);

  if (error || !data) {
    return new Map<string, { plays: number; qualifiedPlays: number; downloads: number }>();
  }

  const map = new Map<string, { plays: number; qualifiedPlays: number; downloads: number }>();
  for (const row of data) {
    const current = map.get(row.track_id) || { plays: 0, qualifiedPlays: 0, downloads: 0 };
    if (row.event_type === 'play_complete' || row.event_type === 'play_progress') {
      current.plays += 1;
      if (row.is_qualified) {
        current.qualifiedPlays += 1;
      }
    }
    if (row.event_type === 'download') {
      current.downloads += 1;
    }
    map.set(row.track_id, current);
  }

  return map;
}

async function resolveTrackTitle(trackId: string) {
  const track = await metadataService.getTrackById(trackId).catch(() => null);
  return track?.title || 'Track';
}

async function countDailyQualifiedEvents(options: {
  listenerUserId?: string | null;
  deviceFingerprint: string;
  trackId: string;
  eventType: 'playback' | 'download';
}) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let query = supabase
    .from('listener_playback_events')
    .select('id', { count: 'exact', head: true })
    .eq('track_id', options.trackId)
    .eq('is_qualified', true)
    .gte('created_at', startOfDay.toISOString());

  query = options.eventType === 'playback'
    ? query.in('event_type', ['play_progress', 'play_complete'])
    : query.eq('event_type', 'download');

  query = options.listenerUserId
    ? query.eq('listener_user_id', options.listenerUserId)
    : query.eq('device_fingerprint', options.deviceFingerprint);

  const { count } = await query;
  return count || 0;
}

async function hasQualifiedPlaybackInSession(options: {
  listenerUserId?: string | null;
  deviceFingerprint: string;
  sessionId?: string;
  trackId: string;
}) {
  if (!options.sessionId) {
    return false;
  }

  let query = supabase
    .from('listener_playback_events')
    .select('id', { count: 'exact', head: true })
    .eq('track_id', options.trackId)
    .eq('session_id', options.sessionId)
    .eq('is_qualified', true)
    .in('event_type', ['play_progress', 'play_complete']);

  query = options.listenerUserId
    ? query.eq('listener_user_id', options.listenerUserId)
    : query.eq('device_fingerprint', options.deviceFingerprint);

  const { count } = await query;
  return (count || 0) > 0;
}

async function ensureWallet(listenerUserId: string) {
  const { data } = await supabase
    .from('listener_reward_wallets')
    .select('listener_user_id,available_balance,pending_balance,lifetime_earned,lifetime_downloads,lifetime_qualified_streams')
    .eq('listener_user_id', listenerUserId)
    .maybeSingle();

  if (data) {
    return data;
  }

  const { data: created, error } = await supabase
    .from('listener_reward_wallets')
    .insert({ listener_user_id: listenerUserId })
    .select('listener_user_id,available_balance,pending_balance,lifetime_earned,lifetime_downloads,lifetime_qualified_streams')
    .single();

  if (error) {
    throw new Error(`Failed to initialize listener wallet: ${error.message}`);
  }

  return created;
}

async function creditListenerReward(listenerUserId: string, event: ListenerPlaybackEventRow, amount: number) {
  if (amount <= 0) {
    return;
  }

  const wallet = await ensureWallet(listenerUserId);
  const transactionType = event.event_type === 'download' ? 'download_reward' : 'stream_reward';

  const { error: transactionError } = await supabase
    .from('listener_reward_transactions')
    .insert({
      listener_user_id: listenerUserId,
      source_event_id: event.id,
      transaction_type: transactionType,
      amount,
      status: 'earned',
    });

  if (transactionError) {
    if (!transactionError.message.toLowerCase().includes('duplicate')) {
      throw new Error(`Failed to create listener reward transaction: ${transactionError.message}`);
    }
    return;
  }

  const nextQualifiedStreams = wallet.lifetime_qualified_streams + (event.event_type === 'download' ? 0 : 1);
  const nextQualifiedDownloads = wallet.lifetime_downloads + (event.event_type === 'download' ? 1 : 0);

  const { error: walletError } = await supabase
    .from('listener_reward_wallets')
    .upsert({
      listener_user_id: listenerUserId,
      available_balance: Number(wallet.available_balance) + amount,
      pending_balance: wallet.pending_balance,
      lifetime_earned: Number(wallet.lifetime_earned) + amount,
      lifetime_downloads: nextQualifiedDownloads,
      lifetime_qualified_streams: nextQualifiedStreams,
      updated_at: new Date().toISOString(),
    });

  if (walletError) {
    throw new Error(`Failed to update listener wallet: ${walletError.message}`);
  }
}

async function createArtistLedgerEntry(event: ListenerPlaybackEventRow, releaseOwnerUserId: string, feePercent: number) {
  if (!event.is_qualified || event.estimated_artist_payout <= 0) {
    return;
  }

  const grossAmount = Number(event.estimated_artist_payout);
  const listenerRewardAmount = Number(event.estimated_listener_reward);
  const platformFeeAmount = Number((grossAmount * (feePercent / 100)).toFixed(4));
  const netArtistAmount = Number((grossAmount - platformFeeAmount - listenerRewardAmount).toFixed(4));

  const { error } = await supabase
    .from('artist_stream_income_ledger')
    .insert({
      release_owner_user_id: releaseOwnerUserId,
      track_id: event.track_id,
      release_id: event.release_id,
      artist_name: event.artist_name,
      source_event_id: event.id,
      revenue_type: event.event_type === 'download' ? 'qualified_download' : 'qualified_stream',
      gross_amount: grossAmount,
      platform_fee_amount: platformFeeAmount,
      listener_reward_amount: listenerRewardAmount,
      net_artist_amount: netArtistAmount,
      status: 'estimated',
    });

  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw new Error(`Failed to create artist ledger entry: ${error.message}`);
  }
}

async function maybeTriggerFraudReview(trackId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('listener_playback_events')
    .select('listener_user_id,device_fingerprint,country,source_platform,completion_rate,created_at,event_type')
    .eq('track_id', trackId)
    .in('event_type', ['play_complete', 'download'])
    .gte('created_at', startOfDay.toISOString());

  if (error || !data || data.length < 25 || data.length % 10 !== 0) {
    return;
  }

  const uniqueListeners = new Set(
    data.map((row) => row.listener_user_id || row.device_fingerprint).filter(Boolean),
  );

  if (uniqueListeners.size > 2) {
    return;
  }

  const completionRate = data.reduce((sum, row) => sum + Number(row.completion_rate || 0), 0) / data.length;
  const hourBuckets = data.reduce<Record<number, number>>((acc, row) => {
    const hour = new Date(row.created_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const peakHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0]?.[0];

  await fraudService.analyzeStreamingPattern(trackId, {
    trackId,
    period: startOfDay.toISOString().slice(0, 10),
    streams: data.length,
    uniqueListeners: uniqueListeners.size,
    territories: Array.from(new Set(data.map((row) => row.country).filter(Boolean) as string[])),
    platforms: Array.from(new Set(data.map((row) => row.source_platform).filter(Boolean) as string[])),
    avgCompletionRate: completionRate,
    peakHour: Number(peakHour || 0),
  });
}

export async function getListenerCatalog(): Promise<ListenerCatalogResponse> {
  const liveReleases = await getAllLiveReleases();
  const releaseTrackPairs = await Promise.all(
    liveReleases.map(async (release) => ({
      release,
      tracks: (await metadataService.getReleaseTracks(release.id).catch(() => []))
        .filter((track) => Boolean(track.audioFileUrl)),
    })),
  );

  const trackIds = releaseTrackPairs.flatMap(({ tracks }) => tracks.map((track) => track.id));
  const engagementMap = await getTrackEngagementMap(trackIds);

  const trendingTracks: ListenerCatalogTrack[] = releaseTrackPairs
    .flatMap(({ release, tracks }) => tracks.map((track) => {
      const engagement = engagementMap.get(track.id) || { plays: 0, qualifiedPlays: 0, downloads: 0 };
      return {
        id: track.id,
        releaseId: release.id,
        title: track.title,
        artistName: release.primaryArtist,
        artworkUrl: release.artworkUrl,
        audioUrl: track.audioFileUrl,
        duration: track.duration,
        genre: track.genre || release.genre,
        playCount: engagement.plays,
        downloadCount: engagement.downloads,
        qualifiedPlayCount: engagement.qualifiedPlays,
        isDownloadable: true,
      };
    }))
    .sort((a, b) => {
      const scoreA = a.qualifiedPlayCount * 3 + a.downloadCount * 5 + a.playCount;
      const scoreB = b.qualifiedPlayCount * 3 + b.downloadCount * 5 + b.playCount;
      return scoreB - scoreA;
    });

  const featuredReleases: ListenerCatalogRelease[] = releaseTrackPairs
    .map(({ release, tracks }) => {
      const totals = tracks.reduce((acc, track) => {
        const engagement = engagementMap.get(track.id) || { plays: 0, qualifiedPlays: 0, downloads: 0 };
        acc.streams += engagement.qualifiedPlays;
        acc.downloads += engagement.downloads;
        return acc;
      }, { streams: 0, downloads: 0 });

      return {
        id: release.id,
        title: release.title,
        artistName: release.primaryArtist,
        artworkUrl: release.artworkUrl,
        releaseDate: release.releaseDate,
        type: release.type,
        genre: release.genre,
        trackCount: tracks.length,
        totalStreams: totals.streams,
        totalDownloads: totals.downloads,
      };
    })
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  const spotlightArtists = Object.values(
    featuredReleases.reduce<Record<string, ListenerCatalogArtist>>((acc, release) => {
      const slug = slugify(release.artistName);
      const current = acc[slug] || {
        slug,
        name: release.artistName,
        genre: release.genre,
        releaseCount: 0,
        totalStreams: 0,
      };
      current.releaseCount += 1;
      current.totalStreams += release.totalStreams;
      acc[slug] = current;
      return acc;
    }, {}),
  ).sort((a, b) => b.totalStreams - a.totalStreams || b.releaseCount - a.releaseCount);

  const genreHighlights = Object.entries(
    featuredReleases.reduce<Record<string, number>>((acc, release) => {
      acc[release.genre] = (acc[release.genre] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([genre, releases]) => ({ genre, releases }))
    .sort((a, b) => b.releases - a.releases);

  return {
    summary: {
      liveReleases: featuredReleases.length,
      streamableTracks: trendingTracks.length,
      artists: spotlightArtists.length,
      totalQualifiedStreams: trendingTracks.reduce((sum, track) => sum + track.qualifiedPlayCount, 0),
      totalDownloads: trendingTracks.reduce((sum, track) => sum + track.downloadCount, 0),
    },
    featuredReleases: featuredReleases.slice(0, 8),
    trendingTracks: trendingTracks.slice(0, 12),
    spotlightArtists: spotlightArtists.slice(0, 8),
    genreHighlights: genreHighlights.slice(0, 6),
  };
}

export async function recordListenerEvent(input: RecordListenerEventInput) {
  const release = await metadataService.getReleaseById(input.releaseId);
  if (!release || release.status !== 'live') {
    throw new Error('Release is unavailable for listener playback.');
  }

  const track = await metadataService.getTrackById(input.trackId);
  if (!track || track.releaseId !== release.id) {
    throw new Error('Track not found for listener playback.');
  }

  const rules = await getMonetizationRules();
  const listenedSeconds = Math.max(0, Number(input.listenedSeconds || 0));
  const computedCompletionRate = track.duration > 0
    ? Math.min(1, listenedSeconds / track.duration)
    : Math.max(0, Math.min(1, Number(input.completionRate || 0)));

  let isQualified = false;
  let qualificationReason = 'Engagement event recorded.';
  let estimatedArtistPayout = 0;
  let estimatedListenerReward = 0;

  if (input.eventType === 'play_complete' || input.eventType === 'play_progress') {
    const qualifiedToday = await countDailyQualifiedEvents({
      listenerUserId: input.listenerUserId,
      deviceFingerprint: input.deviceFingerprint,
      trackId: input.trackId,
      eventType: 'playback',
    });
    const alreadyQualifiedThisSession = await hasQualifiedPlaybackInSession({
      listenerUserId: input.listenerUserId,
      deviceFingerprint: input.deviceFingerprint,
      sessionId: input.sessionId,
      trackId: input.trackId,
    });

    const thresholdMet = listenedSeconds >= rules.min_stream_seconds || computedCompletionRate >= rules.min_completion_rate;
    if (alreadyQualifiedThisSession) {
      qualificationReason = 'Playback already qualified in this listening session.';
    } else if (thresholdMet && qualifiedToday < rules.max_qualified_plays_per_listener_per_day) {
      isQualified = true;
      qualificationReason = 'Qualified stream matched monetization rules.';
      estimatedArtistPayout = Number(rules.stream_artist_payout);
      estimatedListenerReward = input.listenerUserId ? Number(rules.stream_listener_reward) : 0;
    } else if (!thresholdMet) {
      qualificationReason = 'Playback did not meet the stream qualification threshold.';
    } else {
      qualificationReason = 'Daily stream reward limit reached for this listener and track.';
    }
  } else if (input.eventType === 'download') {
    const downloadsToday = await countDailyQualifiedEvents({
      listenerUserId: input.listenerUserId,
      deviceFingerprint: input.deviceFingerprint,
      trackId: input.trackId,
      eventType: 'download',
    });

    if (downloadsToday < rules.max_downloads_per_listener_per_day) {
      isQualified = true;
      qualificationReason = 'Qualified download matched monetization rules.';
      estimatedArtistPayout = Number(rules.download_artist_payout);
      estimatedListenerReward = input.listenerUserId ? Number(rules.download_listener_reward) : 0;
    } else {
      qualificationReason = 'Daily download reward limit reached for this listener and track.';
    }
  } else if (input.eventType === 'save') {
    qualificationReason = 'Track saved to listener library.';
  } else if (input.eventType === 'follow') {
    qualificationReason = 'Artist followed by listener.';
  } else if (input.eventType === 'share') {
    qualificationReason = 'Track share recorded.';
  }

  const { data, error } = await supabase
    .from('listener_playback_events')
    .insert({
      listener_user_id: input.listenerUserId || null,
      session_id: input.sessionId || null,
      device_fingerprint: input.deviceFingerprint,
      track_id: input.trackId,
      release_id: input.releaseId,
      artist_name: input.artistName || release.primaryArtist,
      event_type: input.eventType,
      listened_seconds: listenedSeconds,
      completion_rate: computedCompletionRate,
      source_platform: input.sourcePlatform || 'web',
      country: input.country || null,
      device_type: input.deviceType || null,
      is_qualified: isQualified,
      qualification_reason: qualificationReason,
      estimated_artist_payout: estimatedArtistPayout,
      estimated_listener_reward: estimatedListenerReward,
      metadata: input.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to record listener event: ${error.message}`);
  }

  const event = data as ListenerPlaybackEventRow;

  if (input.listenerUserId && input.eventType === 'save') {
    await supabase
      .from('listener_saved_tracks')
      .upsert({
        listener_user_id: input.listenerUserId,
        track_id: input.trackId,
        release_id: input.releaseId,
        artist_name: input.artistName || release.primaryArtist,
      }, { onConflict: 'listener_user_id,track_id' });
  }

  if (input.listenerUserId && input.eventType === 'follow') {
    await supabase
      .from('listener_followed_artists')
      .upsert({
        listener_user_id: input.listenerUserId,
        artist_slug: slugify(input.artistName || release.primaryArtist),
        artist_name: input.artistName || release.primaryArtist,
      }, { onConflict: 'listener_user_id,artist_slug' });
  }

  if (input.listenerUserId && input.eventType === 'download') {
    await supabase
      .from('listener_downloads')
      .upsert({
        listener_user_id: input.listenerUserId,
        track_id: input.trackId,
        release_id: input.releaseId,
        artist_name: input.artistName || release.primaryArtist,
        source_event_id: event.id,
      }, { onConflict: 'listener_user_id,track_id' });
  }

  if (event.is_qualified) {
    await createArtistLedgerEntry(event, release.userId, Number(rules.platform_fee_percent));
    if (input.listenerUserId && event.estimated_listener_reward > 0) {
      await creditListenerReward(input.listenerUserId, event, Number(event.estimated_listener_reward));
    }
    await maybeTriggerFraudReview(input.trackId);
  }

  return {
    eventId: event.id,
    isQualified: event.is_qualified,
    qualificationReason: event.qualification_reason,
    estimatedArtistPayout: Number(event.estimated_artist_payout),
    estimatedListenerReward: Number(event.estimated_listener_reward),
  };
}

export async function getListenerSummary(listenerUserId: string): Promise<ListenerSummaryResponse> {
  const [
    savedTracksResult,
    downloadsResult,
    followedArtistsResult,
    walletResult,
    rewardTransactionsResult,
    playbackEventsResult,
  ] = await Promise.all([
    supabase
      .from('listener_saved_tracks')
      .select('id,track_id,artist_name,created_at')
      .eq('listener_user_id', listenerUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('listener_downloads')
      .select('id,track_id,artist_name,created_at')
      .eq('listener_user_id', listenerUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('listener_followed_artists')
      .select('id,artist_name,created_at')
      .eq('listener_user_id', listenerUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('listener_reward_wallets')
      .select('available_balance,pending_balance,lifetime_earned,lifetime_downloads,lifetime_qualified_streams')
      .eq('listener_user_id', listenerUserId)
      .maybeSingle(),
    supabase
      .from('listener_reward_transactions')
      .select('id,amount,transaction_type,status,created_at')
      .eq('listener_user_id', listenerUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('listener_playback_events')
      .select('id,event_type,is_qualified')
      .eq('listener_user_id', listenerUserId),
  ]);

  const savedTracks = savedTracksResult.data || [];
  const downloads = downloadsResult.data || [];
  const followedArtists = followedArtistsResult.data || [];
  const wallet = walletResult.data || {
    available_balance: 0,
    pending_balance: 0,
    lifetime_earned: 0,
    lifetime_downloads: 0,
    lifetime_qualified_streams: 0,
  };
  const rewardTransactions = rewardTransactionsResult.data || [];
  const playbackEvents = playbackEventsResult.data || [];

  const savedTrackPreview = await Promise.all(savedTracks.map(async (row) => ({
    id: row.id,
    trackId: row.track_id,
    title: await resolveTrackTitle(row.track_id),
    artistName: row.artist_name,
    createdAt: row.created_at,
  })));

  const recentDownloads = await Promise.all(downloads.map(async (row) => ({
    id: row.id,
    trackId: row.track_id,
    title: await resolveTrackTitle(row.track_id),
    artistName: row.artist_name,
    createdAt: row.created_at,
  })));

  return {
    library: {
      savedTracks: savedTracks.length,
      downloads: downloads.length,
      followedArtists: followedArtists.length,
    },
    rewards: {
      availableBalance: Number(wallet.available_balance || 0),
      pendingBalance: Number(wallet.pending_balance || 0),
      lifetimeEarned: Number(wallet.lifetime_earned || 0),
      qualifiedStreams: Number(wallet.lifetime_qualified_streams || playbackEvents.filter((row) => row.is_qualified && row.event_type !== 'download').length),
      qualifiedDownloads: Number(wallet.lifetime_downloads || playbackEvents.filter((row) => row.is_qualified && row.event_type === 'download').length),
    },
    recentDownloads,
    savedTrackPreview,
    followedArtistPreview: followedArtists.map((row) => ({
      id: row.id,
      artistName: row.artist_name,
      createdAt: row.created_at,
    })),
    recentRewardTransactions: rewardTransactions.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      transactionType: row.transaction_type,
      status: row.status,
      createdAt: row.created_at,
    })),
  };
}

export async function getArtistMonetizationSummary(userId: string): Promise<ArtistMonetizationSummary> {
  const { data, error } = await supabase
    .from('artist_stream_income_ledger')
    .select('id,track_id,artist_name,revenue_type,gross_amount,net_artist_amount,listener_reward_amount,platform_fee_amount,created_at')
    .eq('release_owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load artist listener monetization summary: ${error.message}`);
  }

  const rows = data || [];
  const recentEntries = await Promise.all(rows.slice(0, 10).map(async (row) => ({
    id: row.id,
    trackId: row.track_id,
    title: await resolveTrackTitle(row.track_id),
    artistName: row.artist_name,
    revenueType: row.revenue_type,
    netArtistAmount: Number(row.net_artist_amount),
    createdAt: row.created_at,
  })));

  return {
    qualifiedStreams: rows.filter((row) => row.revenue_type === 'qualified_stream').length,
    qualifiedDownloads: rows.filter((row) => row.revenue_type === 'qualified_download').length,
    grossRevenue: rows.reduce((sum, row) => sum + Number(row.gross_amount), 0),
    netArtistRevenue: rows.reduce((sum, row) => sum + Number(row.net_artist_amount), 0),
    listenerRewardsFunded: rows.reduce((sum, row) => sum + Number(row.listener_reward_amount), 0),
    platformFees: rows.reduce((sum, row) => sum + Number(row.platform_fee_amount), 0),
    recentEntries,
  };
}
