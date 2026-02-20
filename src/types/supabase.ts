/**
 * Supabase Database Schema Types
 * Covers both Auth module and PM module tables
 */

export interface Database {
  public: {
    Tables: {
      // ========== Auth Module ==========
      tenants: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          settings: unknown | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          settings?: unknown | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          domain?: string | null;
          settings?: unknown | null;
          is_active?: boolean;
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
          preferences: unknown;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tenant_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          preferences?: unknown;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          metadata?: unknown | null;
          preferences?: unknown;
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          name: string;
          description?: string | null;
          client_id?: string;
          client_secret?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          redirect_uris?: string[];
          allowed_origins?: string[];
          is_active?: boolean;
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
          tenant_id: string;
          action: string;
          resource_type: string;
          user_id?: string | null;
          resource_id?: string | null;
          metadata?: unknown | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      // ========== PM Module ==========
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
          has_hours_enabled: boolean;
          lock_milestone_dates: boolean;
          allow_scheduling_on_holidays: boolean;
          in_resource_management: boolean;
          settings: unknown;
          is_active: boolean;
          created_by: string | null;
          manager_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          name: string;
          description?: string | null;
          status?: string;
          default_view?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          work_days?: number[];
          is_template?: boolean;
          has_hours_enabled?: boolean;
          settings?: unknown;
          created_by?: string | null;
          manager_id?: string | null;
          tg_id?: number | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
          has_hours_enabled?: boolean;
          is_active?: boolean;
          settings?: unknown;
          manager_id?: string | null;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          project_id: string;
          user_id: string;
          permission: string;
          status: string;
          color: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          project_id: string;
          user_id: string;
          permission?: string;
          status?: string;
          color?: string | null;
        };
        Update: {
          permission?: string;
          status?: string;
          color?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      project_items: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          project_id: string;
          parent_id: string | null;
          item_type: string;
          name: string;
          description: string | null;
          wbs: string | null;
          sort_order: number;
          color: string | null;
          start_date: string | null;
          end_date: string | null;
          days: number | null;
          percent_complete: number;
          estimated_hours: number;
          actual_hours: number;
          is_estimated_hours_enabled: boolean;
          is_critical: boolean | null;
          slack: number | null;
          is_milestone: boolean;
          is_time_tracking_enabled: boolean;
          is_starred: boolean;
          task_status: string;
          custom_fields: unknown;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          project_id: string;
          item_type: string;
          name: string;
          parent_id?: string | null;
          description?: string | null;
          wbs?: string | null;
          sort_order?: number;
          color?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          days?: number | null;
          percent_complete?: number;
          estimated_hours?: number;
          actual_hours?: number;
          is_estimated_hours_enabled?: boolean;
          is_milestone?: boolean;
          task_status?: string;
          custom_fields?: unknown;
          created_by?: string | null;
          tg_id?: number | null;
        };
        Update: {
          name?: string;
          parent_id?: string | null;
          item_type?: string;
          description?: string | null;
          wbs?: string | null;
          sort_order?: number;
          color?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          days?: number | null;
          percent_complete?: number;
          estimated_hours?: number;
          actual_hours?: number;
          is_estimated_hours_enabled?: boolean;
          is_critical?: boolean | null;
          slack?: number | null;
          is_milestone?: boolean;
          is_time_tracking_enabled?: boolean;
          is_starred?: boolean;
          task_status?: string;
          custom_fields?: unknown;
          is_active?: boolean;
          tg_id?: number | null;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          item_id: string;
          user_id: string;
          project_id: string;
          hours_per_day: number;
          total_hours: number;
          raci_role: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          item_id: string;
          user_id: string;
          project_id: string;
          hours_per_day?: number;
          total_hours?: number;
          raci_role?: string | null;
        };
        Update: {
          hours_per_day?: number;
          total_hours?: number;
          raci_role?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      task_dependencies: {
        Row: {
          id: string;
          tenant_id: string;
          project_id: string;
          predecessor_id: string;
          successor_id: string;
          dependency_type: string;
          lag_days: number;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          project_id: string;
          predecessor_id: string;
          successor_id: string;
          dependency_type?: string;
          lag_days?: number;
        };
        Update: {
          dependency_type?: string;
          lag_days?: number;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          target_type: string;
          target_id: string;
          project_id: string;
          message: string;
          is_pinned: boolean;
          pinned_at: string | null;
          mentioned_user_ids: string[];
          notified_user_ids: string[];
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          target_type: string;
          target_id: string;
          project_id: string;
          message: string;
          created_by?: string | null;
        };
        Update: {
          message?: string;
          is_pinned?: boolean;
          is_active?: boolean;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          target_type: string;
          target_id: string;
          project_id: string;
          comment_id: string | null;
          current_version_id: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          target_type: string;
          target_id: string;
          project_id: string;
          comment_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          current_version_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          document_id: string;
          version_number: number;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string;
          file_hash: string | null;
          description: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          document_id: string;
          file_name: string;
          storage_path: string;
          version_number?: number;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          description?: string | null;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          project_id: string;
          item_id: string;
          user_id: string;
          entry_type: string;
          start_time: string;
          end_time: string | null;
          duration_minutes: number | null;
          note: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          project_id: string;
          item_id: string;
          user_id: string;
          start_time: string;
          entry_type?: string;
          end_time?: string | null;
          duration_minutes?: number | null;
          note?: string | null;
        };
        Update: {
          end_time?: string | null;
          duration_minutes?: number | null;
          note?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      checklist_items: {
        Row: {
          id: string;
          tenant_id: string;
          tg_id: number | null;
          item_id: string;
          name: string;
          is_completed: boolean;
          sort_order: number;
          completed_by: string | null;
          completed_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          item_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          is_completed?: boolean;
          sort_order?: number;
          completed_by?: string | null;
          completed_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      user_project_stars: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          project_id: string;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          user_id: string;
          project_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          tenant_id: string;
          project_id: string | null;
          target_type: string;
          target_id: string;
          action: string;
          actor_id: string | null;
          details: unknown;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          target_type: string;
          target_id: string;
          action: string;
          project_id?: string | null;
          actor_id?: string | null;
          details?: unknown;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: 'active' | 'on_hold' | 'complete' | 'archived';
      member_permission: 'admin' | 'edit' | 'own_progress' | 'view';
      member_status: 'pending' | 'accepted' | 'declined';
      item_type: 'group' | 'task' | 'milestone';
      dependency_type: 'fs' | 'ss' | 'ff' | 'sf';
      comment_target: 'project' | 'item';
      time_entry_type: 'punched' | 'manual';
      view_type: 'gantt' | 'board' | 'list' | 'calendar';
    };
  };
}
