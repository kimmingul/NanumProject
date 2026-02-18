-- =============================================
-- NanumProject Seed Data
-- 선행: 001_auth.sql
-- =============================================

INSERT INTO public.tenants (id, name, domain, settings, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'NanumAuth Default',
    'default',
    '{
        "branding": {"logo_url": "", "primary_color": "#0078D4", "secondary_color": "#106EBE"},
        "features": {"mfa_enabled": true, "sso_enabled": false, "passwordless_enabled": false},
        "security": {"password_min_length": 8, "password_require_uppercase": true, "password_require_lowercase": true, "password_require_numbers": true, "password_require_symbols": false, "session_timeout_minutes": 60}
    }'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenants (id, name, domain, settings, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Demo Hospital',
    'demo-hospital',
    '{
        "branding": {"logo_url": "", "primary_color": "#2E7D32", "secondary_color": "#1B5E20"},
        "features": {"mfa_enabled": true, "sso_enabled": true, "passwordless_enabled": true},
        "security": {"password_min_length": 12, "password_require_uppercase": true, "password_require_lowercase": true, "password_require_numbers": true, "password_require_symbols": true, "session_timeout_minutes": 30}
    }'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- 테이블 현황 확인용 뷰
CREATE OR REPLACE VIEW public.seed_data_status AS
SELECT 'tenants' AS table_name, COUNT(*) AS record_count FROM public.tenants
UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL SELECT 'applications', COUNT(*) FROM public.applications
UNION ALL SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL SELECT 'project_items', COUNT(*) FROM public.project_items
UNION ALL SELECT 'task_assignees', COUNT(*) FROM public.task_assignees
UNION ALL SELECT 'task_dependencies', COUNT(*) FROM public.task_dependencies;

GRANT SELECT ON public.seed_data_status TO authenticated;
