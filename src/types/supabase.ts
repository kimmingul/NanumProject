/**
 * Supabase Database Schema Types
 * This file should be generated from Supabase CLI: supabase gen types typescript
 * For now, we provide a placeholder structure
 */

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          settings: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          settings?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain?: string | null;
          settings?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          metadata: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          metadata?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          metadata?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          client_id: string;
          client_secret: string;
          redirect_uris: string[];
          allowed_origins: string[];
          grant_types: string[];
          token_lifetime_seconds: number;
          refresh_token_lifetime_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          client_id: string;
          client_secret: string;
          redirect_uris?: string[];
          allowed_origins?: string[];
          grant_types?: string[];
          token_lifetime_seconds?: number;
          refresh_token_lifetime_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          client_id?: string;
          client_secret?: string;
          redirect_uris?: string[];
          allowed_origins?: string[];
          grant_types?: string[];
          token_lifetime_seconds?: number;
          refresh_token_lifetime_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: unknown | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: unknown | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
