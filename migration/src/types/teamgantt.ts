// ========================================
// TeamGantt API Entity Type Definitions
// ========================================

export interface TGCurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  company_id: string;
  time_zone: string;
  [key: string]: unknown;
}

export interface TGUser {
  id: string;
  email_address: string;
  first_name: string;
  last_name: string;
  permissions?: string[];
  status?: string;
  is_disabled?: boolean;
  pic?: string | null;
  time_zone?: string;
  [key: string]: unknown;
}

export interface TGProject {
  id: string;
  name: string;
  status?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
  start_date?: string;
  end_date?: string;
  color?: string;
  [key: string]: unknown;
}

export interface TGGroup {
  id: string;
  name: string;
  project_id?: string;
  parent_id?: string | null;
  sort_order?: number;
  [key: string]: unknown;
}

export interface TGTask {
  id: string;
  name: string;
  project_id?: string;
  group_id?: string;
  start_date?: string;
  end_date?: string;
  percent_complete?: number;
  estimated_hours?: number;
  type?: string;
  status?: string;
  sort_order?: number;
  [key: string]: unknown;
}

export interface TGComment {
  id: string;
  message?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  pinned?: boolean;
  user_id?: string;
  user_name?: string;
  attached_documents?: TGDocument[];
  [key: string]: unknown;
}

export interface TGTimeBlock {
  id: string;
  task_id?: string;
  user_id?: string;
  date?: string;
  hours?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface TGBoard {
  id: string;
  name: string;
  company_id?: string;
  status?: string;
  user_id?: string;
  created_at?: string;
  is_starred?: boolean;
  [key: string]: unknown;
}

export interface TGColumn {
  id: string;
  name: string;
  board_id?: string;
  sort_order?: number;
  [key: string]: unknown;
}

export interface TGCard {
  id: string;
  name?: string;
  column_id?: string;
  sort_order?: number;
  [key: string]: unknown;
}

export interface TGDocument {
  id: string;
  name?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  url?: string;
  uploaded_by?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface TGAccess {
  user_id: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface TGChecklist {
  id: string;
  name?: string;
  is_complete?: boolean;
  sort_order?: number;
  [key: string]: unknown;
}

// Generic paginated response wrapper
export interface TGPaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    [key: string]: unknown;
  };
}

// Generic single resource response
export interface TGSingleResponse<T> {
  data: T;
}

// Project children (hierarchy)
export interface TGProjectChild {
  id: string;
  type: 'group' | 'task';
  name: string;
  children?: TGProjectChild[];
  [key: string]: unknown;
}
