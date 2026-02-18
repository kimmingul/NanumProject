-- =============================================
-- NanumAuth Row Level Security (RLS) Policies
-- Purpose: Enforce strict tenant isolation and data access control
-- =============================================

-- =============================================
-- Enable RLS on all tables
-- =============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS for RLS
-- =============================================

-- Get current user's tenant_id from their profile
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM public.profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = required_role
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- RLS POLICIES: tenants
-- =============================================

-- Users can view their own tenant
CREATE POLICY "Users can view their own tenant"
    ON public.tenants
    FOR SELECT
    TO authenticated
    USING (id = public.get_current_tenant_id());

-- Only admins can insert tenants (during onboarding)
CREATE POLICY "Admins can insert tenants"
    ON public.tenants
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_current_user_admin());

-- Only admins can update their own tenant
CREATE POLICY "Admins can update their own tenant"
    ON public.tenants
    FOR UPDATE
    TO authenticated
    USING (id = public.get_current_tenant_id() AND public.is_current_user_admin())
    WITH CHECK (id = public.get_current_tenant_id() AND public.is_current_user_admin());

-- Prevent tenant deletion via RLS (should be handled by admin tools)
CREATE POLICY "Prevent tenant deletion"
    ON public.tenants
    FOR DELETE
    TO authenticated
    USING (false);

-- =============================================
-- RLS POLICIES: profiles
-- =============================================

-- Users can view profiles within their tenant
CREATE POLICY "Users can view profiles in their tenant"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can update any profile in their tenant
CREATE POLICY "Admins can update profiles in their tenant"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id() 
        AND public.is_current_user_admin()
    )
    WITH CHECK (
        tenant_id = public.get_current_tenant_id() 
        AND public.is_current_user_admin()
    );

-- Only admins can delete profiles in their tenant
CREATE POLICY "Admins can delete profiles in their tenant"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id() 
        AND public.is_current_user_admin()
    );

-- =============================================
-- RLS POLICIES: applications
-- =============================================

-- Users can view applications in their tenant
CREATE POLICY "Users can view applications in their tenant"
    ON public.applications
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

-- Only admins and developers can create applications
CREATE POLICY "Admins and developers can create applications"
    ON public.applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id() 
        AND (public.is_current_user_admin() OR public.has_role('developer'))
    );

-- Only admins and developers can update applications
CREATE POLICY "Admins and developers can update applications"
    ON public.applications
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id() 
        AND (public.is_current_user_admin() OR public.has_role('developer'))
    )
    WITH CHECK (
        tenant_id = public.get_current_tenant_id() 
        AND (public.is_current_user_admin() OR public.has_role('developer'))
    );

-- Only admins can delete applications
CREATE POLICY "Admins can delete applications"
    ON public.applications
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id() 
        AND public.is_current_user_admin()
    );

-- =============================================
-- RLS POLICIES: audit_logs
-- =============================================

-- Only admins can view audit logs in their tenant
CREATE POLICY "Admins can view audit logs in their tenant"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id() 
        AND public.is_current_user_admin()
    );

-- System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Prevent updates and deletes on audit logs
CREATE POLICY "Prevent audit log updates"
    ON public.audit_logs
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "Prevent audit log deletes"
    ON public.audit_logs
    FOR DELETE
    TO authenticated
    USING (false);

-- =============================================
-- RLS POLICIES: sessions
-- =============================================

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
    ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own sessions"
    ON public.sessions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all sessions in their tenant
CREATE POLICY "Admins can view all sessions in their tenant"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id() 
        AND public.is_current_user_admin()
    );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant authenticated users access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

-- Grant usage on helper functions
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
