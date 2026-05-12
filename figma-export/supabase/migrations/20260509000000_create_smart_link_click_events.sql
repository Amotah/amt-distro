-- Create smart_link_click_events table for storing click analytics
CREATE TABLE IF NOT EXISTS smart_link_click_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  device_type TEXT NOT NULL,
  os TEXT NOT NULL,
  country TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient querying
  CONSTRAINT smart_link_click_valid_device CHECK (device_type IN ('mobile', 'tablet', 'desktop'))
);

-- Create indexes for common query patterns
CREATE INDEX idx_smart_link_click_events_link_id 
  ON smart_link_click_events(link_id);

CREATE INDEX idx_smart_link_click_events_user_id 
  ON smart_link_click_events(user_id);

CREATE INDEX idx_smart_link_click_events_user_link 
  ON smart_link_click_events(user_id, link_id);

CREATE INDEX idx_smart_link_click_events_created_at 
  ON smart_link_click_events(created_at DESC);

-- Create composite index for common analytics queries
CREATE INDEX idx_smart_link_click_events_analytics 
  ON smart_link_click_events(user_id, link_id, created_at DESC);

-- Enable RLS
ALTER TABLE smart_link_click_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own click events
CREATE POLICY "Users can view their own click events"
  ON smart_link_click_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Edge Functions (with service role key) can insert events
CREATE POLICY "Service role can insert click events"
  ON smart_link_click_events
  FOR INSERT
  WITH CHECK (true);
