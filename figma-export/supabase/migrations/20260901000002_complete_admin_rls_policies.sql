-- SECURITY FIX #5: Complete admin RLS policies for all remaining tables
-- This migration adds Row Level Security (RLS) to tables that don't have admin access policies
-- Admins with active status can now view/manage ALL user data for operational purposes
-- Regular users continue to see only their own data

-- ====================================================================
-- 1. RELEASES TABLE - Admin access policy
-- ====================================================================
-- Enable RLS if not already enabled
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

-- Users can only view their own releases
DROP POLICY IF EXISTS "Users can view own releases" ON public.releases;
CREATE POLICY "Users can view own releases"
  ON public.releases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own releases
DROP POLICY IF EXISTS "Users can insert own releases" ON public.releases;
CREATE POLICY "Users can insert own releases"
  ON public.releases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own releases
DROP POLICY IF EXISTS "Users can update own releases" ON public.releases;
CREATE POLICY "Users can update own releases"
  ON public.releases
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own releases
DROP POLICY IF EXISTS "Users can delete own releases" ON public.releases;
CREATE POLICY "Users can delete own releases"
  ON public.releases
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all releases (for moderation, analytics, support)
DROP POLICY IF EXISTS "Admins can view all releases" ON public.releases;
CREATE POLICY "Admins can view all releases"
  ON public.releases
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update any release
DROP POLICY IF EXISTS "Admins can update any release" ON public.releases;
CREATE POLICY "Admins can update any release"
  ON public.releases
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can delete any release
DROP POLICY IF EXISTS "Admins can delete any release" ON public.releases;
CREATE POLICY "Admins can delete any release"
  ON public.releases
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 2. STREAMS TABLE - Admin access policy
-- ====================================================================
-- Enable RLS if not already enabled
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

-- Users can only view their own streams
DROP POLICY IF EXISTS "Users can view own streams" ON public.streams;
CREATE POLICY "Users can view own streams"
  ON public.streams
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all streams (for analytics dashboard)
DROP POLICY IF EXISTS "Admins can view all streams" ON public.streams;
CREATE POLICY "Admins can view all streams"
  ON public.streams
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update streams (for data corrections)
DROP POLICY IF EXISTS "Admins can update streams" ON public.streams;
CREATE POLICY "Admins can update streams"
  ON public.streams
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 3. PAYMENTS TABLE - Admin access policy
-- ====================================================================
-- Enable RLS if not already enabled
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all payments (for financial audits, support)
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update payments (for refunds, corrections)
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
CREATE POLICY "Admins can update payments"
  ON public.payments
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 4. LYRICS TABLE - Admin access policy
-- ====================================================================
-- Enable RLS if not already enabled
ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;

-- Users can only view their own lyrics
DROP POLICY IF EXISTS "Users can view own lyrics" ON public.lyrics;
CREATE POLICY "Users can view own lyrics"
  ON public.lyrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own lyrics
DROP POLICY IF EXISTS "Users can insert own lyrics" ON public.lyrics;
CREATE POLICY "Users can insert own lyrics"
  ON public.lyrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lyrics
DROP POLICY IF EXISTS "Users can update own lyrics" ON public.lyrics;
CREATE POLICY "Users can update own lyrics"
  ON public.lyrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own lyrics
DROP POLICY IF EXISTS "Users can delete own lyrics" ON public.lyrics;
CREATE POLICY "Users can delete own lyrics"
  ON public.lyrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all lyrics (for content moderation)
DROP POLICY IF EXISTS "Admins can view all lyrics" ON public.lyrics;
CREATE POLICY "Admins can view all lyrics"
  ON public.lyrics
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update lyrics (for content moderation)
DROP POLICY IF EXISTS "Admins can update lyrics" ON public.lyrics;
CREATE POLICY "Admins can update lyrics"
  ON public.lyrics
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can delete lyrics (for content removal)
DROP POLICY IF EXISTS "Admins can delete lyrics" ON public.lyrics;
CREATE POLICY "Admins can delete lyrics"
  ON public.lyrics
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 5. SMART_LINK_EVENTS / CLICK_EVENTS TABLE - Admin access policy
-- ====================================================================
-- Enable RLS if table exists
-- Note: This table tracks clicks on smart links for analytics
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'smart_link_click_events') THEN
    ALTER TABLE public.smart_link_click_events ENABLE ROW LEVEL SECURITY;

    -- Users can view clicks on their own smart links
    DROP POLICY IF EXISTS "Users can view clicks on own smart links" ON public.smart_link_click_events;
    CREATE POLICY "Users can view clicks on own smart links"
      ON public.smart_link_click_events
      FOR SELECT
      USING (
        auth.uid() IN (
          SELECT user_id FROM public.smart_links
          WHERE id = smart_link_click_events.smart_link_id
        )
      );

    -- Admins can view all click events (for analytics, monitoring)
    DROP POLICY IF EXISTS "Admins can view all click events" ON public.smart_link_click_events;
    CREATE POLICY "Admins can view all click events"
      ON public.smart_link_click_events
      FOR SELECT
      USING (
        auth.uid() IN (
          SELECT user_id FROM public.profiles
          WHERE role = 'admin' AND admin_status = 'active'
        )
      );

    -- Admins can delete click events (for data cleanup)
    DROP POLICY IF EXISTS "Admins can delete click events" ON public.smart_link_click_events;
    CREATE POLICY "Admins can delete click events"
      ON public.smart_link_click_events
      FOR DELETE
      USING (
        auth.uid() IN (
          SELECT user_id FROM public.profiles
          WHERE role = 'admin' AND admin_status = 'active'
        )
      );
  END IF;
END$$;

-- ====================================================================
-- 6. LISTENER_STREAMS / STREAMING_ANALYTICS TABLE - Admin access
-- ====================================================================
-- Enable RLS if table exists
-- Note: This table tracks listener data for analytics
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listener_streams') THEN
    ALTER TABLE public.listener_streams ENABLE ROW LEVEL SECURITY;

    -- Users can view their own listener data
    DROP POLICY IF EXISTS "Users can view own listener data" ON public.listener_streams;
    CREATE POLICY "Users can view own listener data"
      ON public.listener_streams
      FOR SELECT
      USING (
        auth.uid() IN (
          SELECT user_id FROM public.releases
          WHERE id = listener_streams.release_id
        )
      );

    -- Admins can view all listener data (for platform analytics)
    DROP POLICY IF EXISTS "Admins can view all listener data" ON public.listener_streams;
    CREATE POLICY "Admins can view all listener data"
      ON public.listener_streams
      FOR SELECT
      USING (
        auth.uid() IN (
          SELECT user_id FROM public.profiles
          WHERE role = 'admin' AND admin_status = 'active'
        )
      );
  END IF;
END$$;

-- ====================================================================
-- ADMIN ROLE GRANTS
-- ====================================================================
-- Grant appropriate permissions to authenticated users (will be filtered by RLS)
GRANT SELECT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.streams TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lyrics TO authenticated;

-- Grant permissions on event/analytics tables
GRANT SELECT, DELETE ON public.smart_link_click_events TO authenticated;
GRANT SELECT ON public.listener_streams TO authenticated;

-- ====================================================================
-- VERIFICATION
-- ====================================================================
-- After applying this migration, verify with:
--
-- 1. Switch to admin user in app
-- 2. Run in Supabase SQL Editor:
--    SELECT count(*) FROM public.releases; -- Should show all
--
-- 3. Switch to non-admin user in app
-- 4. Run in Supabase SQL Editor (via JS client):
--    SELECT count(*) FROM public.releases; -- Should show only their releases
--
-- 5. Try to query another user's releases:
--    SELECT * FROM public.releases WHERE user_id = 'other-user-id';
--    Should return 0 rows (RLS prevents access)
--
-- If these work correctly, RLS is properly enforced.
