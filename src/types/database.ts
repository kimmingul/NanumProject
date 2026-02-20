/**
 * Database types based on Supabase schema
 */

export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  settings: TenantSettings | null;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  features?: {
    mfa_enabled: boolean;
    sso_enabled: boolean;
    passwordless_enabled: boolean;
  };
  security?: {
    password_min_length: number;
    password_require_uppercase: boolean;
    password_require_lowercase: boolean;
    password_require_numbers: boolean;
    password_require_symbols: boolean;
    session_timeout_minutes: number;
  };
}

export interface Profile {
  id: string;
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  tenant_name?: string | null;
  metadata: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface Application {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  allowed_origins: string[];
  grant_types: GrantType[];
  token_lifetime_seconds: number;
  refresh_token_lifetime_seconds: number;
  created_at: string;
  updated_at: string;
}

export type GrantType = 
  | 'authorization_code'
  | 'refresh_token'
  | 'client_credentials'
  | 'password';

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
