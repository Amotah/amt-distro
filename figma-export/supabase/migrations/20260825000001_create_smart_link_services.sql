-- Create smart_link_services table for managing DSP URLs per smart link
CREATE TABLE IF NOT EXISTS smart_link_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL REFERENCES smart_links(id) ON DELETE CASCADE,
  
  -- Platform identification
  platform_key TEXT NOT NULL, -- spotify, apple_music, youtube_music, etc.
  platform_name TEXT NOT NULL,
  
  -- Platform-specific data
  platform_url TEXT NOT NULL,
  platform_id TEXT, -- DSP's internal ID for this track/album
  icon_url TEXT,
  
  -- Display settings
  display_name TEXT, -- Custom display name if different from platform_name
  display_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  
  -- Performance tracking
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_platform_url CHECK (platform_url ~ '^https?://'),
  UNIQUE(smart_link_id, platform_key)
);

-- Create indexes
CREATE INDEX idx_smart_link_services_smart_link_id 
  ON smart_link_services(smart_link_id);
CREATE INDEX idx_smart_link_services_platform_key 
  ON smart_link_services(platform_key);
CREATE INDEX idx_smart_link_services_enabled 
  ON smart_link_services(enabled);
CREATE INDEX idx_smart_link_services_display_order 
  ON smart_link_services(smart_link_id, display_order);

-- Enable RLS
ALTER TABLE smart_link_services ENABLE ROW LEVEL SECURITY;

-- Users can view services for their smart links
CREATE POLICY "Users can view services for their smart links"
  ON smart_link_services FOR SELECT
  USING (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );

-- Public can view services for public smart links
CREATE POLICY "Public can view services for active smart links"
  ON smart_link_services FOR SELECT
  USING (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE is_public AND status = 'active'
    )
  );

-- Users can manage services for their smart links
CREATE POLICY "Users can create services for their smart links"
  ON smart_link_services FOR INSERT
  WITH CHECK (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update services for their smart links"
  ON smart_link_services FOR UPDATE
  USING (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete services for their smart links"
  ON smart_link_services FOR DELETE
  USING (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );
