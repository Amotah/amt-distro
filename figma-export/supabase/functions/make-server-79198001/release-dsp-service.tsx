import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface DSPUrl {
  spotify?: string;
  apple_music?: string;
  youtube_music?: string;
  boomplay?: string;
  audiomack?: string;
  amazon_music?: string;
  deezer?: string;
  tidal?: string;
  bandcamp?: string;
  soundcloud?: string;
  pimp?: string;
  anghami?: string;
  jio_saavn?: string;
}

export interface ReleaseDSPUrls {
  id: string;
  releaseId: string;
  userId: string;
  releaseTitle: string;
  artistName: string;
  coverArtUrl?: string;
  isActive: boolean;
  distributionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  urls: DSPUrl;
  createdAt: string;
  updatedAt: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Create or update DSP URLs for a release
 */
export async function upsertReleaseDSPUrls(
  releaseId: string,
  userId: string,
  data: {
    releaseTitle: string;
    artistName: string;
    coverArtUrl?: string;
    urls: DSPUrl;
  }
): Promise<ReleaseDSPUrls> {
  const { data: result, error } = await supabase
    .from('release_dsp_urls')
    .upsert(
      {
        release_id: releaseId,
        user_id: userId,
        release_title: data.releaseTitle,
        artist_name: data.artistName,
        cover_art_url: data.coverArtUrl || null,
        spotify_url: data.urls.spotify || null,
        apple_music_url: data.urls.apple_music || null,
        youtube_music_url: data.urls.youtube_music || null,
        boomplay_url: data.urls.boomplay || null,
        audiomack_url: data.urls.audiomack || null,
        amazon_music_url: data.urls.amazon_music || null,
        deezer_url: data.urls.deezer || null,
        tidal_url: data.urls.tidal || null,
        bandcamp_url: data.urls.bandcamp || null,
        soundcloud_url: data.urls.soundcloud || null,
        pimp_url: data.urls.pimp || null,
        anghami_url: data.urls.anghami || null,
        jio_saavn_url: data.urls.jio_saavn || null,
      },
      { onConflict: 'release_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting release DSP URLs:', error);
    throw new Error(`Failed to save DSP URLs: ${error.message}`);
  }

  return formatDSPUrlRecord(result);
}

/**
 * Get DSP URLs for a specific release
 */
export async function getReleaseDSPUrls(
  releaseId: string
): Promise<ReleaseDSPUrls | null> {
  const { data, error } = await supabase
    .from('release_dsp_urls')
    .select('*')
    .eq('release_id', releaseId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Error fetching release DSP URLs:', error);
    throw new Error(`Failed to fetch DSP URLs: ${error.message}`);
  }

  return formatDSPUrlRecord(data);
}

/**
 * Get DSP URLs by user ID (for dashboard)
 */
export async function getUserReleaseDSPUrls(
  userId: string
): Promise<ReleaseDSPUrls[]> {
  const { data, error } = await supabase
    .from('release_dsp_urls')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user DSP URLs:', error);
    throw new Error(`Failed to fetch DSP URLs: ${error.message}`);
  }

  return (data || []).map(formatDSPUrlRecord);
}

/**
 * Update DSP distribution status
 */
export async function updateDistributionStatus(
  releaseId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  const { error } = await supabase
    .from('release_dsp_urls')
    .update({ distribution_status: status, updated_at: new Date().toISOString() })
    .eq('release_id', releaseId);

  if (error) {
    console.error('Error updating distribution status:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }
}

/**
 * Deactivate DSP URLs for a release
 */
export async function deactivateReleaseDSPUrls(releaseId: string): Promise<void> {
  const { error } = await supabase
    .from('release_dsp_urls')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('release_id', releaseId);

  if (error) {
    console.error('Error deactivating DSP URLs:', error);
    throw new Error(`Failed to deactivate DSP URLs: ${error.message}`);
  }
}

/**
 * Format raw database record to interface
 */
function formatDSPUrlRecord(record: any): ReleaseDSPUrls {
  return {
    id: record.id,
    releaseId: record.release_id,
    userId: record.user_id,
    releaseTitle: record.release_title,
    artistName: record.artist_name,
    coverArtUrl: record.cover_art_url,
    isActive: record.is_active,
    distributionStatus: record.distribution_status,
    urls: {
      spotify: record.spotify_url,
      apple_music: record.apple_music_url,
      youtube_music: record.youtube_music_url,
      boomplay: record.boomplay_url,
      audiomack: record.audiomack_url,
      amazon_music: record.amazon_music_url,
      deezer: record.deezer_url,
      tidal: record.tidal_url,
      bandcamp: record.bandcamp_url,
      soundcloud: record.soundcloud_url,
      pimp: record.pimp_url,
      anghami: record.anghami_url,
      jio_saavn: record.jio_saavn_url,
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
