-- =============================================
-- NanumProject Auth Module (통합)
-- 내용: 테이블 + RLS + 트리거 + 함수
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. TABLES
-- =============================================

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

-- =============================================
-- 2. RLS HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = required_role LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;

-- =============================================
-- 3. RLS POLICIES
-- =============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- tenants
CREATE POLICY "Users can view their own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.get_current_tenant_id());
CREATE POLICY "Admins can insert tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update their own tenant" ON public.tenants FOR UPDATE TO authenticated USING (id = public.get_current_tenant_id() AND public.is_current_user_admin()) WITH CHECK (id = public.get_current_tenant_id() AND public.is_current_user_admin());
CREATE POLICY "Prevent tenant deletion" ON public.tenants FOR DELETE TO authenticated USING (false);

-- profiles
CREATE POLICY "Users can view profiles in their tenant" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update profiles in their tenant" ON public.profiles FOR UPDATE TO authenticated USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin()) WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());
CREATE POLICY "Admins can delete profiles in their tenant" ON public.profiles FOR DELETE TO authenticated USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

-- applications
CREATE POLICY "Users can view applications in their tenant" ON public.applications FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Admins and developers can create applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.is_current_user_admin() OR public.has_role('developer')));
CREATE POLICY "Admins and developers can update applications" ON public.applications FOR UPDATE TO authenticated USING (tenant_id = public.get_current_tenant_id() AND (public.is_current_user_admin() OR public.has_role('developer'))) WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.is_current_user_admin() OR public.has_role('developer')));
CREATE POLICY "Admins can delete applications" ON public.applications FOR DELETE TO authenticated USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

-- audit_logs (immutable)
CREATE POLICY "Admins can view audit logs in their tenant" ON public.audit_logs FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Prevent audit log updates" ON public.audit_logs FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Prevent audit log deletes" ON public.audit_logs FOR DELETE TO authenticated USING (false);

-- sessions
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all sessions in their tenant" ON public.sessions FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id() AND public.is_current_user_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

-- =============================================
-- 4. TRIGGER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE domain = 'default' LIMIT 1;
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.tenants (name, domain, settings)
        VALUES ('Default Tenant', 'default', '{"features": {"mfa_enabled": false}}')
        RETURNING id INTO default_tenant_id;
    END IF;
    INSERT INTO public.profiles (user_id, tenant_id, email, full_name, role)
    VALUES (NEW.id, default_tenant_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
        UPDATE public.profiles SET last_login_at = NEW.last_sign_in_at WHERE user_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    tenant_id_val UUID;
    action_name TEXT;
    resource_type_val TEXT;
BEGIN
    CASE TG_OP
        WHEN 'INSERT' THEN action_name := 'created';
        WHEN 'UPDATE' THEN action_name := 'updated';
        WHEN 'DELETE' THEN action_name := 'deleted';
        ELSE action_name := 'unknown';
    END CASE;
    resource_type_val := TG_TABLE_NAME;
    IF TG_OP = 'DELETE' THEN
        tenant_id_val := OLD.tenant_id;
        INSERT INTO public.audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata)
        VALUES (tenant_id_val, auth.uid(), action_name, resource_type_val, OLD.id, row_to_json(OLD)::jsonb);
    ELSE
        tenant_id_val := NEW.tenant_id;
        INSERT INTO public.audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata)
        VALUES (tenant_id_val, auth.uid(), action_name, resource_type_val, NEW.id,
            jsonb_build_object('old', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END, 'new', row_to_json(NEW)::jsonb));
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.sessions WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id AND email = NEW.email) THEN
            RAISE EXCEPTION 'Profile email must match auth.users email';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- =============================================
-- 5. TRIGGERS
-- =============================================

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_login AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();

CREATE TRIGGER audit_tenants_changes AFTER INSERT OR UPDATE OR DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
CREATE TRIGGER audit_applications_changes AFTER INSERT OR UPDATE OR DELETE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER cleanup_sessions_on_insert AFTER INSERT ON public.sessions FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_expired_sessions();
CREATE TRIGGER validate_profile_email_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_email();
CREATE TRIGGER generate_application_credentials BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.generate_client_credentials();

-- =============================================
-- 6. BUSINESS FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (user_id UUID, email TEXT, full_name TEXT, avatar_url TEXT, role TEXT, tenant_id UUID, tenant_name TEXT, tenant_domain TEXT, is_active BOOLEAN, last_login_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT p.user_id, p.email, p.full_name, p.avatar_url, p.role, p.tenant_id, t.name, t.domain, p.is_active, p.last_login_at
    FROM public.profiles p INNER JOIN public.tenants t ON t.id = p.tenant_id
    WHERE p.user_id = COALESCE(p_user_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_tenant_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (total_users BIGINT, active_users BIGINT, total_applications BIGINT, active_applications BIGINT, admin_count BIGINT, user_count BIGINT, developer_count BIGINT) AS $$
DECLARE v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, public.get_current_tenant_id());
    RETURN QUERY
    SELECT COUNT(DISTINCT p.id), COUNT(DISTINCT CASE WHEN p.is_active THEN p.id END),
        COUNT(DISTINCT a.id), COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'admin' THEN p.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'user' THEN p.id END),
        COUNT(DISTINCT CASE WHEN p.role = 'developer' THEN p.id END)
    FROM public.profiles p LEFT JOIN public.applications a ON a.tenant_id = p.tenant_id
    WHERE p.tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.search_users(p_search_term TEXT, p_limit INT DEFAULT 10, p_offset INT DEFAULT 0)
RETURNS TABLE (id UUID, user_id UUID, email TEXT, full_name TEXT, role TEXT, is_active BOOLEAN, last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.user_id, p.email, p.full_name, p.role, p.is_active, p.last_login_at, p.created_at
    FROM public.profiles p
    WHERE p.tenant_id = public.get_current_tenant_id()
    AND (p.email ILIKE '%' || p_search_term || '%' OR p.full_name ILIKE '%' || p_search_term || '%')
    ORDER BY p.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_audit_logs(p_action TEXT DEFAULT NULL, p_resource_type TEXT DEFAULT NULL, p_user_id UUID DEFAULT NULL, p_start_date TIMESTAMPTZ DEFAULT NULL, p_end_date TIMESTAMPTZ DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE (id UUID, user_id UUID, user_email TEXT, action TEXT, resource_type TEXT, resource_id UUID, ip_address INET, user_agent TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied: Only admins can view audit logs'; END IF;
    RETURN QUERY
    SELECT al.id, al.user_id, p.email, al.action, al.resource_type, al.resource_id, al.ip_address, al.user_agent, al.created_at
    FROM public.audit_logs al LEFT JOIN public.profiles p ON p.user_id = al.user_id
    WHERE al.tenant_id = public.get_current_tenant_id()
    AND (p_action IS NULL OR al.action = p_action) AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_user_id IS NULL OR al.user_id = p_user_id) AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id UUID, p_new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
    IF p_new_role NOT IN ('admin', 'user', 'developer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
    UPDATE public.profiles SET role = p_new_role WHERE user_id = p_user_id AND tenant_id = public.get_current_tenant_id();
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION public.reactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
    UPDATE public.profiles SET is_active = true WHERE user_id = p_user_id AND tenant_id = public.get_current_tenant_id();
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_sessions_count(p_user_id UUID DEFAULT NULL)
RETURNS BIGINT AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.sessions WHERE user_id = COALESCE(p_user_id, auth.uid()) AND expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.rotate_application_secret(p_application_id UUID)
RETURNS TEXT AS $$
DECLARE new_secret TEXT;
BEGIN
    IF NOT (public.is_current_user_admin() OR public.has_role('developer')) THEN RAISE EXCEPTION 'Access denied'; END IF;
    new_secret := encode(gen_random_bytes(32), 'hex');
    UPDATE public.applications SET client_secret = new_secret WHERE id = p_application_id AND tenant_id = public.get_current_tenant_id();
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
    RETURN new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
