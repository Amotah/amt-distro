import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface Lyrics {
  id: string;
  track_id: string;
  artist_id?: string;
  release_id?: string;
  title: string;
  artist_name: string;
  album_name?: string;
  lyrics_text: string;
  synced_lyrics?: string;
  lyrics_language: string;
  isrc?: string;
  upc?: string;
  genre?: string;
  release_date?: string;
  artwork_url?: string;
  source: 'upload' | 'admin-import' | 'artist-submission';
  lyrics_type: 'plain' | 'synced';
  copyright_status: 'uncleared' | 'review-required' | 'cleared';
  verification_status: 'pending' | 'verified' | 'rejected';
  is_published: boolean;
  streaming_links?: Record<string, string>;
  view_count: number;
  stream_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface LyricsCreateInput {
  track_id: string;
  artist_id?: string;
  release_id?: string;
  title: string;
  artist_name: string;
  album_name?: string;
  lyrics_text: string;
  synced_lyrics?: string;
  lyrics_language?: string;
  isrc?: string;
  upc?: string;
  genre?: string;
  release_date?: string;
  artwork_url?: string;
  source?: 'upload' | 'admin-import' | 'artist-submission';
  lyrics_type?: 'plain' | 'synced';
  copyright_status?: 'uncleared' | 'review-required' | 'cleared';
  streaming_links?: Record<string, string>;
}

export interface LyricsUpdateInput {
  title?: string;
  lyrics_text?: string;
  synced_lyrics?: string;
  lyrics_language?: string;
  album_name?: string;
  genre?: string;
  artwork_url?: string;
  copyright_status?: 'uncleared' | 'review-required' | 'cleared';
  verification_status?: 'pending' | 'verified' | 'rejected';
  is_published?: boolean;
  streaming_links?: Record<string, string>;
}

export interface LyricsQuery {
  isPublished?: boolean;
  verificationStatus?: string;
  genre?: string;
  language?: string;
  artistName?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'view_count' | 'stream_count' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

async function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

export async function getLyricsById(id: string): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('lyrics')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
  return data as Lyrics;
}

export async function getLyricsPublic(query: LyricsQuery = {}): Promise<{ data: Lyrics[]; count: number }> {
  const supabase = await getSupabaseClient();
  let q = supabase
    .from('lyrics')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .eq('verification_status', 'verified');

  if (query.genre) q = q.eq('genre', query.genre);
  if (query.language) q = q.eq('lyrics_language', query.language);
  if (query.artistName) q = q.ilike('artist_name', `%${query.artistName}%`);
  if (query.search) {
    q = q.or(`title.ilike.%${query.search}%,artist_name.ilike.%${query.search}%,album_name.ilike.%${query.search}%`);
  }

  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
  q = q.order(sortBy, sortOrder);

  const limit = Math.min(query.limit || 20, 100);
  const offset = query.offset || 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error('Error fetching public lyrics:', error);
    return { data: [], count: 0 };
  }

  return { data: data as Lyrics[], count: count || 0 };
}

export async function getLyricsAdmin(query: LyricsQuery = {}): Promise<{ data: Lyrics[]; count: number }> {
  const supabase = await getSupabaseClient();
  let q = supabase
    .from('lyrics')
    .select('*', { count: 'exact' });

  if (query.verificationStatus) q = q.eq('verification_status', query.verificationStatus);
  if (query.genre) q = q.eq('genre', query.genre);
  if (query.language) q = q.eq('lyrics_language', query.language);
  if (query.artistName) q = q.ilike('artist_name', `%${query.artistName}%`);
  if (typeof query.isPublished === 'boolean') q = q.eq('is_published', query.isPublished);

  if (query.search) {
    q = q.or(`title.ilike.%${query.search}%,artist_name.ilike.%${query.search}%,album_name.ilike.%${query.search}%`);
  }

  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
  q = q.order(sortBy, sortOrder);

  const limit = Math.min(query.limit || 20, 100);
  const offset = query.offset || 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error('Error fetching admin lyrics:', error);
    return { data: [], count: 0 };
  }

  return { data: data as Lyrics[], count: count || 0 };
}

export async function getLyricsArtist(artistSlug: string, query: LyricsQuery = {}): Promise<{ data: Lyrics[]; count: number }> {
  const supabase = await getSupabaseClient();
  let q = supabase
    .from('lyrics')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .eq('verification_status', 'verified')
    .ilike('artist_name', `%${decodeURIComponent(artistSlug)}%`);

  if (query.genre) q = q.eq('genre', query.genre);
  if (query.language) q = q.eq('lyrics_language', query.language);

  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
  q = q.order(sortBy, sortOrder);

  const limit = Math.min(query.limit || 50, 100);
  const offset = query.offset || 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error('Error fetching artist lyrics:', error);
    return { data: [], count: 0 };
  }

  return { data: data as Lyrics[], count: count || 0 };
}

export async function getLyricsAlbum(albumSlug: string, query: LyricsQuery = {}): Promise<{ data: Lyrics[]; count: number }> {
  const supabase = await getSupabaseClient();
  let q = supabase
    .from('lyrics')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .eq('verification_status', 'verified')
    .ilike('album_name', `%${decodeURIComponent(albumSlug)}%`);

  if (query.genre) q = q.eq('genre', query.genre);
  if (query.language) q = q.eq('lyrics_language', query.language);

  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
  q = q.order(sortBy, sortOrder);

  const limit = Math.min(query.limit || 50, 100);
  const offset = query.offset || 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error('Error fetching album lyrics:', error);
    return { data: [], count: 0 };
  }

  return { data: data as Lyrics[], count: count || 0 };
}

export async function createLyrics(input: LyricsCreateInput): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lyrics')
    .insert([
      {
        track_id: input.track_id,
        artist_id: input.artist_id,
        release_id: input.release_id,
        title: input.title,
        artist_name: input.artist_name,
        album_name: input.album_name,
        lyrics_text: input.lyrics_text,
        synced_lyrics: input.synced_lyrics,
        lyrics_language: input.lyrics_language || 'English',
        isrc: input.isrc,
        upc: input.upc,
        genre: input.genre,
        release_date: input.release_date,
        artwork_url: input.artwork_url,
        source: input.source || 'upload',
        lyrics_type: input.lyrics_type || 'plain',
        copyright_status: input.copyright_status || 'uncleared',
        streaming_links: input.streaming_links || {},
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating lyrics:', error);
    return null;
  }

  return data as Lyrics;
}

export async function updateLyrics(id: string, input: LyricsUpdateInput): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();

  const updates: any = { ...input, updated_at: now };

  const { data, error } = await supabase
    .from('lyrics')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lyrics:', error);
    return null;
  }

  return data as Lyrics;
}

export async function publishLyrics(id: string): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lyrics')
    .update({
      is_published: true,
      published_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error publishing lyrics:', error);
    return null;
  }

  return data as Lyrics;
}

export async function unpublishLyrics(id: string): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lyrics')
    .update({
      is_published: false,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error unpublishing lyrics:', error);
    return null;
  }

  return data as Lyrics;
}

export async function verifyLyrics(id: string): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lyrics')
    .update({
      verification_status: 'verified',
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error verifying lyrics:', error);
    return null;
  }

  return data as Lyrics;
}

export async function rejectLyrics(id: string): Promise<Lyrics | null> {
  const supabase = await getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lyrics')
    .update({
      verification_status: 'rejected',
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting lyrics:', error);
    return null;
  }

  return data as Lyrics;
}

export async function deleteLyrics(id: string): Promise<boolean> {
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from('lyrics')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lyrics:', error);
    return false;
  }

  return true;
}

export async function incrementLyricsView(id: string): Promise<boolean> {
  const supabase = await getSupabaseClient();

  const { error } = await supabase.rpc('increment_lyrics_view', { lyrics_id: id });

  if (error) {
    // Fallback to manual increment
    const current = await getLyricsById(id);
    if (!current) return false;

    const { error: updateError } = await supabase
      .from('lyrics')
      .update({ view_count: current.view_count + 1 })
      .eq('id', id);

    return !updateError;
  }

  return true;
}

export async function getTrendingLyrics(limit: number = 4): Promise<Lyrics[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('lyrics')
    .select('*')
    .eq('is_published', true)
    .eq('verification_status', 'verified')
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending lyrics:', error);
    return [];
  }

  return data as Lyrics[];
}

export async function getLatestLyrics(limit: number = 4): Promise<Lyrics[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('lyrics')
    .select('*')
    .eq('is_published', true)
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest lyrics:', error);
    return [];
  }

  return data as Lyrics[];
}
