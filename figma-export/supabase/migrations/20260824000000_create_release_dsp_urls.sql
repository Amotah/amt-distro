-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table to store DSP URLs for each release
CREATE TABLE IF NOT EXISTS release_dsp_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Africa-focused primary platforms
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_music_url TEXT,
  boomplay_url TEXT,
  audiomack_url TEXT,
  
  -- Global platforms
  amazon_music_url TEXT,
  deezer_url TEXT,
  tidal_url TEXT,
  
  -- Additional platforms
  bandcamp_url TEXT,
  soundcloud_url TEXT,
  pimp_url TEXT,
  anghami_url TEXT,
  jio_saavn_url TEXT,
  
  -- Metadata
  release_title TEXT,
  artist_name TEXT,
  cover_art_url TEXT,
  
  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  distribution_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_release_dsp_urls_release_id 
  ON release_dsp_urls(release_id);

CREATE INDEX idx_release_dsp_urls_user_id 
  ON release_dsp_urls(user_id);

CREATE INDEX idx_release_dsp_urls_user_release 
  ON release_dsp_urls(user_id, release_id);

CREATE INDEX idx_release_dsp_urls_is_active 
  ON release_dsp_urls(is_active);

-- Enable RLS
ALTER TABLE release_dsp_urls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own DSP URLs"
  ON release_dsp_urls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DSP URLs"
  ON release_dsp_urls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DSP URLs"
  ON release_dsp_urls FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DSP URLs"
  ON release_dsp_urls FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access for live releases (for smart-link landing page)
CREATE POLICY "Public can view active DSP URLs for live releases"
  ON release_dsp_urls FOR SELECT
  USING (is_active = true);
