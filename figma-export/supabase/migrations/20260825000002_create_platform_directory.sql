-- Create platform_directory table for managing DSP configurations
CREATE TABLE IF NOT EXISTS platform_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Platform identification
  platform_key TEXT NOT NULL UNIQUE, -- spotify, apple_music, youtube_music, etc.
  platform_name TEXT NOT NULL,
  description TEXT,
  
  -- Visual/branding
  logo_url TEXT,
  icon_url TEXT,
  brand_color TEXT, -- Hex color for UI rendering
  
  -- Configuration
  base_url TEXT, -- Base URL for direct links
  api_endpoint TEXT, -- API endpoint if applicable
  enabled BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Regional priority
  default_order_global INTEGER DEFAULT 999,
  default_order_africa INTEGER DEFAULT 999,
  default_order_nigeria INTEGER DEFAULT 999,
  
  -- Metadata
  category TEXT DEFAULT 'streaming', -- streaming, social, other
  regions_supported TEXT[], -- Array of country codes
  
  -- Integration
  supports_pre_save BOOLEAN DEFAULT false,
  requires_isrc BOOLEAN DEFAULT false,
  requires_upc BOOLEAN DEFAULT false,
  requires_url_input BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN ('streaming', 'social', 'download', 'video', 'other'))
);

-- Create indexes
CREATE INDEX idx_platform_directory_enabled ON platform_directory(enabled);
CREATE INDEX idx_platform_directory_category ON platform_directory(category);
CREATE INDEX idx_platform_directory_is_featured ON platform_directory(is_featured);

-- Insert default platforms
INSERT INTO platform_directory (
  platform_key, platform_name, description, logo_url, icon_url, brand_color,
  enabled, is_featured, default_order_global, default_order_africa, default_order_nigeria,
  category, regions_supported, supports_pre_save, requires_isrc, requires_upc
) VALUES
-- Africa-First Tier
('boomplay', 'Boomplay', 'Africa''s #1 streaming platform', '/logos/boomplay.png', '/icons/boomplay.svg', '#FDB913', true, true, 1, 1, 1, 'streaming', ARRAY['NG','GH','KE','ZA','UG'], true, true, true),
('audiomack', 'Audiomack', 'Hip-hop and independent music', '/logos/audiomack.png', '/icons/audiomack.svg', '#FF1F45', true, true, 2, 2, 2, 'streaming', ARRAY['NG','GH','US','UK'], false, true, true),
('pimp', 'PIMP', 'African music platform', '/logos/pimp.png', '/icons/pimp.svg', '#7C3AED', true, true, 3, 3, 4, 'streaming', ARRAY['NG','GH','ZA'], false, true, true),

-- Global Tier
('youtube_music', 'YouTube Music', 'Video and audio streaming', '/logos/youtube-music.png', '/icons/youtube-music.svg', '#FF0000', true, true, 4, 4, 3, 'streaming', ARRAY['*'], true, true, true),
('spotify', 'Spotify', 'Global music streaming leader', '/logos/spotify.png', '/icons/spotify.svg', '#1DB954', true, true, 5, 5, 5, 'streaming', ARRAY['*'], true, true, true),
('apple_music', 'Apple Music', 'Premium music streaming', '/logos/apple-music.png', '/icons/apple-music.svg', '#FA243C', true, true, 6, 6, 6, 'streaming', ARRAY['*'], true, true, true),
('amazon_music', 'Amazon Music', 'Prime music streaming', '/logos/amazon-music.png', '/icons/amazon-music.svg', '#FF9900', true, true, 7, 7, 7, 'streaming', ARRAY['*'], true, true, true),
('deezer', 'Deezer', 'Global streaming platform', '/logos/deezer.png', '/icons/deezer.svg', '#FF0084', true, false, 8, 8, 8, 'streaming', ARRAY['*'], false, true, true),
('tidal', 'TIDAL', 'Hi-Fi music streaming', '/logos/tidal.png', '/icons/tidal.svg', '#00D7FF', true, false, 9, 9, 9, 'streaming', ARRAY['*'], false, true, true),
('bandcamp', 'Bandcamp', 'Independent artist platform', '/logos/bandcamp.png', '/icons/bandcamp.svg', '#1EA0C3', true, false, 10, 10, 10, 'streaming', ARRAY['*'], false, false, false),
('soundcloud', 'SoundCloud', 'Music sharing community', '/logos/soundcloud.png', '/icons/soundcloud.svg', '#FF8800', true, false, 11, 11, 11, 'streaming', ARRAY['*'], false, false, false),

-- Regional Tier
('anghami', 'Anghami', 'MENA streaming platform', '/logos/anghami.png', '/icons/anghami.svg', '#E3008C', true, false, 12, 12, 13, 'streaming', ARRAY['SA','AE','EG','JO','LB'], false, true, true),
('jio_saavn', 'JioSaavn', 'South Asian music platform', '/logos/jio-saavn.png', '/icons/jio-saavn.svg', '#0051BA', true, false, 13, 13, 12, 'streaming', ARRAY['IN','PK','BD'], false, true, true),

-- Additional Platforms
('pandora', 'Pandora', 'US music streaming', '/logos/pandora.png', '/icons/pandora.svg', '#3668FF', true, false, 14, 14, 14, 'streaming', ARRAY['US'], false, true, true),
('napster', 'Napster', 'Music streaming service', '/logos/napster.png', '/icons/napster.svg', '#00B3E5', true, false, 15, 15, 15, 'streaming', ARRAY['*'], false, true, true),
('tiktok', 'TikTok', 'Social video platform', '/logos/tiktok.png', '/icons/tiktok.svg', '#000000', true, false, 16, 16, 16, 'social', ARRAY['*'], false, false, false),
('youtube', 'YouTube', 'Video sharing platform', '/logos/youtube.png', '/icons/youtube.svg', '#FF0000', true, false, 17, 17, 17, 'video', ARRAY['*'], false, false, false),
('instagram', 'Instagram', 'Social media platform', '/logos/instagram.png', '/icons/instagram.svg', '#E1306C', true, false, 18, 18, 18, 'social', ARRAY['*'], false, false, false);

-- Enable RLS
ALTER TABLE platform_directory ENABLE ROW LEVEL SECURITY;

-- Everyone can view enabled platforms
CREATE POLICY "Everyone can view enabled platforms"
  ON platform_directory FOR SELECT
  USING (enabled = true);

-- Admins can manage all platforms
CREATE POLICY "Admins can manage all platforms"
  ON platform_directory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
