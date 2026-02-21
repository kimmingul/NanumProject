import { create } from 'zustand';
import { supabase } from './supabase';
import { useAuthStore } from './auth-store';
import type { ViewKey, ViewConfig, ColumnConfig, DxGridState, GridSettings } from '@/types';

// Default grid settings
const DEFAULT_GRID_SETTINGS: GridSettings = {
  showColumnHeaders: true,
  showRowLines: true,
  showColumnLines: false,
  rowAlternationEnabled: true,
  columnAutoWidth: false,
  wordWrapEnabled: false,
  showGroupPanel: false,
  showFilterRow: true,
  showHeaderFilter: true,
  showSearchPanel: false,
  rowHeight: 'normal',
  uppercaseHeaders: true,
};

// Default column configurations (fallback when DB config hasn't loaded)
const DEFAULT_CONFIGS: Record<ViewKey, ViewConfig> = {
  projects_list: {
    columns: [
      { dataField: 'year', caption: 'Year', visible: true, width: 100, visibleIndex: 0, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, groupIndex: 0, fixed: false },
      { dataField: 'name', caption: 'Project Name', visible: true, autoWidth: true, minWidth: 200, visibleIndex: 1, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'manager_name', caption: 'Manager', visible: true, width: 120, visibleIndex: 2, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false, displayMode: 'avatar' },
      { dataField: 'members', caption: 'Member', visible: true, width: 140, visibleIndex: 3, headerAlignment: 'center', cellAlignment: 'center', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false, displayMode: 'avatar' },
      { dataField: 'member_count', caption: 'Member Count', visible: false, width: 100, visibleIndex: 4, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'status', caption: 'Status', visible: true, width: 120, visibleIndex: 5, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'progress', caption: 'Progress', visible: true, width: 120, visibleIndex: 6, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'task_count', caption: 'Tasks', visible: true, width: 80, visibleIndex: 7, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'start_date', caption: 'Start', visible: true, width: 100, visibleIndex: 8, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, sortOrder: 'desc', sortIndex: 0, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'end_date', caption: 'End', visible: true, width: 100, visibleIndex: 9, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'updated_at', caption: 'Updated', visible: true, width: 160, visibleIndex: 10, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'created_by_name', caption: 'Created By', visible: false, width: 120, visibleIndex: 11, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'created_at', caption: 'Created', visible: false, width: 130, visibleIndex: 12, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'is_template', caption: 'Template', visible: false, width: 80, visibleIndex: 13, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'description', caption: 'Description', visible: false, width: 250, minWidth: 200, visibleIndex: 14, headerAlignment: 'center', cellAlignment: 'left', allowSorting: false, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'overdue_tasks', caption: 'Overdue', visible: false, width: 80, visibleIndex: 15, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'days_remaining', caption: 'Days Left', visible: false, width: 90, visibleIndex: 16, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
    ],
    gridSettings: {
      ...DEFAULT_GRID_SETTINGS,
      showFilterRow: true,
      showHeaderFilter: true,
      rowAlternationEnabled: true,
    },
  },
  tasks_view: {
    columns: [
      { dataField: 'name', caption: 'Task Name', visible: true, autoWidth: true, minWidth: 200, visibleIndex: 0, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'item_type', caption: 'Type', visible: true, width: 100, visibleIndex: 1, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'start_date', caption: 'Start', visible: true, width: 110, visibleIndex: 2, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'end_date', caption: 'End', visible: true, width: 110, visibleIndex: 3, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'percent_complete', caption: 'Progress', visible: true, width: 100, visibleIndex: 4, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'task_status', caption: 'Status', visible: true, width: 120, visibleIndex: 5, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'assignee_ids', caption: 'Assignees', visible: true, width: 200, visibleIndex: 6, headerAlignment: 'center', cellAlignment: 'left', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'wbs', caption: 'WBS', visible: true, width: 70, visibleIndex: 7, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
    ],
    gridSettings: { ...DEFAULT_GRID_SETTINGS },
  },
  my_tasks: {
    columns: [
      { dataField: 'name', caption: 'Task Name', visible: true, autoWidth: true, minWidth: 200, visibleIndex: 0, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'project_name', caption: 'Project', visible: true, width: 180, visibleIndex: 1, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'task_status', caption: 'Status', visible: true, width: 120, visibleIndex: 2, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: true, allowGrouping: true, fixed: false },
      { dataField: 'percent_complete', caption: 'Progress', visible: true, width: 120, visibleIndex: 3, headerAlignment: 'center', cellAlignment: 'center', allowSorting: true, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'end_date', caption: 'Due Date', visible: true, width: 130, visibleIndex: 4, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
      { dataField: 'start_date', caption: 'Start Date', visible: false, width: 120, visibleIndex: 5, headerAlignment: 'center', cellAlignment: 'left', allowSorting: true, allowFiltering: true, allowGrouping: false, fixed: false },
    ],
    gridSettings: { ...DEFAULT_GRID_SETTINGS },
  },
  gantt: {
    columns: [
      { dataField: 'title', caption: 'Task Name', visible: true, autoWidth: true, minWidth: 150, visibleIndex: 0, headerAlignment: 'center', cellAlignment: 'left', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'start', caption: 'Start', visible: true, width: 90, visibleIndex: 1, headerAlignment: 'center', cellAlignment: 'left', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'end', caption: 'End', visible: true, width: 90, visibleIndex: 2, headerAlignment: 'center', cellAlignment: 'left', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'progress', caption: '%', visible: true, width: 50, visibleIndex: 3, headerAlignment: 'center', cellAlignment: 'center', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false },
      { dataField: 'assignees', caption: 'Assigned', visible: true, width: 90, visibleIndex: 4, headerAlignment: 'center', cellAlignment: 'left', allowSorting: false, allowFiltering: false, allowGrouping: false, fixed: false },
    ],
    taskListWidth: 600,
  },
  board: {
    columns: [],
    cardFields: {
      name: true,
      assignees: true,
      dueDate: true,
      progress: true,
    },
  },
};

// Grid presets
export const GRID_PRESETS = {
  compact: {
    showRowLines: false,
    showColumnLines: false,
    rowAlternationEnabled: false,
    rowHeight: 'compact' as const,
  },
  standard: {
    showRowLines: true,
    showColumnLines: false,
    rowAlternationEnabled: true,
    rowHeight: 'normal' as const,
  },
  detailed: {
    showRowLines: true,
    showColumnLines: true,
    rowAlternationEnabled: true,
    wordWrapEnabled: true,
    showGroupPanel: true,
    showSearchPanel: true,
    rowHeight: 'comfortable' as const,
  },
};

// Debounce timer for DB saves
let userStateSaveTimer: ReturnType<typeof setTimeout> | null = null;

interface ViewConfigStore {
  // Tenant-level defaults (admin-configurable)
  tenantConfigs: Record<ViewKey, ViewConfig>;
  tenantConfigsLoaded: boolean;
  tenantConfigsLoading: boolean;

  // User-level states (per-view overrides)
  userStates: Record<string, DxGridState>;
  userStatesLoaded: boolean;

  // Actions
  loadTenantConfigs: (tenantId: string) => Promise<void>;
  loadUserStates: () => void;
  updateTenantConfig: (tenantId: string, viewKey: ViewKey, config: ViewConfig) => Promise<void>;
  saveUserState: (stateKey: string, state: DxGridState) => void;
  clearUserState: (stateKey: string) => void;

  // Getters
  getTenantConfig: (viewKey: ViewKey) => ViewConfig;
  getUserState: (stateKey: string) => DxGridState | null;

  reset: () => void;
}

export const useViewConfigStore = create<ViewConfigStore>((set, get) => ({
  tenantConfigs: {} as Record<ViewKey, ViewConfig>,
  tenantConfigsLoaded: false,
  tenantConfigsLoading: false,

  userStates: {},
  userStatesLoaded: false,

  loadTenantConfigs: async (tenantId: string) => {
    if (get().tenantConfigsLoading) return;
    set({ tenantConfigsLoading: true });

    try {
      const { data, error } = await supabase
        .from('tenant_view_config')
        .select('view_key, config')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const configs = {} as Record<ViewKey, ViewConfig>;
      for (const row of data || []) {
        configs[row.view_key as ViewKey] = row.config as ViewConfig;
      }

      set({ tenantConfigs: configs, tenantConfigsLoaded: true });
    } catch (err) {
      console.error('Failed to load view configs:', err);
      set({ tenantConfigsLoaded: true });
    } finally {
      set({ tenantConfigsLoading: false });
    }
  },

  loadUserStates: () => {
    // Load from profiles.preferences.viewStates
    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    supabase
      .from('profiles')
      .select('preferences')
      .eq('id', profile.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data?.preferences) {
          set({ userStatesLoaded: true });
          return;
        }

        const prefs = data.preferences as { viewStates?: Record<string, DxGridState> };
        set({
          userStates: prefs.viewStates || {},
          userStatesLoaded: true,
        });
      });
  },

  updateTenantConfig: async (tenantId: string, viewKey: ViewKey, config: ViewConfig) => {
    const { error } = await supabase
      .from('tenant_view_config')
      .upsert(
        { tenant_id: tenantId, view_key: viewKey, config: config as unknown },
        { onConflict: 'tenant_id,view_key' },
      );

    if (error) throw error;

    set((state) => ({
      tenantConfigs: { ...state.tenantConfigs, [viewKey]: config },
    }));
  },

  saveUserState: (stateKey: string, state: DxGridState) => {
    // Update Zustand immediately
    set((s) => ({
      userStates: { ...s.userStates, [stateKey]: state },
    }));

    // Debounced DB save (2 seconds)
    if (userStateSaveTimer) clearTimeout(userStateSaveTimer);
    userStateSaveTimer = setTimeout(() => {
      const profile = useAuthStore.getState().profile;
      if (!profile) return;

      supabase
        .from('profiles')
        .select('preferences')
        .eq('id', profile.id)
        .single()
        .then(({ data }) => {
          const currentPrefs = (data?.preferences || {}) as Record<string, unknown>;
          const viewStates = (currentPrefs.viewStates || {}) as Record<string, DxGridState>;
          viewStates[stateKey] = get().userStates[stateKey];

          return supabase
            .from('profiles')
            .update({ preferences: { ...currentPrefs, viewStates } })
            .eq('id', profile.id);
        })
        .then(({ error }) => {
          if (error) console.error('Failed to save user view state:', error.message);
        });
    }, 2000);
  },

  clearUserState: (stateKey: string) => {
    set((s) => {
      const newStates = { ...s.userStates };
      delete newStates[stateKey];
      return { userStates: newStates };
    });

    // Also remove from DB
    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    supabase
      .from('profiles')
      .select('preferences')
      .eq('id', profile.id)
      .single()
      .then(({ data }) => {
        const currentPrefs = (data?.preferences || {}) as Record<string, unknown>;
        const viewStates = (currentPrefs.viewStates || {}) as Record<string, DxGridState>;
        delete viewStates[stateKey];

        return supabase
          .from('profiles')
          .update({ preferences: { ...currentPrefs, viewStates } })
          .eq('id', profile.id);
      });
  },

  getTenantConfig: (viewKey: ViewKey): ViewConfig => {
    const { tenantConfigs } = get();
    const saved = tenantConfigs[viewKey];
    const defaults = DEFAULT_CONFIGS[viewKey];

    if (!saved) return defaults;

    // Merge saved config with defaults to pick up new properties (e.g., displayMode)
    const mergedColumns = defaults.columns.map((defaultCol) => {
      const savedCol = saved.columns.find((c) => c.dataField === defaultCol.dataField);
      if (!savedCol) return defaultCol;
      // Saved config wins, but fill in missing properties from defaults
      return { ...defaultCol, ...savedCol };
    });

    return {
      ...defaults,
      ...saved,
      columns: mergedColumns,
    };
  },

  getUserState: (stateKey: string): DxGridState | null => {
    return get().userStates[stateKey] || null;
  },

  reset: () =>
    set({
      tenantConfigs: {} as Record<ViewKey, ViewConfig>,
      tenantConfigsLoaded: false,
      tenantConfigsLoading: false,
      userStates: {},
      userStatesLoaded: false,
    }),
}));

// Helper to convert ViewConfig columns to DxGridState format
export function viewConfigToGridState(config: ViewConfig): DxGridState {
  return {
    columns: config.columns
      .sort((a, b) => a.visibleIndex - b.visibleIndex)
      .map((col) => {
        const result: NonNullable<DxGridState['columns']>[number] = {
          dataField: col.dataField,
          visible: col.visible,
          visibleIndex: col.visibleIndex,
        };
        if (col.width !== undefined) result.width = col.width;
        if (col.sortOrder !== undefined) result.sortOrder = col.sortOrder;
        if (col.sortIndex !== undefined) result.sortIndex = col.sortIndex;
        if (col.groupIndex !== undefined) result.groupIndex = col.groupIndex;
        if (col.fixed !== undefined) result.fixed = col.fixed;
        if (col.fixedPosition !== undefined) result.fixedPosition = col.fixedPosition;
        return result;
      }),
  };
}

// Helper to merge user state with tenant config (user state wins)
export function mergeWithTenantConfig(
  tenantConfig: ViewConfig,
  userState: DxGridState | null,
): ColumnConfig[] {
  if (!userState?.columns) {
    return tenantConfig.columns.sort((a, b) => a.visibleIndex - b.visibleIndex);
  }

  // Create a map from user state
  const userColMap = new Map<string, (typeof userState.columns)[0]>();
  for (const col of userState.columns) {
    if (col.dataField) {
      userColMap.set(col.dataField, col);
    }
  }

  // Merge: user state overrides tenant config for runtime properties
  return tenantConfig.columns
    .map((tcol): ColumnConfig => {
      const ucol = userColMap.get(tcol.dataField);
      if (!ucol) return tcol;

      // Build merged column, conditionally including optional properties
      const merged: ColumnConfig = {
        dataField: tcol.dataField,
        caption: tcol.caption,
        visible: ucol.visible ?? tcol.visible,
        visibleIndex: ucol.visibleIndex ?? tcol.visibleIndex,
      };

      // Copy optional properties from tenant config first
      if (tcol.width !== undefined) merged.width = tcol.width;
      if (tcol.minWidth !== undefined) merged.minWidth = tcol.minWidth;
      if (tcol.autoWidth !== undefined) merged.autoWidth = tcol.autoWidth;
      if (tcol.headerAlignment !== undefined) merged.headerAlignment = tcol.headerAlignment;
      if (tcol.cellAlignment !== undefined) merged.cellAlignment = tcol.cellAlignment;
      if (tcol.displayMode !== undefined) merged.displayMode = tcol.displayMode;
      if (tcol.allowSorting !== undefined) merged.allowSorting = tcol.allowSorting;
      if (tcol.sortOrder !== undefined) merged.sortOrder = tcol.sortOrder;
      if (tcol.sortIndex !== undefined) merged.sortIndex = tcol.sortIndex;
      if (tcol.allowFiltering !== undefined) merged.allowFiltering = tcol.allowFiltering;
      if (tcol.filterValue !== undefined) merged.filterValue = tcol.filterValue;
      if (tcol.allowGrouping !== undefined) merged.allowGrouping = tcol.allowGrouping;
      if (tcol.groupIndex !== undefined) merged.groupIndex = tcol.groupIndex;
      if (tcol.fixed !== undefined) merged.fixed = tcol.fixed;
      if (tcol.fixedPosition !== undefined) merged.fixedPosition = tcol.fixedPosition;

      // Override with user state values if present
      if (ucol.width !== undefined) merged.width = ucol.width;
      if (ucol.sortOrder !== undefined) merged.sortOrder = ucol.sortOrder;
      if (ucol.sortIndex !== undefined) merged.sortIndex = ucol.sortIndex;
      if (ucol.groupIndex !== undefined) merged.groupIndex = ucol.groupIndex;
      if (ucol.fixed !== undefined) merged.fixed = ucol.fixed;
      if (ucol.fixedPosition !== undefined) merged.fixedPosition = ucol.fixedPosition;

      return merged;
    })
    .sort((a, b) => a.visibleIndex - b.visibleIndex);
}

export { DEFAULT_CONFIGS, DEFAULT_GRID_SETTINGS };
