-- =============================================
-- NanumAuth Seed Data
-- Purpose: Initialize database with sample data for development/testing
-- =============================================

-- =============================================
-- SEED: Default Tenant
-- =============================================
INSERT INTO public.tenants (id, name, domain, settings, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'NanumAuth Default',
    'default',
    '{
        "branding": {
            "logo_url": "",
            "primary_color": "#0078D4",
            "secondary_color": "#106EBE"
        },
        "features": {
            "mfa_enabled": true,
            "sso_enabled": false,
            "passwordless_enabled": false
        },
        "security": {
            "password_min_length": 8,
            "password_require_uppercase": true,
            "password_require_lowercase": true,
            "password_require_numbers": true,
            "password_require_symbols": false,
            "session_timeout_minutes": 60
        }
    }'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SEED: Demo Tenant for Testing
-- =============================================
INSERT INTO public.tenants (id, name, domain, settings, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Demo Hospital',
    'demo-hospital',
    '{
        "branding": {
            "logo_url": "",
            "primary_color": "#2E7D32",
            "secondary_color": "#1B5E20"
        },
        "features": {
            "mfa_enabled": true,
            "sso_enabled": true,
            "passwordless_enabled": true
        },
        "security": {
            "password_min_length": 12,
            "password_require_uppercase": true,
            "password_require_lowercase": true,
            "password_require_numbers": true,
            "password_require_symbols": true,
            "session_timeout_minutes": 30
        }
    }'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- NOTE: User profiles and applications should be created
-- after actual users sign up through the authentication system.
-- The following are examples and should not be used in production.
-- =============================================

-- Example profile structure (DO NOT USE - for reference only):
/*
INSERT INTO public.profiles (user_id, tenant_id, email, full_name, role)
VALUES (
    'user-uuid-from-auth',
    '00000000-0000-0000-0000-000000000001',
    'admin@nanumauth.com',
    'Admin User',
    'admin'
);
*/

-- Example application structure (DO NOT USE - for reference only):
/*
INSERT INTO public.applications (
    tenant_id,
    name,
    description,
    redirect_uris,
    allowed_origins,
    grant_types
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'My Application',
    'Sample OAuth2 application',
    ARRAY['http://localhost:3000/callback'],
    ARRAY['http://localhost:3000'],
    ARRAY['authorization_code', 'refresh_token']
);
*/

-- =============================================
-- UTILITY: View to check seed data
-- =============================================
CREATE OR REPLACE VIEW public.seed_data_status AS
SELECT 
    'tenants' AS table_name,
    COUNT(*) AS record_count
FROM public.tenants
UNION ALL
SELECT 
    'profiles' AS table_name,
    COUNT(*) AS record_count
FROM public.profiles
UNION ALL
SELECT 
    'applications' AS table_name,
    COUNT(*) AS record_count
FROM public.applications
UNION ALL
SELECT 
    'audit_logs' AS table_name,
    COUNT(*) AS record_count
FROM public.audit_logs
UNION ALL
SELECT 
    'sessions' AS table_name,
    COUNT(*) AS record_count
FROM public.sessions;

-- Grant access to view
GRANT SELECT ON public.seed_data_status TO authenticated;

COMMENT ON VIEW public.seed_data_status IS 'Quick overview of record counts in all main tables';
