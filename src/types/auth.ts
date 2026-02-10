import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import type { Profile } from './database';

/**
 * Extended authentication types
 */

export interface AuthUser extends SupabaseUser {
  profile?: Profile;
}

export interface AuthSession extends SupabaseSession {
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface SignUpCredentials extends LoginCredentials {
  fullName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
}

export interface MFAEnrollment {
  type: 'totp' | 'sms';
  phoneNumber?: string;
}

export interface MFAVerification {
  code: string;
  factorId: string;
}
