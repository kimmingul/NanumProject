-- =============================================
-- NanumAuth Database Schema
-- Multi-tenant Identity as a Service (IDaaS)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: tenants
-- Purpose: Stores tenant (customer) information
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

-- Index for faster tenant lookups
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON public.tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(is_active);

-- =============================================
-- TABLE: profiles
-- Purpose: Extended user information linked to auth.users
-- =============================================
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

-- Indexes for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================
-- TABLE: applications
-- Purpose: OAuth2/OIDC applications per tenant
-- =============================================
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

-- Indexes for applications
CREATE INDEX IF NOT EXISTS idx_applications_tenant_id ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_client_id ON public.applications(client_id);
CREATE INDEX IF NOT EXISTS idx_applications_active ON public.applications(is_active);

-- =============================================
-- TABLE: audit_logs
-- Purpose: Security and compliance audit trail
-- =============================================
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

-- Indexes for audit logs (optimized for time-based queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- =============================================
-- TABLE: sessions
-- Purpose: Track active user sessions for security
-- =============================================
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

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON public.sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- =============================================
-- COMMENTS: Table and column documentation
-- =============================================
COMMENT ON TABLE public.tenants IS 'Stores tenant (customer/organization) information for multi-tenancy';
COMMENT ON TABLE public.profiles IS 'Extended user profiles linked to auth.users with tenant association';
COMMENT ON TABLE public.applications IS 'OAuth2/OIDC client applications registered per tenant';
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for compliance and monitoring';
COMMENT ON TABLE public.sessions IS 'Active user session tracking for security management';

COMMENT ON COLUMN public.tenants.settings IS 'JSONB field for tenant-specific configuration (branding, features, security)';
COMMENT ON COLUMN public.profiles.metadata IS 'JSONB field for additional user attributes and custom fields';
COMMENT ON COLUMN public.applications.grant_types IS 'Supported OAuth2 grant types: authorization_code, refresh_token, client_credentials, password';
COMMENT ON COLUMN public.audit_logs.metadata IS 'JSONB field for action-specific context and details';
