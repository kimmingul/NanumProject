-- 006_update_roles.sql
-- Update role values: admin, user, developer → admin, manager, member, viewer
-- Run in Supabase SQL Editor

-- 1) Drop old CHECK constraint first (allows 'member' value)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2) Migrate existing role values
UPDATE public.profiles SET role = 'member' WHERE role = 'user';
UPDATE public.profiles SET role = 'member' WHERE role = 'developer';

-- 3) Add new CHECK constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'viewer'));

-- 3) Update update_user_role function to accept new roles
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id UUID, p_new_role TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Only admins can change roles'; END IF;
    IF p_new_role NOT IN ('admin', 'manager', 'member', 'viewer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
    UPDATE public.profiles SET role = p_new_role WHERE user_id = p_user_id AND tenant_id = public.get_current_tenant_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Update get_tenant_stats to reflect new roles
CREATE OR REPLACE FUNCTION public.get_tenant_stats(p_tenant_id UUID)
RETURNS TABLE (total_users BIGINT, active_users BIGINT, total_apps BIGINT, active_apps BIGINT, admin_count BIGINT, manager_count BIGINT, member_count BIGINT, viewer_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT CASE WHEN p.is_active THEN p.id END),
        COUNT(DISTINCT a.id),
        COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'admin' THEN p.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'manager' THEN p.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'member' THEN p.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'viewer' THEN p.id END)
    FROM public.profiles p
    LEFT JOIN public.applications a ON a.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
