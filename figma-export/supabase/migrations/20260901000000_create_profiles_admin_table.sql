-- SECURITY FIX #2: Migrate admin users from Deno KV to Supabase table with RLS
-- This migration creates the profiles table to store user roles and admin status
-- Admin data moves from KV store (no RLS) to Supabase table (with RLS protection)

-- ====================================================================
-- 1. CREATE PROFILES TABLE (replaces KV-based admin storage)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role indicates if user is regular user, admin, etc.
  -- 'user' = regular artist/label/listener
  -- 'admin' = admin dashboard access (includes superadmin, admin_finance, etc.)
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  
  -- Admin role (only used if role = 'admin')
  -- Matches AdminRole type from admin-service.tsx
  admin_role TEXT CHECK (admin_role IN (
    'superadmin',
    'admin_operations',
    'admin_finance',
    'admin_content',
    'admin_support',
    'admin_fraud',
    'admin_analytics'
  )),
  
  -- Admin permissions (JSON array, populated from admin-service ROLE_PERMISSIONS)
  admin_permissions TEXT[] DEFAULT '{}',
  
  -- Admin department/team
  admin_department TEXT,
  
  -- Admin account status
  admin_status TEXT DEFAULT 'active' CHECK (admin_status IN ('active', 'inactive', 'suspended')),
  
  -- Admin metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_role ON public.profiles(admin_role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- ====================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Admins can view all profiles (needed for admin dashboard user management)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_status = 'active'
    )
  );

-- Policy 3: Only superadmins can create new admin accounts
CREATE POLICY "Superadmins can create admin profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin'
      AND admin_role = 'superadmin'
      AND admin_status = 'active'
    )
  );

-- Policy 4: Only superadmins can update admin roles
CREATE POLICY "Superadmins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin'
      AND admin_role = 'superadmin'
      AND admin_status = 'active'
    )
  );

-- Policy 5: Only superadmins can delete admin profiles
CREATE POLICY "Superadmins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles
      WHERE role = 'admin'
      AND admin_role = 'superadmin'
      AND admin_status = 'active'
    )
  );

-- ====================================================================
-- 3. AUDIT TRIGGER (track changes to admin roles)
-- ====================================================================
-- Note: Audit logging is handled by backend, not database triggers
-- This is a placeholder for future audit trail implementation
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Future: Log to audit_logs table if it exists
  -- For now, just return the new row
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_changes();

-- ====================================================================
-- 4. MIGRATION: Insert admin accounts (if audit_logs table exists)
-- ====================================================================
-- Note: This is a placeholder. The actual admin migration from KV → Supabase
-- will be done via backend script (admin_migration_script.ts) because:
-- 1. We need to read from Deno KV store (not accessible from SQL)
-- 2. We need to validate admin roles match ROLE_PERMISSIONS mapping
-- 3. We should log each migration in the audit trail
-- See admin_migration_script.ts for implementation
