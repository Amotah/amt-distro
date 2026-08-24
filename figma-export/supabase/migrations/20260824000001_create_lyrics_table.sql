-- Create lyrics table for song lyrics management
CREATE TABLE IF NOT EXISTS lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  artist_id UUID,
  release_id UUID,
  
  -- Lyrics content
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  lyrics_text TEXT NOT NULL,
  synced_lyrics TEXT, -- LRC format: [00:12.50] lyric line
  lyrics_language TEXT DEFAULT 'English',
  
  -- Metadata
  isrc TEXT,
  upc TEXT,
  genre TEXT,
  release_date DATE,
  
  -- Artwork
  artwork_url TEXT,
  
  -- Source and status
  source TEXT DEFAULT 'upload', -- upload, admin-import, artist-submission
  lyrics_type TEXT DEFAULT 'plain', -- plain, synced
  copyright_status TEXT DEFAULT 'uncleared', -- uncleared, review-required, cleared
  verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected
  is_published BOOLEAN DEFAULT false,
  
  -- Streaming links (JSON)
  streaming_links JSONB DEFAULT '{}',
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  stream_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT lyrics_title_not_empty CHECK (title != ''),
  CONSTRAINT lyrics_text_not_empty CHECK (lyrics_text != '')
);

-- Create indexes for fast lookups and filtering
CREATE INDEX idx_lyrics_track_id ON lyrics(track_id);
CREATE INDEX idx_lyrics_artist_id ON lyrics(artist_id);
CREATE INDEX idx_lyrics_release_id ON lyrics(release_id);
CREATE INDEX idx_lyrics_isrc ON lyrics(isrc);
CREATE INDEX idx_lyrics_upc ON lyrics(upc);
CREATE INDEX idx_lyrics_published ON lyrics(is_published);
CREATE INDEX idx_lyrics_verification_status ON lyrics(verification_status);
CREATE INDEX idx_lyrics_copyright_status ON lyrics(copyright_status);
CREATE INDEX idx_lyrics_published_status ON lyrics(is_published, verification_status);
CREATE INDEX idx_lyrics_view_count ON lyrics(view_count DESC);
CREATE INDEX idx_lyrics_created_at ON lyrics(created_at DESC);
CREATE INDEX idx_lyrics_genre ON lyrics(genre);
CREATE INDEX idx_lyrics_language ON lyrics(lyrics_language);
CREATE INDEX idx_lyrics_artist_published ON lyrics(artist_name, is_published);
CREATE INDEX idx_lyrics_search ON lyrics USING GIN (to_tsvector('english', title || ' ' || artist_name || ' ' || album_name || ' ' || lyrics_text));

-- Enable RLS
ALTER TABLE lyrics ENABLE ROW LEVEL SECURITY;

-- Everyone can view published lyrics
CREATE POLICY "Public can view published lyrics"
  ON lyrics FOR SELECT
  USING (is_published = true AND verification_status = 'verified');

-- Admin and authorized users can view all lyrics
CREATE POLICY "Admin can view all lyrics"
  ON lyrics FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.user_metadata->>'role' IN ('admin', 'superadmin')
    )
  );

-- Admin can create lyrics
CREATE POLICY "Admin can create lyrics"
  ON lyrics FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.user_metadata->>'role' IN ('admin', 'superadmin')
    )
  );

-- Admin can update lyrics
CREATE POLICY "Admin can update lyrics"
  ON lyrics FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.user_metadata->>'role' IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.user_metadata->>'role' IN ('admin', 'superadmin')
    )
  );

-- Admin can delete lyrics
CREATE POLICY "Admin can delete lyrics"
  ON lyrics FOR DELETE
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.user_metadata->>'role' IN ('admin', 'superadmin')
    )
  );

-- Create lyrics_admin_log table for audit trail
CREATE TABLE IF NOT EXISTS lyrics_admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lyrics_id UUID NOT NULL REFERENCES lyrics(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- created, updated, verified, published, rejected, deleted
  changes JSONB, -- what changed
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lyrics_admin_log_lyrics_id ON lyrics_admin_log(lyrics_id);
CREATE INDEX idx_lyrics_admin_log_admin_id ON lyrics_admin_log(admin_id);
CREATE INDEX idx_lyrics_admin_log_action ON lyrics_admin_log(action);
CREATE INDEX idx_lyrics_admin_log_created_at ON lyrics_admin_log(created_at DESC);

ALTER TABLE lyrics_admin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view audit logs"
  ON lyrics_admin_log FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'superadmin')
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.user_metadata->>'role' IN ('admin', 'superadmin')
    )
  );
