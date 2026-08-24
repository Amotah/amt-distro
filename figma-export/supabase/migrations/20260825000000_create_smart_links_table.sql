-- Create smart_links table for core smart link metadata
CREATE TABLE IF NOT EXISTS smart_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID,
  
  -- Metadata
  title TEXT NOT NULL,
  artist_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  link_type TEXT DEFAULT 'standard', -- standard, presave
  description TEXT,
  
  -- ISRCs/UPCs
  isrc TEXT,
  upc TEXT,
  
  -- Artwork
  artwork_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, draft, expired, presave
  is_public BOOLEAN DEFAULT true,
  
  -- Analytics aggregates
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  
  -- Pre-save fields
  presave_release_date DATE,
  presave_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT valid_link_type CHECK (link_type IN ('standard', 'presave'))
);

-- Create indexes for fast lookups
CREATE INDEX idx_smart_links_user_id ON smart_links(user_id);
CREATE INDEX idx_smart_links_release_id ON smart_links(release_id);
CREATE INDEX idx_smart_links_slug ON smart_links(slug);
CREATE INDEX idx_smart_links_status ON smart_links(status);
CREATE INDEX idx_smart_links_isrc ON smart_links(isrc);
CREATE INDEX idx_smart_links_upc ON smart_links(upc);
CREATE INDEX idx_smart_links_user_status ON smart_links(user_id, status);
CREATE INDEX idx_smart_links_created_at ON smart_links(created_at DESC);

-- Enable RLS
ALTER TABLE smart_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own smart links
CREATE POLICY "Users can view their own smart links"
  ON smart_links FOR SELECT
  USING (auth.uid() = user_id);

-- Public can view active smart links
CREATE POLICY "Public can view active smart links"
  ON smart_links FOR SELECT
  USING (is_public AND status = 'active');

-- Users can create smart links
CREATE POLICY "Users can create smart links"
  ON smart_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own smart links
CREATE POLICY "Users can update their own smart links"
  ON smart_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own smart links
CREATE POLICY "Users can delete their own smart links"
  ON smart_links FOR DELETE
  USING (auth.uid() = user_id);
