-- Smart Links System — Complete Database Schema
-- Deploy to Supabase using Supabase CLI or SQL Editor

-- ====================================================================
-- 1. SMART LINKS TABLE (Core link data)
-- ====================================================================
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes for common queries
CREATE INDEX idx_smart_links_user_id ON public.smart_links(user_id);
CREATE INDEX idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX idx_smart_links_status ON public.smart_links(status);
CREATE INDEX idx_smart_links_created_at ON public.smart_links(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read/write their own smart links
CREATE POLICY "Users can view their own smart links"
  ON public.smart_links
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create smart links"
  ON public.smart_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smart links"
  ON public.smart_links
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smart links"
  ON public.smart_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Public read policy (for landing page to fetch links)
CREATE POLICY "Public can view published smart links"
  ON public.smart_links
  FOR SELECT
  USING (is_public = true AND status = 'active');

-- ====================================================================
-- 2. SMART LINK SERVICES TABLE (Platform URLs per link)
-- ====================================================================
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
  
  CONSTRAINT valid_platform_url CHECK (platform_url LIKE 'http%'),
  UNIQUE(smart_link_id, platform_key)
);

CREATE INDEX idx_smart_link_services_link ON public.smart_link_services(smart_link_id);
CREATE INDEX idx_smart_link_services_platform ON public.smart_link_services(platform_key);
CREATE INDEX idx_smart_link_services_enabled ON public.smart_link_services(enabled);

ALTER TABLE public.smart_link_services ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow reading based on parent link visibility
CREATE POLICY "Smart link services inherit parent link visibility"
  ON public.smart_link_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_links
      WHERE smart_links.id = smart_link_services.smart_link_id
      AND (smart_links.user_id = auth.uid() OR (smart_links.is_public = true AND smart_links.status = 'active'))
    )
  );

-- ====================================================================
-- 3. SMART LINK SETTINGS TABLE (Per-link customization)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.smart_link_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL UNIQUE REFERENCES public.smart_links(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  background_color TEXT,
  button_style TEXT DEFAULT 'pill' CHECK (button_style IN ('pill', 'rectangle', 'rounded')),
  show_artist_bio BOOLEAN DEFAULT true,
  show_cover_art BOOLEAN DEFAULT true,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_smart_link_settings_link ON public.smart_link_settings(smart_link_id);

ALTER TABLE public.smart_link_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Smart link settings inherit parent link visibility"
  ON public.smart_link_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_links
      WHERE smart_links.id = smart_link_settings.smart_link_id
      AND (smart_links.user_id = auth.uid() OR (smart_links.is_public = true AND smart_links.status = 'active'))
    )
  );

-- ====================================================================
-- 4. PLATFORM DIRECTORY TABLE (Master list of DSPs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.platform_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_key TEXT NOT NULL UNIQUE,
  platform_name TEXT NOT NULL,
  icon_url TEXT,
  region TEXT NOT NULL DEFAULT 'global' CHECK (region IN ('global', 'africa', 'us', 'europe')),
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platforms
INSERT INTO public.platform_directory (platform_key, platform_name, region, priority, icon_url) VALUES
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

CREATE INDEX idx_platform_directory_key ON public.platform_directory(platform_key);
CREATE INDEX idx_platform_directory_region ON public.platform_directory(region);

-- ====================================================================
-- 5. RELEASE DSP URLS TABLE (Release-level DSP mappings)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.release_dsp_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_key TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_release_platform UNIQUE(release_id, platform_key),
  CONSTRAINT valid_platform_url_release CHECK (platform_url LIKE 'http%')
);

CREATE INDEX idx_release_dsp_urls_release ON public.release_dsp_urls(release_id);
CREATE INDEX idx_release_dsp_urls_user ON public.release_dsp_urls(user_id);
CREATE INDEX idx_release_dsp_urls_platform ON public.release_dsp_urls(platform_key);

ALTER TABLE public.release_dsp_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own release DSP URLs"
  ON public.release_dsp_urls
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create release DSP URLs"
  ON public.release_dsp_urls
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own release DSP URLs"
  ON public.release_dsp_urls
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own release DSP URLs"
  ON public.release_dsp_urls
  FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- 6. SMART LINKS ANALYTICS TABLE (Track events)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.smart_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  platform_key TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  device_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_smart_link_events_link ON public.smart_link_events(smart_link_id);
CREATE INDEX idx_smart_link_events_type ON public.smart_link_events(event_type);
CREATE INDEX idx_smart_link_events_timestamp ON public.smart_link_events(timestamp DESC);
CREATE INDEX idx_smart_link_events_platform ON public.smart_link_events(platform_key);

-- ====================================================================
-- 7. FUNCTIONS & TRIGGERS
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for smart_links updated_at
CREATE TRIGGER update_smart_links_updated_at
BEFORE UPDATE ON public.smart_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for smart_link_services updated_at
CREATE TRIGGER update_smart_link_services_updated_at
BEFORE UPDATE ON public.smart_link_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for smart_link_settings updated_at
CREATE TRIGGER update_smart_link_settings_updated_at
BEFORE UPDATE ON public.smart_link_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for release_dsp_urls updated_at
CREATE TRIGGER update_release_dsp_urls_updated_at
BEFORE UPDATE ON public.release_dsp_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_smart_link_views(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.smart_links
  SET total_views = total_views + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment click count
CREATE OR REPLACE FUNCTION public.increment_smart_link_clicks(link_id UUID, platform TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.smart_links
  SET total_clicks = total_clicks + 1
  WHERE id = link_id;
  
  IF platform IS NOT NULL THEN
    UPDATE public.smart_link_services
    SET click_count = click_count + 1,
        last_clicked_at = CURRENT_TIMESTAMP
    WHERE smart_link_id = link_id AND platform_key = platform;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 8. VIEWS FOR ANALYTICS
-- ====================================================================

-- View: Smart Link Summary
CREATE OR REPLACE VIEW public.smart_links_summary AS
SELECT
  sl.id,
  sl.user_id,
  sl.slug,
  sl.title,
  sl.artist_name,
  sl.total_views,
  sl.total_clicks,
  COUNT(DISTINCT sls.id) as platform_count,
  sl.created_at,
  CASE 
    WHEN sl.total_views > 0 THEN ROUND((sl.total_clicks::FLOAT / sl.total_views * 100)::NUMERIC, 2)
    ELSE 0
  END as ctr_percent
FROM public.smart_links sl
LEFT JOIN public.smart_link_services sls ON sl.id = sls.smart_link_id AND sls.enabled = true
GROUP BY sl.id, sl.user_id, sl.slug, sl.title, sl.artist_name, sl.total_views, sl.total_clicks, sl.created_at;

-- View: Platform Performance
CREATE OR REPLACE VIEW public.platform_performance AS
SELECT
  sls.smart_link_id,
  sls.platform_key,
  sls.platform_name,
  sls.click_count,
  COUNT(sle.id) FILTER (WHERE sle.event_type = 'click') as tracked_clicks,
  MAX(sle.timestamp) as last_click
FROM public.smart_link_services sls
LEFT JOIN public.smart_link_events sle ON sls.smart_link_id = sle.smart_link_id 
  AND sls.platform_key = sle.platform_key 
  AND sle.event_type = 'click'
GROUP BY sls.smart_link_id, sls.platform_key, sls.platform_name, sls.click_count;

-- ====================================================================
-- DONE: Schema deployed successfully ✅
-- ====================================================================
