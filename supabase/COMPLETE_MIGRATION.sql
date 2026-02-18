-- =============================================
-- NanumAuth Complete Database Migration
-- Execute this entire file in Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: Initial Schema (001_initial_schema.sql)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT tenants_name_check CHECK (char_length(name) >= 2),
    CONSTRAINT tenants_domain_check CHECK (domain ~* '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

CREATE INDEX IF NOT EXISTS idx_tenants_domain ON public.tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(is_active);

-- TABLE: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT profiles_user_tenant_unique UNIQUE(user_id, tenant_id),
    CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'developer'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- TABLE: applications
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'base64'),
    client_secret VARCHAR(255) NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
    redirect_uris TEXT[] DEFAULT ARRAY[]::TEXT[],
    allowed_origins TEXT[] DEFAULT ARRAY[]::TEXT[],
    grant_types TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token']::TEXT[],
    token_lifetime_seconds INTEGER DEFAULT 3600,
    refresh_token_lifetime_seconds INTEGER DEFAULT 2592000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT applications_name_check CHECK (char_length(name) >= 2),
    CONSTRAINT applications_token_lifetime_check CHECK (token_lifetime_seconds > 0),
    CONSTRAINT applications_refresh_token_lifetime_check CHECK (refresh_token_lifetime_seconds > 0)
);

CREATE INDEX IF NOT EXISTS idx_applications_tenant_id ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_client_id ON public.applications(client_id);
CREATE INDEX IF NOT EXISTS idx_applications_active ON public.applications(is_active);

-- TABLE: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT audit_logs_action_check CHECK (char_length(action) >= 2),
    CONSTRAINT audit_logs_resource_type_check CHECK (char_length(resource_type) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- TABLE: sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT sessions_token_hash_unique UNIQUE(token_hash)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON public.sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

COMMENT ON TABLE public.tenants IS 'Stores tenant (customer/organization) information for multi-tenancy';
COMMENT ON TABLE public.profiles IS 'Extended user profiles linked to auth.users with tenant association';
COMMENT ON TABLE public.applications IS 'OAuth2/OIDC client applications registered per tenant';
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for compliance and monitoring';
COMMENT ON TABLE public.sessions IS 'Active user session tracking for security management';

-- =============================================
-- STEP 2: RLS Policies (002_rls_policies.sql)
-- =============================================

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Helper Functions
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

-- Tenants Policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant"
    ON public.tenants FOR SELECT TO authenticated
    USING (id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
CREATE POLICY "Admins can insert tenants"
    ON public.tenants FOR INSERT TO authenticated
    WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update their own tenant" ON public.tenants;
CREATE POLICY "Admins can update their own tenant"
    ON public.tenants FOR UPDATE TO authenticated
    USING (id = public.get_current_tenant_id() AND public.is_current_user_admin())
    WITH CHECK (id = public.get_current_tenant_id() AND public.is_current_user_admin());

DROP POLICY IF EXISTS "Prevent tenant deletion" ON public.tenants;
CREATE POLICY "Prevent tenant deletion"
    ON public.tenants FOR DELETE TO authenticated
    USING (false);

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
CREATE POLICY "Users can view profiles in their tenant"
    ON public.profiles FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update profiles in their tenant" ON public.profiles;
CREATE POLICY "Admins can update profiles in their tenant"
    ON public.profiles FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin())
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete profiles in their tenant" ON public.profiles;
CREATE POLICY "Admins can delete profiles in their tenant"
    ON public.profiles FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

-- Applications Policies
DROP POLICY IF EXISTS "Users can view applications in their tenant" ON public.applications;
CREATE POLICY "Users can view applications in their tenant"
    ON public.applications FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Admins and developers can create applications" ON public.applications;
CREATE POLICY "Admins and developers can create applications"
    ON public.applications FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.is_current_user_admin() OR public.has_role('developer')));

DROP POLICY IF EXISTS "Admins and developers can update applications" ON public.applications;
CREATE POLICY "Admins and developers can update applications"
    ON public.applications FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.is_current_user_admin() OR public.has_role('developer')))
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.is_current_user_admin() OR public.has_role('developer')));

DROP POLICY IF EXISTS "Admins can delete applications" ON public.applications;
CREATE POLICY "Admins can delete applications"
    ON public.applications FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

-- Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs in their tenant" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs in their tenant"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Prevent audit log updates" ON public.audit_logs;
CREATE POLICY "Prevent audit log updates"
    ON public.audit_logs FOR UPDATE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "Prevent audit log deletes" ON public.audit_logs;
CREATE POLICY "Prevent audit log deletes"
    ON public.audit_logs FOR DELETE TO authenticated
    USING (false);

-- Sessions Policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions"
    ON public.sessions FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.sessions;
CREATE POLICY "Users can insert their own sessions"
    ON public.sessions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
CREATE POLICY "Users can update their own sessions"
    ON public.sessions FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
CREATE POLICY "Users can delete their own sessions"
    ON public.sessions FOR DELETE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all sessions in their tenant" ON public.sessions;
CREATE POLICY "Admins can view all sessions in their tenant"
    ON public.sessions FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;

-- =============================================
-- STEP 3: Triggers (003_triggers.sql)
-- =============================================

-- Update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id
    FROM public.tenants
    WHERE domain = 'default'
    LIMIT 1;
    
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.tenants (name, domain, settings)
        VALUES ('Default Tenant', 'default', '{"features": {"mfa_enabled": false}}')
        RETURNING id INTO default_tenant_id;
    END IF;
    
    INSERT INTO public.profiles (user_id, tenant_id, email, full_name, role)
    VALUES (
        NEW.id,
        default_tenant_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Handle user login
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_sign_in_at IS NOT NULL AND 
       (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
        UPDATE public.profiles
        SET last_login_at = NEW.last_sign_in_at
        WHERE user_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_login();

-- Cleanup sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.sessions
    WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cleanup_sessions_on_insert ON public.sessions;
CREATE TRIGGER cleanup_sessions_on_insert
    AFTER INSERT ON public.sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.cleanup_expired_sessions();

-- Validate email
CREATE OR REPLACE FUNCTION public.validate_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = NEW.user_id 
            AND email = NEW.email
        ) THEN
            RAISE EXCEPTION 'Profile email must match auth.users email';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_profile_email_trigger ON public.profiles;
CREATE TRIGGER validate_profile_email_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_email();

-- Generate credentials
CREATE OR REPLACE FUNCTION public.generate_client_credentials()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_id IS NULL OR NEW.client_id = '' THEN
        NEW.client_id := 'app_' || encode(gen_random_bytes(16), 'hex');
    END IF;
    
    IF NEW.client_secret IS NULL OR NEW.client_secret = '' THEN
        NEW.client_secret := encode(gen_random_bytes(32), 'hex');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_application_credentials ON public.applications;
CREATE TRIGGER generate_application_credentials
    BEFORE INSERT ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_client_credentials();

-- =============================================
-- STEP 4: Functions (004_functions.sql) - Partial
-- =============================================

-- Get user profile
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
        p.user_id, p.email, p.full_name, p.avatar_url, p.role,
        p.tenant_id, t.name AS tenant_name, t.domain AS tenant_domain,
        p.is_active, p.last_login_at
    FROM public.profiles p
    INNER JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.user_id = COALESCE(p_user_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;

-- =============================================
-- STEP 5: Seed Data (005_seed_data.sql)
-- =============================================

INSERT INTO public.tenants (id, name, domain, settings, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'NanumAuth Default',
    'default',
    '{"branding":{"logo_url":"","primary_color":"#0078D4","secondary_color":"#106EBE"},"features":{"mfa_enabled":true,"sso_enabled":false,"passwordless_enabled":false},"security":{"password_min_length":8,"password_require_uppercase":true,"password_require_lowercase":true,"password_require_numbers":true,"password_require_symbols":false,"session_timeout_minutes":60}}'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenants (id, name, domain, settings, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Demo Hospital',
    'demo-hospital',
    '{"branding":{"logo_url":"","primary_color":"#2E7D32","secondary_color":"#1B5E20"},"features":{"mfa_enabled":true,"sso_enabled":true,"passwordless_enabled":true},"security":{"password_min_length":12,"password_require_uppercase":true,"password_require_lowercase":true,"password_require_numbers":true,"password_require_symbols":true,"session_timeout_minutes":30}}'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW public.seed_data_status AS
SELECT 'tenants' AS table_name, COUNT(*) AS record_count FROM public.tenants
UNION ALL
SELECT 'profiles' AS table_name, COUNT(*) AS record_count FROM public.profiles
UNION ALL
SELECT 'applications' AS table_name, COUNT(*) AS record_count FROM public.applications
UNION ALL
SELECT 'audit_logs' AS table_name, COUNT(*) AS record_count FROM public.audit_logs
UNION ALL
SELECT 'sessions' AS table_name, COUNT(*) AS record_count FROM public.sessions;

GRANT SELECT ON public.seed_data_status TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

SELECT 'Migration completed successfully!' AS status;
SELECT * FROM public.seed_data_status;
