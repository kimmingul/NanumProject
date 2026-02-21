import { useCallback, useMemo } from 'react';
import {
  useViewConfigStore,
  viewConfigToGridState,
  mergeWithTenantConfig,
  DEFAULT_GRID_SETTINGS,
} from '@/lib/view-config-store';
import type { ViewKey, ViewConfig, ColumnConfig, DxGridState, GridSettings } from '@/types';

interface UseViewConfigOptions {
  viewKey: ViewKey;
  projectId?: string;
}

interface UseViewConfigResult {
  // Config data
  tenantConfig: ViewConfig;
  userState: DxGridState | null;
  effectiveColumns: ColumnConfig[];
  gridSettings: GridSettings;

  // stateStoring callbacks (for DataGrid/TreeList)
  customLoad: () => Promise<DxGridState>;
  customSave: (state: DxGridState) => void;

  // Actions
  resetToDefault: () => void;

  // Loading state
  loading: boolean;
}

export function useViewConfig(options: UseViewConfigOptions): UseViewConfigResult {
  const { viewKey, projectId } = options;

  // Generate state key: 'viewKey' or 'viewKey_projectId'
  const stateKey = useMemo(
    () => (projectId ? `${viewKey}_${projectId}` : viewKey),
    [viewKey, projectId],
  );

  // Store selectors
  const tenantConfig = useViewConfigStore((s) => s.getTenantConfig(viewKey));
  const userState = useViewConfigStore((s) => s.getUserState(stateKey));
  const saveUserState = useViewConfigStore((s) => s.saveUserState);
  const clearUserState = useViewConfigStore((s) => s.clearUserState);
  const tenantConfigsLoaded = useViewConfigStore((s) => s.tenantConfigsLoaded);
  const userStatesLoaded = useViewConfigStore((s) => s.userStatesLoaded);

  // Merge user state with tenant config
  const effectiveColumns = useMemo(
    () => mergeWithTenantConfig(tenantConfig, userState),
    [tenantConfig, userState],
  );

  // Get effective grid settings (tenant config or defaults)
  const gridSettings = useMemo(
    () => ({ ...DEFAULT_GRID_SETTINGS, ...tenantConfig.gridSettings }),
    [tenantConfig],
  );

  // DevExtreme stateStoring customLoad callback
  const customLoad = useCallback((): Promise<DxGridState> => {
    // If user has saved state, use it
    if (userState) {
      return Promise.resolve(userState);
    }
    // Otherwise, convert tenant config to grid state format
    return Promise.resolve(viewConfigToGridState(tenantConfig));
  }, [userState, tenantConfig]);

  // DevExtreme stateStoring customSave callback
  const customSave = useCallback(
    (state: DxGridState) => {
      saveUserState(stateKey, state);
    },
    [stateKey, saveUserState],
  );

  // Reset user state to tenant default
  const resetToDefault = useCallback(() => {
    clearUserState(stateKey);
  }, [stateKey, clearUserState]);

  return {
    tenantConfig,
    userState,
    effectiveColumns,
    gridSettings,
    customLoad,
    customSave,
    resetToDefault,
    loading: !tenantConfigsLoaded || !userStatesLoaded,
  };
}
