-- 008_fix_missing_functions.sql
-- Creates deactivate_user, reactivate_user, revoke_user_sessions functions
-- These were defined in 001_auth.sql but may not have been executed
-- Run in Supabase SQL Editor

-- 1) revoke_user_sessions (dependency of deactivate_user)
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id UUID)
RETURNS INT AS $$
DECLARE deleted_count INT;
BEGIN
    IF p_user_id != auth.uid() AND NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
    DELETE FROM public.sessions WHERE user_id = p_user_id AND tenant_id = public.get_current_tenant_id();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) deactivate_user
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
    IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot deactivate your own account'; END IF;
    UPDATE public.profiles SET is_active = false WHERE user_id = p_user_id AND tenant_id = public.get_current_tenant_id();
    PERFORM public.revoke_user_sessions(p_user_id);
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) reactivate_user
CREATE OR REPLACE FUNCTION public.reactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
    UPDATE public.profiles SET is_active = true WHERE user_id = p_user_id AND tenant_id = public.get_current_tenant_id();
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Grant permissions
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_user(UUID) TO authenticated;
