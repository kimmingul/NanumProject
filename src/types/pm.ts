// =============================================
// NanumProject PM Module - TypeScript Types
// Matches DB schema: 006_pm_enums.sql + 007_pm_schema.sql
// =============================================

// ========================================
// Enum types
// ========================================
export type ProjectStatus = string;
export type MemberPermission = 'admin' | 'edit' | 'own_progress' | 'view';
export type MemberStatus = 'pending' | 'accepted' | 'declined';
export type ItemType = 'group' | 'task' | 'milestone';
export type DependencyType = 'fs' | 'ss' | 'ff' | 'sf';
export type CommentTarget = 'project' | 'item';
export type TimeEntryType = 'punched' | 'manual';
export type TaskStatus = string;
export type ViewType = 'gantt' | 'board' | 'list' | 'calendar';
export type LinkType = 'blocks' | 'related_to' | 'duplicates';
export type NotificationType = 'assignment' | 'comment_mention' | 'status_change' | 'due_date';

// ========================================
// Enum config types (tenant-level customization)
// ========================================
export type EnumCategory =
  | 'task_status'
  | 'project_status'
  | 'user_role'
  | 'member_permission'
  | 'department'
  | 'link_type'
  | 'item_type';

export interface EnumOption {
  value: string;
  label: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
}

// ========================================
// Core entity interfaces
// ========================================

export interface Project {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  default_view: ViewType | null;
  start_date: string | null;
  end_date: string | null;
  work_days: number[];
  is_template: boolean;
  is_starred: boolean;
  has_hours_enabled: boolean;
  lock_milestone_dates: boolean;
  allow_scheduling_on_holidays: boolean;
  in_resource_management: boolean;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  project_id: string;
  user_id: string;
  permission: MemberPermission;
  status: MemberStatus;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Unified project_items table (groups/tasks/milestones with parent_id tree) */
export interface ProjectItem {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  project_id: string;
  parent_id: string | null;
  item_type: ItemType;
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
  task_status: TaskStatus;
  custom_fields: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  item_id: string;
  user_id: string;
  project_id: string;
  hours_per_day: number;
  total_hours: number;
  raci_role: 'R' | 'A' | 'C' | 'I' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  tenant_id: string;
  project_id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
}

export interface PMComment {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  target_type: CommentTarget;
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
}

export interface PMDocument {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  target_type: CommentTarget;
  target_id: string;
  project_id: string;
  comment_id: string | null;
  current_version_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
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
}

export interface TimeEntry {
  id: string;
  tenant_id: string;
  tg_id: number | null;
  project_id: string;
  item_id: string;
  user_id: string;
  entry_type: TimeEntryType;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
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
}

export interface PMActivityLog {
  id: string;
  tenant_id: string;
  project_id: string | null;
  target_type: string;
  target_id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ItemLink {
  id: string;
  tenant_id: string;
  project_id: string;
  source_id: string;
  target_id: string;
  link_type: LinkType;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ItemLinkWithNames extends ItemLink {
  source_name: string;
  target_name: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  target_type: string | null;
  target_id: string | null;
  project_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ========================================
// Composite/view types for UI
// ========================================

/** Project with aggregated stats for the list view */
export interface ProjectListItem extends Project {
  member_count?: number;
  item_count?: number;
  completed_item_count?: number;
}

/** ProjectMember joined with profile info for display */
export interface ProjectMemberWithProfile extends ProjectMember {
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | undefined;
}

// ========================================
// View configuration types (tenant-level + user-level)
// ========================================

export type ViewKey = 'tasks_view' | 'my_tasks' | 'gantt' | 'board' | 'projects_list';

export type ColumnAlignment = 'left' | 'center' | 'right';
export type SortOrder = 'asc' | 'desc' | undefined;
export type FixedPosition = 'left' | 'right';

export type ColumnDisplayMode = 'text' | 'avatar';

export interface ColumnConfig {
  dataField: string;
  caption: string;
  visible: boolean;
  visibleIndex: number;
  width?: number;
  minWidth?: number;
  autoWidth?: boolean;  // true = fill remaining space (no fixed width)
  headerAlignment?: ColumnAlignment;  // column header text alignment
  cellAlignment?: ColumnAlignment;    // cell value alignment
  displayMode?: ColumnDisplayMode;    // 'text' or 'avatar' for person columns

  // Sorting
  allowSorting?: boolean;
  sortOrder?: SortOrder;
  sortIndex?: number;

  // Filtering
  allowFiltering?: boolean;
  filterValue?: unknown;

  // Grouping
  allowGrouping?: boolean;
  groupIndex?: number;

  // Fixed column
  fixed?: boolean;
  fixedPosition?: FixedPosition;
}

export interface GridSettings {
  showColumnHeaders?: boolean;
  showRowLines?: boolean;
  showColumnLines?: boolean;
  rowAlternationEnabled?: boolean;
  columnAutoWidth?: boolean;
  wordWrapEnabled?: boolean;
  showGroupPanel?: boolean;
  showFilterRow?: boolean;
  showHeaderFilter?: boolean;
  showSearchPanel?: boolean;
  rowHeight?: 'compact' | 'normal' | 'comfortable';
  uppercaseHeaders?: boolean;
}

export interface ViewConfig {
  columns: ColumnConfig[];
  gridSettings?: GridSettings;
  taskListWidth?: number;  // Gantt only
  cardFields?: Record<string, boolean>;  // Board only
}

/** DevExtreme grid state object (simplified) */
export interface DxGridState {
  columns?: Array<{
    dataField?: string;
    visible?: boolean;
    visibleIndex?: number;
    width?: number;
    sortOrder?: 'asc' | 'desc';
    sortIndex?: number;
    filterValue?: unknown;
    filterValues?: unknown[];
    filterType?: string;
    groupIndex?: number;
    fixed?: boolean;
    fixedPosition?: 'left' | 'right';
  }>;
  filterValue?: unknown;
  searchText?: string;
  pageIndex?: number;
  pageSize?: number;
  expandedRowKeys?: string[];
  selectedRowKeys?: string[];
}
