import { create } from 'zustand';
import { supabase } from './supabase';
import type { EnumOption } from '@/types';

// Default options used as fallback when DB config hasn't loaded yet
const DEFAULT_OPTIONS: Record<string, EnumOption[]> = {
  task_status: [
    { value: 'todo', label: 'To Do', color: '#94a3b8', icon: null, sort_order: 0, is_system: true },
    { value: 'in_progress', label: 'In Progress', color: '#3b82f6', icon: null, sort_order: 1, is_system: true },
    { value: 'review', label: 'Review', color: '#f59e0b', icon: null, sort_order: 2, is_system: true },
    { value: 'done', label: 'Done', color: '#22c55e', icon: null, sort_order: 3, is_system: true },
  ],
  project_status: [
    { value: 'active', label: 'Active', color: '#22c55e', icon: null, sort_order: 0, is_system: true },
    { value: 'on_hold', label: 'On Hold', color: '#f59e0b', icon: null, sort_order: 1, is_system: true },
    { value: 'complete', label: 'Complete', color: '#3b82f6', icon: null, sort_order: 2, is_system: true },
    { value: 'archived', label: 'Archived', color: '#94a3b8', icon: null, sort_order: 3, is_system: true },
  ],
  user_role: [
    { value: 'admin', label: 'Admin', color: '#ef4444', icon: null, sort_order: 0, is_system: true },
    { value: 'manager', label: 'Manager', color: '#8b5cf6', icon: null, sort_order: 1, is_system: true },
    { value: 'member', label: 'Member', color: '#3b82f6', icon: null, sort_order: 2, is_system: true },
    { value: 'viewer', label: 'Viewer', color: '#94a3b8', icon: null, sort_order: 3, is_system: true },
  ],
  member_permission: [
    { value: 'admin', label: 'Admin', color: '#ef4444', icon: null, sort_order: 0, is_system: true },
    { value: 'edit', label: 'Editor', color: '#3b82f6', icon: null, sort_order: 1, is_system: true },
    { value: 'own_progress', label: 'Own Progress', color: '#f59e0b', icon: null, sort_order: 2, is_system: true },
    { value: 'view', label: 'Viewer', color: '#94a3b8', icon: null, sort_order: 3, is_system: true },
  ],
  department: [
    { value: 'clinical_ops', label: 'Clinical Operations', color: null, icon: null, sort_order: 0, is_system: false },
    { value: 'data_mgmt', label: 'Data Management', color: null, icon: null, sort_order: 1, is_system: false },
    { value: 'biostatistics', label: 'Biostatistics', color: null, icon: null, sort_order: 2, is_system: false },
    { value: 'regulatory', label: 'Regulatory Affairs', color: null, icon: null, sort_order: 3, is_system: false },
    { value: 'medical_writing', label: 'Medical Writing', color: null, icon: null, sort_order: 4, is_system: false },
    { value: 'qa', label: 'Quality Assurance', color: null, icon: null, sort_order: 5, is_system: false },
    { value: 'pharmacovigilance', label: 'Pharmacovigilance', color: null, icon: null, sort_order: 6, is_system: false },
    { value: 'project_mgmt', label: 'Project Management', color: null, icon: null, sort_order: 7, is_system: false },
  ],
  item_type: [
    { value: 'group', label: 'Group', color: '#64748b', icon: 'folder', sort_order: 0, is_system: true },
    { value: 'task', label: 'Task', color: '#3b82f6', icon: 'detailslayout', sort_order: 1, is_system: true },
    { value: 'milestone', label: 'Milestone', color: '#f59e0b', icon: 'event', sort_order: 2, is_system: true },
  ],
  link_type: [
    { value: 'blocks', label: 'Blocks', color: null, icon: null, sort_order: 0, is_system: true },
    { value: 'related_to', label: 'Related To', color: null, icon: null, sort_order: 1, is_system: true },
    { value: 'duplicates', label: 'Duplicates', color: null, icon: null, sort_order: 2, is_system: true },
  ],
};

interface EnumConfigStore {
  configs: Record<string, EnumOption[]>;
  loaded: boolean;
  loading: boolean;
  loadConfigs: (tenantId: string) => Promise<void>;
  getOptions: (category: string) => EnumOption[];
  updateOptions: (tenantId: string, category: string, options: EnumOption[]) => Promise<void>;
  reset: () => void;
}

export const useEnumConfigStore = create<EnumConfigStore>((set, get) => ({
  configs: {},
  loaded: false,
  loading: false,

  loadConfigs: async (tenantId: string) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('tenant_enum_config')
        .select('category, options')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const configs: Record<string, EnumOption[]> = {};
      for (const row of data || []) {
        configs[row.category] = (row.options as EnumOption[]).sort(
          (a, b) => a.sort_order - b.sort_order,
        );
      }
      set({ configs, loaded: true });
    } catch (err) {
      console.error('Failed to load enum configs:', err);
      // Fall back to defaults
      set({ configs: {}, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  getOptions: (category: string): EnumOption[] => {
    const { configs } = get();
    return configs[category] || DEFAULT_OPTIONS[category] || [];
  },

  updateOptions: async (tenantId: string, category: string, options: EnumOption[]) => {
    const { error } = await supabase
      .from('tenant_enum_config')
      .upsert(
        { tenant_id: tenantId, category, options: options as unknown },
        { onConflict: 'tenant_id,category' },
      );

    if (error) throw error;

    set((state) => ({
      configs: { ...state.configs, [category]: options },
    }));
  },

  reset: () => set({ configs: {}, loaded: false, loading: false }),
}));
