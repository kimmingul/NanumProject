-- 007_create_tenant_user.sql
-- 1) Fix handle_new_user trigger: 'user' → 'member' (006 role check compat)
-- 2) New RPC: create_tenant_user (admin-only, SECURITY DEFINER)
-- Run in Supabase SQL Editor

-- ─── 1. Fix handle_new_user trigger ─────────────────────────────────
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
    VALUES (
        NEW.id,
        default_tenant_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'member'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. create_tenant_user RPC ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_tenant_user(
    p_email    TEXT,
    p_full_name TEXT DEFAULT '',
    p_role     TEXT DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    v_user_id   UUID;
    v_tenant_id UUID;
    v_now       TIMESTAMPTZ := now();
BEGIN
    -- Admin check
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Only admins can create users';
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'manager', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    -- Get caller's tenant
    v_tenant_id := public.get_current_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No tenant found for current user';
    END IF;

    -- Check duplicate email
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'A user with this email already exists';
    END IF;

    -- Generate UUID
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        '',                          -- empty password — user sets via reset email
        v_now,                       -- mark email as confirmed
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('full_name', p_full_name),
        v_now,
        v_now,
        '',
        ''
    );

    -- Insert into auth.identities (required for email login)
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        provider,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        'email',
        jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
        v_now,
        v_now,
        v_now
    );

    -- handle_new_user trigger fires on auth.users INSERT → creates profiles row
    -- Now update that row with the correct tenant and role
    UPDATE public.profiles
    SET tenant_id = v_tenant_id,
        role      = p_role,
        full_name = CASE WHEN p_full_name <> '' THEN p_full_name ELSE full_name END
    WHERE user_id = v_user_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.create_tenant_user(TEXT, TEXT, TEXT) TO authenticated;
