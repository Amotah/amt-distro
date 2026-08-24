-- SMART LINKS DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor and run
-- Time to deploy: ~2 minutes
-- =====================================================================

-- Drop existing tables if they exist (DANGER - only do on fresh setup)
-- DROP TABLE IF EXISTS public.smart_link_events CASCADE;
-- DROP TABLE IF EXISTS public.release_dsp_urls CASCADE;
-- DROP TABLE IF EXISTS public.smart_link_settings CASCADE;
-- DROP TABLE IF EXISTS public.smart_link_services CASCADE;
-- DROP TABLE IF EXISTS public.smart_links CASCADE;
-- DROP TABLE IF EXISTS public.platform_directory CASCADE;

-- =====================================================================
-- TABLE 1: smart_links (Core link data)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.smart_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  release_id TEXT,
  artwork_url TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_links_user_id ON public.smart_links(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX IF NOT EXISTS idx_smart_links_status ON public.smart_links(status);

-- Enable RLS
ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own smart links" ON public.smart_links;
DROP POLICY IF EXISTS "Users can create smart links" ON public.smart_links;
DROP POLICY IF EXISTS "Users can update their own smart links" ON public.smart_links;
DROP POLICY IF EXISTS "Users can delete their own smart links" ON public.smart_links;
DROP POLICY IF EXISTS "Public can view published smart links" ON public.smart_links;

-- Create RLS policies
CREATE POLICY "Users can view their own smart links"
  ON public.smart_links FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create smart links"
  ON public.smart_links FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smart links"
  ON public.smart_links FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smart links"
  ON public.smart_links FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public can view published smart links"
  ON public.smart_links FOR SELECT USING (is_public = true AND status = 'active');

-- =====================================================================
-- TABLE 2: smart_link_services (Platform URLs per link)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.smart_link_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  platform_key TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(smart_link_id, platform_key)
);

CREATE INDEX IF NOT EXISTS idx_smart_link_services_link ON public.smart_link_services(smart_link_id);
CREATE INDEX IF NOT EXISTS idx_smart_link_services_platform ON public.smart_link_services(platform_key);

ALTER TABLE public.smart_link_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Smart link services inherit parent link visibility" ON public.smart_link_services;

CREATE POLICY "Smart link services inherit parent link visibility"
  ON public.smart_link_services FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.smart_links
      WHERE smart_links.id = smart_link_services.smart_link_id
      AND (smart_links.user_id = auth.uid() OR (smart_links.is_public = true AND smart_links.status = 'active'))
    )
  );

-- =====================================================================
-- TABLE 3: smart_link_settings (Per-link customization)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.smart_link_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL UNIQUE REFERENCES public.smart_links(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  background_color TEXT,
  button_style TEXT DEFAULT 'pill',
  show_artist_bio BOOLEAN DEFAULT true,
  show_cover_art BOOLEAN DEFAULT true,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_link_settings_link ON public.smart_link_settings(smart_link_id);

ALTER TABLE public.smart_link_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Smart link settings inherit parent link visibility" ON public.smart_link_settings;

CREATE POLICY "Smart link settings inherit parent link visibility"
  ON public.smart_link_settings FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.smart_links
      WHERE smart_links.id = smart_link_settings.smart_link_id
      AND (smart_links.user_id = auth.uid() OR (smart_links.is_public = true AND smart_links.status = 'active'))
    )
  );

-- =====================================================================
-- TABLE 4: platform_directory (Master DSP list)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.platform_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_key TEXT NOT NULL UNIQUE,
  platform_name TEXT NOT NULL,
  icon_url TEXT,
  region TEXT DEFAULT 'global',
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_directory_key ON public.platform_directory(platform_key);

-- Insert default platforms (if not already exist)
INSERT INTO public.platform_directory (platform_key, platform_name, region, priority, icon_url)
VALUES
  ('spotify', 'Spotify', 'global', 10, 'https://open.spotifycdn.com/cdn/images/favicon.ico'),
  ('apple_music', 'Apple Music', 'global', 9, 'https://www.apple.com/favicon.ico'),
  ('youtube_music', 'YouTube Music', 'global', 8, 'https://www.youtube.com/favicon.ico'),
  ('boomplay', 'Boomplay', 'africa', 11, 'https://boomplaymusic.com/favicon.ico'),
  ('audiomack', 'Audiomack', 'africa', 10, 'https://audiomack.com/favicon.ico'),
  ('amazon_music', 'Amazon Music', 'global', 7, 'https://www.amazon.com/favicon.ico'),
  ('deezer', 'Deezer', 'global', 7, 'https://www.deezer.com/favicon.ico'),
  ('tidal', 'TIDAL', 'global', 6, 'https://tidal.com/favicon.ico'),
  ('bandcamp', 'Bandcamp', 'global', 5, 'https://bandcamp.com/favicon.ico'),
  ('soundcloud', 'SoundCloud', 'global', 5, 'https://soundcloud.com/favicon.ico'),
  ('pimp', 'Pimp', 'africa', 9, 'https://pimpmusic.com/favicon.ico'),
  ('anghami', 'Anghami', 'africa', 8, 'https://anghami.com/favicon.ico'),
  ('jio_saavn', 'JioSaavn', 'global', 5, 'https://jiosaavn.com/favicon.ico')
ON CONFLICT (platform_key) DO NOTHING;

-- =====================================================================
-- TABLE 5: release_dsp_urls (Release-level DSP mappings)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.release_dsp_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_key TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(release_id, platform_key)
);

CREATE INDEX IF NOT EXISTS idx_release_dsp_urls_release ON public.release_dsp_urls(release_id);
CREATE INDEX IF NOT EXISTS idx_release_dsp_urls_user ON public.release_dsp_urls(user_id);
CREATE INDEX IF NOT EXISTS idx_release_dsp_urls_platform ON public.release_dsp_urls(platform_key);

ALTER TABLE public.release_dsp_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own release DSP URLs" ON public.release_dsp_urls;
DROP POLICY IF EXISTS "Users can create release DSP URLs" ON public.release_dsp_urls;
DROP POLICY IF EXISTS "Users can update their own release DSP URLs" ON public.release_dsp_urls;
DROP POLICY IF EXISTS "Users can delete their own release DSP URLs" ON public.release_dsp_urls;

CREATE POLICY "Users can view their own release DSP URLs"
  ON public.release_dsp_urls FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create release DSP URLs"
  ON public.release_dsp_urls FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own release DSP URLs"
  ON public.release_dsp_urls FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own release DSP URLs"
  ON public.release_dsp_urls FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- TABLE 6: smart_link_events (Analytics tracking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.smart_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  platform_key TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  device_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_link_events_link ON public.smart_link_events(smart_link_id);
CREATE INDEX IF NOT EXISTS idx_smart_link_events_type ON public.smart_link_events(event_type);
CREATE INDEX IF NOT EXISTS idx_smart_link_events_timestamp ON public.smart_link_events(timestamp DESC);

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_smart_links_updated_at ON public.smart_links;
DROP TRIGGER IF EXISTS update_smart_link_services_updated_at ON public.smart_link_services;
DROP TRIGGER IF EXISTS update_smart_link_settings_updated_at ON public.smart_link_settings;
DROP TRIGGER IF EXISTS update_release_dsp_urls_updated_at ON public.release_dsp_urls;

-- Create triggers
CREATE TRIGGER update_smart_links_updated_at
BEFORE UPDATE ON public.smart_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_link_services_updated_at
BEFORE UPDATE ON public.smart_link_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_link_settings_updated_at
BEFORE UPDATE ON public.smart_link_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_dsp_urls_updated_at
BEFORE UPDATE ON public.release_dsp_urls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- =====================================================================

-- Check tables created
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'smart%';

-- Check platform directory populated
-- SELECT COUNT(*) as platform_count FROM public.platform_directory;

-- Test: Insert sample data (uncomment to test)
-- INSERT INTO public.smart_links (user_id, title, artist_name, slug)
-- VALUES (auth.uid(), 'Test Song', 'Test Artist', 'test-song-' || random()::text);

-- =====================================================================
-- ✅ DEPLOYMENT COMPLETE
-- =====================================================================
