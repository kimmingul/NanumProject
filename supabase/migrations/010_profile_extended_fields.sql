-- 010_profile_extended_fields.sql
-- Add extended profile fields for User Profile contact directory.
-- Run in Supabase SQL Editor.

-- =============================================
-- 1. Add new columns to profiles
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "position" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- =============================================
-- 2. Drop and recreate get_user_profile with new columns
--    (RETURNS TABLE signature changed → must DROP first)
-- =============================================

DROP FUNCTION IF EXISTS public.get_user_profile(UUID);

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID, email TEXT, full_name TEXT, avatar_url TEXT, role TEXT,
  tenant_id UUID, tenant_name TEXT, tenant_domain TEXT,
  is_active BOOLEAN, last_login_at TIMESTAMPTZ,
  phone TEXT, department TEXT, "position" TEXT,
  address TEXT, city TEXT, state TEXT, country TEXT, zip_code TEXT, bio TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.user_id, p.email::TEXT, p.full_name::TEXT, p.avatar_url, p.role::TEXT,
           p.tenant_id, t.name::TEXT, t.domain::TEXT,
           p.is_active, p.last_login_at,
           p.phone::TEXT, p.department::TEXT, p."position"::TEXT,
           p.address, p.city::TEXT, p.state::TEXT, p.country::TEXT, p.zip_code::TEXT, p.bio
    FROM public.profiles p INNER JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.user_id = COALESCE(p_user_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;

-- =============================================
-- 3. RLS: profiles columns are already covered
--    by existing tenant-level SELECT/UPDATE policies.
--    No additional RLS changes needed.
-- =============================================
