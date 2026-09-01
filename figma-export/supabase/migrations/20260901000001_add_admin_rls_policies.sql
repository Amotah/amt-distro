-- SECURITY FIX #3: Add admin-level RLS policies to all data tables
-- Admins with role='admin' in profiles table can now access and manage ALL user data
-- Regular users still see only their own data

-- ====================================================================
-- 1. ADMIN ACCESS POLICY FOR SMART_LINKS TABLE
-- ====================================================================
-- Admins can view all smart links (not just their own)
DROP POLICY IF EXISTS "Admins can view all smart links" ON public.smart_links;
CREATE POLICY "Admins can view all smart links"
  ON public.smart_links
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update any smart link
DROP POLICY IF EXISTS "Admins can update any smart link" ON public.smart_links;
CREATE POLICY "Admins can update any smart link"
  ON public.smart_links
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can delete any smart link
DROP POLICY IF EXISTS "Admins can delete any smart link" ON public.smart_links;
CREATE POLICY "Admins can delete any smart link"
  ON public.smart_links
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 2. ADMIN ACCESS POLICY FOR SMART_LINK_SERVICES TABLE
-- ====================================================================
-- Admins can view all services
DROP POLICY IF EXISTS "Admins can view all smart link services" ON public.smart_link_services;
CREATE POLICY "Admins can view all smart link services"
  ON public.smart_link_services
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update services
DROP POLICY IF EXISTS "Admins can update smart link services" ON public.smart_link_services;
CREATE POLICY "Admins can update smart link services"
  ON public.smart_link_services
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can delete services
DROP POLICY IF EXISTS "Admins can delete smart link services" ON public.smart_link_services;
CREATE POLICY "Admins can delete smart link services"
  ON public.smart_link_services
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 3. ADMIN ACCESS POLICY FOR SMART_LINK_SETTINGS TABLE
-- ====================================================================
-- Admins can view all settings
DROP POLICY IF EXISTS "Admins can view all smart link settings" ON public.smart_link_settings;
CREATE POLICY "Admins can view all smart link settings"
  ON public.smart_link_settings
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update settings
DROP POLICY IF EXISTS "Admins can update smart link settings" ON public.smart_link_settings;
CREATE POLICY "Admins can update smart link settings"
  ON public.smart_link_settings
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can delete settings
DROP POLICY IF EXISTS "Admins can delete smart link settings" ON public.smart_link_settings;
CREATE POLICY "Admins can delete smart link settings"
  ON public.smart_link_settings
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 4. ADMIN ACCESS POLICY FOR RELEASE_DSP_URLS TABLE (if exists)
-- ====================================================================
-- Note: Only add if table exists and has RLS enabled
-- Admins can view all DSP URLs
DROP POLICY IF EXISTS "Admins can view all release DSP URLs" ON public.release_dsp_urls;
CREATE POLICY "Admins can view all release DSP URLs"
  ON public.release_dsp_urls
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- Admins can update DSP URLs
DROP POLICY IF EXISTS "Admins can update release DSP URLs" ON public.release_dsp_urls;
CREATE POLICY "Admins can update release DSP URLs"
  ON public.release_dsp_urls
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 5. ADMIN ACCESS POLICY FOR LYRICS TABLE (if exists)
-- ====================================================================
-- Admins can view all lyrics
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

-- Admins can update lyrics
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

-- ====================================================================
-- 6. ADMIN ACCESS POLICY FOR SMART_LINK_CLICK_EVENTS TABLE
-- ====================================================================
-- Admins can view all click events for analytics
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

-- ====================================================================
-- 7. ADMIN ACCESS POLICY FOR LISTENER_STREAMS TABLE (if exists)
-- ====================================================================
-- Admins can view all streams for analytics
DROP POLICY IF EXISTS "Admins can view all listener streams" ON public.listener_streams;
CREATE POLICY "Admins can view all listener streams"
  ON public.listener_streams
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin' AND admin_status = 'active'
    )
  );

-- ====================================================================
-- NOTES:
-- ====================================================================
-- - Admins with admin_status = 'active' can access all user data
-- - Policies include: SELECT, UPDATE, DELETE operations
-- - Regular users still only see their own data (existing policies unchanged)
-- - This ensures admins can manage all platform data for oversight
-- - Each policy uses a subquery to check profiles.role = 'admin'
-- - The admin_status check prevents inactive admins from accessing data
