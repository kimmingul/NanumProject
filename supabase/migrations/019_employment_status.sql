-- 019_employment_status.sql
-- Add employment_status field to profiles table for HR management
-- Run in Supabase SQL Editor

-- Create employment status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
    CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');
  END IF;
END $$;

-- Add employment_status column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employment_status employment_status DEFAULT 'active';

-- Migrate existing data: is_active = false -> 'terminated', else 'active'
UPDATE profiles
SET employment_status = CASE
  WHEN is_active = false THEN 'terminated'::employment_status
  ELSE 'active'::employment_status
END
WHERE employment_status IS NULL;

-- Add department_id column for org chart (nullable, references department name in tenant_enum_config)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department_id TEXT;

-- Add manager_id column for org chart hierarchy (references profiles.id primary key)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for employment status queries
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON profiles(tenant_id, employment_status);

-- Create index for org chart queries
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(tenant_id, manager_id);

-- Create index for department queries
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(tenant_id, department_id);

-- RPC function to update employment status (admin only)
CREATE OR REPLACE FUNCTION update_employment_status(
  p_user_id UUID,
  p_status employment_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admin can update employment status';
  END IF;

  UPDATE profiles
  SET employment_status = p_status,
      updated_at = now()
  WHERE user_id = p_user_id
    AND tenant_id = get_current_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in current tenant';
  END IF;
END;
$$;

-- RPC function to update manager (for org chart)
-- Note: p_manager_id is user_id, but we store profile.id in manager_id column
CREATE OR REPLACE FUNCTION update_user_manager(
  p_user_id UUID,
  p_manager_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_manager_profile_id UUID;
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admin can update user manager';
  END IF;

  -- Get profile id for the user
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = p_user_id
    AND tenant_id = get_current_tenant_id();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User not found in current tenant';
  END IF;

  -- If manager_id is provided, get the manager's profile id
  IF p_manager_id IS NOT NULL THEN
    SELECT id INTO v_manager_profile_id
    FROM profiles
    WHERE user_id = p_manager_id
      AND tenant_id = get_current_tenant_id();

    IF v_manager_profile_id IS NULL THEN
      RAISE EXCEPTION 'Manager not found in current tenant';
    END IF;

    IF v_profile_id = v_manager_profile_id THEN
      RAISE EXCEPTION 'User cannot be their own manager';
    END IF;
  END IF;

  UPDATE profiles
  SET manager_id = v_manager_profile_id,
      updated_at = now()
  WHERE id = v_profile_id;
END;
$$;

-- RPC function to update department
CREATE OR REPLACE FUNCTION update_user_department(
  p_user_id UUID,
  p_department_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admin can update user department';
  END IF;

  UPDATE profiles
  SET department_id = p_department_id,
      updated_at = now()
  WHERE user_id = p_user_id
    AND tenant_id = get_current_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in current tenant';
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_employment_status(UUID, employment_status) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_department(UUID, TEXT) TO authenticated;

COMMENT ON COLUMN profiles.employment_status IS 'Employment status: active, on_leave, or terminated';
COMMENT ON COLUMN profiles.department_id IS 'Department ID (references tenant_enum_config department value)';
COMMENT ON COLUMN profiles.manager_id IS 'Direct manager profile id for org chart hierarchy';
