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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          name: string;
          description: string | null;
          status: string;
          default_view: string | null;
          start_date: string | null;
          end_date: string | null;
          work_days: number[];
          is_template: boolean;
          is_starred: boolean;
          has_hours_enabled: boolean;
          lock_milestone_dates: boolean;
          allow_scheduling_on_holidays: boolean;
          in_resource_management: boolean;
          settings: unknown;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tg_id?: number | null;
          name: string;
          description?: string | null;
          status?: string;
          default_view?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          work_days?: number[];
          is_template?: boolean;
          is_starred?: boolean;
          has_hours_enabled?: boolean;
          lock_milestone_dates?: boolean;
          allow_scheduling_on_holidays?: boolean;
          in_resource_management?: boolean;
          settings?: unknown;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tg_id?: number | null;
          name?: string;
          description?: string | null;
          status?: string;
          default_view?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          work_days?: number[];
          is_template?: boolean;
          is_starred?: boolean;
          has_hours_enabled?: boolean;
          lock_milestone_dates?: boolean;
          allow_scheduling_on_holidays?: boolean;
          in_resource_management?: boolean;
          settings?: unknown;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_groups: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          project_id: string;
          parent_group_id: string | null;
          group_type: string;
          name: string;
          wbs: string | null;
          sort_order: number;
          color: string | null;
          start_date: string | null;
          end_date: string | null;
          days: number | null;
          percent_complete: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tg_id?: number | null;
          project_id: string;
          parent_group_id?: string | null;
          group_type?: string;
          name: string;
          wbs?: string | null;
          sort_order?: number;
          color?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          days?: number | null;
          percent_complete?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tg_id?: number | null;
          project_id?: string;
          parent_group_id?: string | null;
          group_type?: string;
          name?: string;
          wbs?: string | null;
          sort_order?: number;
          color?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          days?: number | null;
          percent_complete?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          project_id: string;
          group_id: string | null;
          name: string;
          description: string | null;
          wbs: string | null;
          sort_order: number;
          color: string | null;
          start_date: string | null;
          end_date: string | null;
          days: number | null;
          is_milestone: boolean;
          percent_complete: number;
          estimated_hours: number;
          actual_hours: number;
          is_estimated_hours_enabled: boolean;
          is_critical: boolean | null;
          slack: number | null;
          is_time_tracking_enabled: boolean;
          is_starred: boolean;
          custom_fields: unknown;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tg_id?: number | null;
          project_id: string;
          group_id?: string | null;
          name: string;
          description?: string | null;
          wbs?: string | null;
          sort_order?: number;
          color?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          days?: number | null;
          is_milestone?: boolean;
          percent_complete?: number;
          estimated_hours?: number;
          actual_hours?: number;
          is_estimated_hours_enabled?: boolean;
          is_critical?: boolean | null;
          slack?: number | null;
          is_time_tracking_enabled?: boolean;
          is_starred?: boolean;
          custom_fields?: unknown;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tg_id?: number | null;
          project_id?: string;
          group_id?: string | null;
          name?: string;
          description?: string | null;
          wbs?: string | null;
          sort_order?: number;
          color?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          days?: number | null;
          is_milestone?: boolean;
          percent_complete?: number;
          estimated_hours?: number;
          actual_hours?: number;
          is_estimated_hours_enabled?: boolean;
          is_critical?: boolean | null;
          slack?: number | null;
          is_time_tracking_enabled?: boolean;
          is_starred?: boolean;
          custom_fields?: unknown;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_dependencies: {
        Row: {
          id: string;
          tenant_id: string;
          predecessor_id: string;
          successor_id: string;
          dependency_type: string;
          lag_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          predecessor_id: string;
          successor_id: string;
          dependency_type?: string;
          lag_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          predecessor_id?: string;
          successor_id?: string;
          dependency_type?: string;
          lag_days?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
