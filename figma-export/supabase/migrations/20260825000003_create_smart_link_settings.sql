-- Create smart_link_settings table for customization options
CREATE TABLE IF NOT EXISTS smart_link_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL UNIQUE REFERENCES smart_links(id) ON DELETE CASCADE,
  
  -- Theme settings
  theme TEXT DEFAULT 'dark', -- light, dark, custom
  background_color TEXT DEFAULT '#000000',
  background_image_url TEXT,
  background_style TEXT DEFAULT 'solid', -- solid, gradient, image
  
  -- Button styling
  button_style TEXT DEFAULT 'pill', -- pill, rounded, square
  button_color TEXT DEFAULT '#FF6B00', -- Primary button color
  button_text_color TEXT DEFAULT '#FFFFFF',
  button_hover_effect TEXT DEFAULT 'scale', -- scale, glow, shadow
  
  -- Layout & display
  show_artist_bio BOOLEAN DEFAULT true,
  show_cover_art BOOLEAN DEFAULT true,
  show_amtdistro_branding BOOLEAN DEFAULT true,
  show_release_info BOOLEAN DEFAULT true,
  show_share_buttons BOOLEAN DEFAULT true,
  show_social_links BOOLEAN DEFAULT true,
  show_stats BOOLEAN DEFAULT false,
  
  -- Social media links
  social_links JSONB DEFAULT '{}'::jsonb, -- {"instagram": "...", "twitter": "...", etc}
  artist_profile_url TEXT,
  
  -- Advanced (paid tier)
  custom_css TEXT,
  custom_domain TEXT UNIQUE,
  tracking_pixel_code TEXT,
  remove_branding BOOLEAN DEFAULT false,
  show_presave_countdown BOOLEAN DEFAULT true,
  
  -- Email capture (pre-save)
  enable_email_capture BOOLEAN DEFAULT false,
  email_service_id TEXT, -- mailchimp, convertkit, etc
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'custom')),
  CONSTRAINT valid_button_style CHECK (button_style IN ('pill', 'rounded', 'square')),
  CONSTRAINT valid_button_hover CHECK (button_hover_effect IN ('scale', 'glow', 'shadow')),
  CONSTRAINT valid_background_style CHECK (background_style IN ('solid', 'gradient', 'image'))
);

-- Create indexes
CREATE INDEX idx_smart_link_settings_smart_link_id 
  ON smart_link_settings(smart_link_id);
CREATE INDEX idx_smart_link_settings_custom_domain 
  ON smart_link_settings(custom_domain);

-- Enable RLS
ALTER TABLE smart_link_settings ENABLE ROW LEVEL SECURITY;

-- Users can view settings for their smart links
CREATE POLICY "Users can view settings for their smart links"
  ON smart_link_settings FOR SELECT
  USING (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );

-- Users can manage settings for their smart links
CREATE POLICY "Users can manage settings for their smart links"
  ON smart_link_settings FOR INSERT
  WITH CHECK (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update settings for their smart links"
  ON smart_link_settings FOR UPDATE
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

CREATE POLICY "Users can delete settings for their smart links"
  ON smart_link_settings FOR DELETE
  USING (
    smart_link_id IN (
      SELECT id FROM smart_links WHERE user_id = auth.uid()
    )
  );
