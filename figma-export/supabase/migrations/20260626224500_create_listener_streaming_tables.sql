CREATE TABLE IF NOT EXISTS platform_monetization_rules (
  id TEXT PRIMARY KEY DEFAULT 'default',
  min_stream_seconds INTEGER NOT NULL DEFAULT 30,
  min_completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0.55,
  max_qualified_plays_per_listener_per_day INTEGER NOT NULL DEFAULT 20,
  max_downloads_per_listener_per_day INTEGER NOT NULL DEFAULT 5,
  stream_artist_payout NUMERIC(12,4) NOT NULL DEFAULT 7.5000,
  download_artist_payout NUMERIC(12,4) NOT NULL DEFAULT 35.0000,
  stream_listener_reward NUMERIC(12,4) NOT NULL DEFAULT 0.2500,
  download_listener_reward NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_monetization_rules (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS listener_playback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  device_fingerprint TEXT NOT NULL,
  track_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('play_start', 'play_progress', 'play_complete', 'download', 'save', 'follow', 'share')),
  listened_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  source_platform TEXT NOT NULL DEFAULT 'web',
  country TEXT,
  device_type TEXT,
  is_qualified BOOLEAN NOT NULL DEFAULT FALSE,
  qualification_reason TEXT,
  estimated_artist_payout NUMERIC(12,4) NOT NULL DEFAULT 0,
  estimated_listener_reward NUMERIC(12,4) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listener_playback_events_track_created
  ON listener_playback_events(track_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listener_playback_events_listener_created
  ON listener_playback_events(listener_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listener_playback_events_release_created
  ON listener_playback_events(release_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listener_playback_events_device_created
  ON listener_playback_events(device_fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS listener_saved_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listener_user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_listener_saved_tracks_listener_created
  ON listener_saved_tracks(listener_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listener_followed_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_slug TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listener_user_id, artist_slug)
);

CREATE INDEX IF NOT EXISTS idx_listener_followed_artists_listener_created
  ON listener_followed_artists(listener_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listener_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  source_event_id UUID REFERENCES listener_playback_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listener_user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_listener_downloads_listener_created
  ON listener_downloads(listener_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listener_reward_wallets (
  listener_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance NUMERIC(12,4) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(12,4) NOT NULL DEFAULT 0,
  lifetime_earned NUMERIC(12,4) NOT NULL DEFAULT 0,
  lifetime_downloads INTEGER NOT NULL DEFAULT 0,
  lifetime_qualified_streams INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listener_reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event_id UUID UNIQUE REFERENCES listener_playback_events(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stream_reward', 'download_reward', 'manual_adjustment')),
  amount NUMERIC(12,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'pending', 'reversed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listener_reward_transactions_listener_created
  ON listener_reward_transactions(listener_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS artist_stream_income_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  source_event_id UUID UNIQUE NOT NULL REFERENCES listener_playback_events(id) ON DELETE CASCADE,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('qualified_stream', 'qualified_download')),
  gross_amount NUMERIC(12,4) NOT NULL,
  platform_fee_amount NUMERIC(12,4) NOT NULL DEFAULT 0,
  listener_reward_amount NUMERIC(12,4) NOT NULL DEFAULT 0,
  net_artist_amount NUMERIC(12,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'estimated' CHECK (status IN ('estimated', 'approved', 'paid', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_stream_income_owner_created
  ON artist_stream_income_ledger(release_owner_user_id, created_at DESC);

ALTER TABLE listener_playback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE listener_saved_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE listener_followed_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE listener_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE listener_reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE listener_reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_stream_income_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_monetization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listeners view their playback events"
  ON listener_playback_events
  FOR SELECT
  USING (listener_user_id = auth.uid());

CREATE POLICY "Listeners view their saved tracks"
  ON listener_saved_tracks
  FOR SELECT
  USING (listener_user_id = auth.uid());

CREATE POLICY "Listeners view their followed artists"
  ON listener_followed_artists
  FOR SELECT
  USING (listener_user_id = auth.uid());

CREATE POLICY "Listeners view their downloads"
  ON listener_downloads
  FOR SELECT
  USING (listener_user_id = auth.uid());

CREATE POLICY "Listeners view their reward wallet"
  ON listener_reward_wallets
  FOR SELECT
  USING (listener_user_id = auth.uid());

CREATE POLICY "Listeners view their reward transactions"
  ON listener_reward_transactions
  FOR SELECT
  USING (listener_user_id = auth.uid());

CREATE POLICY "Artists view their listener income"
  ON artist_stream_income_ledger
  FOR SELECT
  USING (release_owner_user_id = auth.uid());

CREATE POLICY "Authenticated users view monetization rules"
  ON platform_monetization_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
