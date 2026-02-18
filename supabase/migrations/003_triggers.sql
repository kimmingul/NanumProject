-- =============================================
-- NanumAuth Database Triggers
-- Purpose: Automate common operations and maintain data integrity
-- =============================================

-- =============================================
-- TRIGGER FUNCTION: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER FUNCTION: Create profile on user signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- Get or create default tenant for new users
    -- In production, this should be replaced with proper tenant assignment logic
    SELECT id INTO default_tenant_id
    FROM public.tenants
    WHERE domain = 'default'
    LIMIT 1;
    
    -- If no default tenant exists, create one
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.tenants (name, domain, settings)
        VALUES ('Default Tenant', 'default', '{"features": {"mfa_enabled": false}}')
        RETURNING id INTO default_tenant_id;
    END IF;
    
    -- Create profile for new user
    INSERT INTO public.profiles (
        user_id,
        tenant_id,
        email,
        full_name,
        role
    )
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

-- Trigger on new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER FUNCTION: Update last_login_at on profile
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_login_at when user logs in
    IF NEW.last_sign_in_at IS NOT NULL AND 
       (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
        UPDATE public.profiles
        SET last_login_at = NEW.last_sign_in_at
        WHERE user_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user login
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_login();

-- =============================================
-- TRIGGER FUNCTION: Audit log creation
-- =============================================
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    tenant_id_val UUID;
    action_name TEXT;
    resource_type_val TEXT;
BEGIN
    -- Determine action name based on operation
    CASE TG_OP
        WHEN 'INSERT' THEN action_name := 'created';
        WHEN 'UPDATE' THEN action_name := 'updated';
        WHEN 'DELETE' THEN action_name := 'deleted';
        ELSE action_name := 'unknown';
    END CASE;
    
    -- Get resource type from table name
    resource_type_val := TG_TABLE_NAME;
    
    -- Get tenant_id from the affected row
    IF TG_OP = 'DELETE' THEN
        tenant_id_val := OLD.tenant_id;
        
        INSERT INTO public.audit_logs (
            tenant_id,
            user_id,
            action,
            resource_type,
            resource_id,
            metadata
        )
        VALUES (
            tenant_id_val,
            auth.uid(),
            action_name,
            resource_type_val,
            OLD.id,
            row_to_json(OLD)::jsonb
        );
    ELSE
        tenant_id_val := NEW.tenant_id;
        
        INSERT INTO public.audit_logs (
            tenant_id,
            user_id,
            action,
            resource_type,
            resource_id,
            metadata
        )
        VALUES (
            tenant_id_val,
            auth.uid(),
            action_name,
            resource_type_val,
            NEW.id,
            jsonb_build_object(
                'old', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
                'new', row_to_json(NEW)::jsonb
            )
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit logging to key tables
CREATE TRIGGER audit_tenants_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_applications_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- =============================================
-- TRIGGER FUNCTION: Cleanup expired sessions
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete expired sessions periodically
    DELETE FROM public.sessions
    WHERE expires_at < NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on session insert to cleanup old sessions
CREATE TRIGGER cleanup_sessions_on_insert
    AFTER INSERT ON public.sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.cleanup_expired_sessions();

-- =============================================
-- TRIGGER FUNCTION: Validate email on profile update
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure email matches the auth.users email
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

CREATE TRIGGER validate_profile_email_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_email();

-- =============================================
-- TRIGGER FUNCTION: Generate unique client credentials
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_client_credentials()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate client_id if not provided
    IF NEW.client_id IS NULL OR NEW.client_id = '' THEN
        NEW.client_id := 'app_' || encode(gen_random_bytes(16), 'hex');
    END IF;
    
    -- Generate client_secret if not provided
    IF NEW.client_secret IS NULL OR NEW.client_secret = '' THEN
        NEW.client_secret := encode(gen_random_bytes(32), 'hex');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_application_credentials
    BEFORE INSERT ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_client_credentials();

-- =============================================
-- COMMENTS: Document trigger purposes
-- =============================================
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates the updated_at timestamp on row modification';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a default profile for new users and assigns them to a tenant';
COMMENT ON FUNCTION public.handle_user_login() IS 'Updates last_login_at timestamp when user signs in';
COMMENT ON FUNCTION public.create_audit_log() IS 'Creates audit log entries for important data changes';
COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Removes expired sessions to maintain database hygiene';
COMMENT ON FUNCTION public.validate_profile_email() IS 'Ensures profile email stays in sync with auth.users email';
COMMENT ON FUNCTION public.generate_client_credentials() IS 'Generates secure client_id and client_secret for applications';
