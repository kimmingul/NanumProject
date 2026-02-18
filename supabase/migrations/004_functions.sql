-- =============================================
-- NanumAuth Database Functions
-- Purpose: Reusable functions for common operations
-- =============================================

-- =============================================
-- FUNCTION: Get user's full profile with tenant info
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    tenant_domain TEXT,
    is_active BOOLEAN,
    last_login_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.email,
        p.full_name,
        p.avatar_url,
        p.role,
        p.tenant_id,
        t.name AS tenant_name,
        t.domain AS tenant_domain,
        p.is_active,
        p.last_login_at
    FROM public.profiles p
    INNER JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.user_id = COALESCE(p_user_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- FUNCTION: Get tenant statistics
-- =============================================
CREATE OR REPLACE FUNCTION public.get_tenant_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_users BIGINT,
    active_users BIGINT,
    total_applications BIGINT,
    active_applications BIGINT,
    admin_count BIGINT,
    user_count BIGINT,
    developer_count BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, public.get_current_tenant_id());
    
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id) AS total_users,
        COUNT(DISTINCT CASE WHEN p.is_active THEN p.id END) AS active_users,
        COUNT(DISTINCT a.id) AS total_applications,
        COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END) AS active_applications,
        COUNT(DISTINCT CASE WHEN p.role = 'admin' THEN p.id END) AS admin_count,
        COUNT(DISTINCT CASE WHEN p.role = 'user' THEN p.id END) AS user_count,
        COUNT(DISTINCT CASE WHEN p.role = 'developer' THEN p.id END) AS developer_count
    FROM public.profiles p
    LEFT JOIN public.applications a ON a.tenant_id = p.tenant_id
    WHERE p.tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- FUNCTION: Search users within tenant
-- =============================================
CREATE OR REPLACE FUNCTION public.search_users(
    p_search_term TEXT,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_active BOOLEAN,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.email,
        p.full_name,
        p.role,
        p.is_active,
        p.last_login_at,
        p.created_at
    FROM public.profiles p
    WHERE p.tenant_id = public.get_current_tenant_id()
    AND (
        p.email ILIKE '%' || p_search_term || '%'
        OR p.full_name ILIKE '%' || p_search_term || '%'
    )
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- FUNCTION: Get audit logs with filters
-- =============================================
CREATE OR REPLACE FUNCTION public.get_audit_logs(
    p_action TEXT DEFAULT NULL,
    p_resource_type TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Only admins can access audit logs
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Only admins can view audit logs';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id,
        al.user_id,
        p.email AS user_email,
        al.action,
        al.resource_type,
        al.resource_id,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM public.audit_logs al
    LEFT JOIN public.profiles p ON p.user_id = al.user_id
    WHERE al.tenant_id = public.get_current_tenant_id()
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- FUNCTION: Revoke user sessions
-- =============================================
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    -- Only admins can revoke other users' sessions
    IF p_user_id != auth.uid() AND NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Only admins can revoke other users sessions';
    END IF;
    
    -- Delete sessions
    DELETE FROM public.sessions
    WHERE user_id = p_user_id
    AND tenant_id = public.get_current_tenant_id();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Update user role
-- =============================================
CREATE OR REPLACE FUNCTION public.update_user_role(
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only admins can update user roles
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Only admins can update user roles';
    END IF;
    
    -- Validate role
    IF p_new_role NOT IN ('admin', 'user', 'developer') THEN
        RAISE EXCEPTION 'Invalid role: must be admin, user, or developer';
    END IF;
    
    -- Update role
    UPDATE public.profiles
    SET role = p_new_role
    WHERE user_id = p_user_id
    AND tenant_id = public.get_current_tenant_id();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Deactivate user
-- =============================================
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only admins can deactivate users
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Only admins can deactivate users';
    END IF;
    
    -- Prevent self-deactivation
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot deactivate your own account';
    END IF;
    
    -- Deactivate profile
    UPDATE public.profiles
    SET is_active = false
    WHERE user_id = p_user_id
    AND tenant_id = public.get_current_tenant_id();
    
    -- Revoke all sessions
    PERFORM public.revoke_user_sessions(p_user_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Reactivate user
-- =============================================
CREATE OR REPLACE FUNCTION public.reactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only admins can reactivate users
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Only admins can reactivate users';
    END IF;
    
    UPDATE public.profiles
    SET is_active = true
    WHERE user_id = p_user_id
    AND tenant_id = public.get_current_tenant_id();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Get active sessions count
-- =============================================
CREATE OR REPLACE FUNCTION public.get_active_sessions_count(p_user_id UUID DEFAULT NULL)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.sessions
        WHERE user_id = COALESCE(p_user_id, auth.uid())
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- FUNCTION: Rotate application credentials
-- =============================================
CREATE OR REPLACE FUNCTION public.rotate_application_secret(p_application_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_secret TEXT;
BEGIN
    -- Only admins and developers can rotate credentials
    IF NOT (public.is_current_user_admin() OR public.has_role('developer')) THEN
        RAISE EXCEPTION 'Access denied: Only admins and developers can rotate credentials';
    END IF;
    
    -- Generate new secret
    new_secret := encode(gen_random_bytes(32), 'hex');
    
    -- Update application
    UPDATE public.applications
    SET client_secret = new_secret
    WHERE id = p_application_id
    AND tenant_id = public.get_current_tenant_id();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found or access denied';
    END IF;
    
    RETURN new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_sessions_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_application_secret(UUID) TO authenticated;

-- =============================================
-- COMMENTS: Function documentation
-- =============================================
COMMENT ON FUNCTION public.get_user_profile(UUID) IS 'Retrieves comprehensive user profile with tenant information';
COMMENT ON FUNCTION public.get_tenant_stats(UUID) IS 'Returns aggregated statistics for a tenant';
COMMENT ON FUNCTION public.search_users(TEXT, INT, INT) IS 'Searches users within current tenant by email or name';
COMMENT ON FUNCTION public.get_audit_logs(TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) IS 'Retrieves filtered audit logs (admin only)';
COMMENT ON FUNCTION public.revoke_user_sessions(UUID) IS 'Revokes all active sessions for a user';
COMMENT ON FUNCTION public.update_user_role(UUID, TEXT) IS 'Updates user role within tenant (admin only)';
COMMENT ON FUNCTION public.deactivate_user(UUID) IS 'Deactivates user account and revokes sessions (admin only)';
COMMENT ON FUNCTION public.reactivate_user(UUID) IS 'Reactivates previously deactivated user (admin only)';
COMMENT ON FUNCTION public.get_active_sessions_count(UUID) IS 'Returns count of active sessions for a user';
COMMENT ON FUNCTION public.rotate_application_secret(UUID) IS 'Generates new client_secret for application (admin/developer only)';
