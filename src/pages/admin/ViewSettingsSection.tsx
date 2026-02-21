import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { NumberBox } from 'devextreme-react/number-box';
import { TextBox } from 'devextreme-react/text-box';
import { Switch } from 'devextreme-react/switch';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import { DataGrid, Column } from 'devextreme-react/data-grid';
import { useAuthStore } from '@/lib/auth-store';
import { useViewConfigStore, DEFAULT_CONFIGS, GRID_PRESETS } from '@/lib/view-config-store';
import type { ViewKey, ViewConfig, ColumnConfig, GridSettings, ColumnAlignment, SortOrder, FixedPosition, ColumnDisplayMode } from '@/types';
import './ViewSettingsSection.css';

interface ViewMeta {
  key: ViewKey;
  label: string;
  description: string;
  hasGrid: boolean;
  hasColumns: boolean;
}

const VIEWS: ViewMeta[] = [
  { key: 'projects_list', label: 'Projects', description: 'Project list page (DataGrid)', hasGrid: true, hasColumns: true },
  { key: 'tasks_view', label: 'Tasks View', description: 'Hierarchical task list (TreeList) in project detail', hasGrid: true, hasColumns: true },
  { key: 'my_tasks', label: 'My Tasks', description: 'Personal task list (DataGrid) across all projects', hasGrid: true, hasColumns: true },
  { key: 'gantt', label: 'Gantt View', description: 'Gantt chart left panel columns', hasGrid: false, hasColumns: true },
  { key: 'board', label: 'Board View', description: 'Kanban card field visibility', hasGrid: false, hasColumns: false },
];

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const SORT_ORDER_OPTIONS = [
  { value: undefined, label: 'None' },
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const ROW_HEIGHT_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'comfortable', label: 'Comfortable' },
];

const FIXED_POSITION_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const DISPLAY_MODE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'avatar', label: 'Avatar' },
];

// Columns that support displayMode
const DISPLAY_MODE_COLUMNS = ['manager_name', 'members', 'created_by_name', 'assignees', 'assignee_ids'];

// Sample data for preview
const PREVIEW_DATA = [
  {
    id: '1',
    year: 2024,
    name: 'Alpha Project',
    manager_name: 'John Doe',
    status: 'active',
    progress: 75,
    task_count: 12,
    start_date: '2024-01-15',
    end_date: '2024-06-30',
    updated_at: '2024-02-20',
    member_count: 5,
    members: 'John, Jane, Mike, Sarah, Tom',
    created_by_name: 'Admin User',
    created_at: '2024-01-10',
    is_template: false,
    description: 'Main product development project with multiple milestones',
    overdue_tasks: 2,
    days_remaining: 45,
  },
  {
    id: '2',
    year: 2024,
    name: 'Beta Initiative',
    manager_name: 'Jane Smith',
    status: 'on_hold',
    progress: 45,
    task_count: 8,
    start_date: '2024-02-01',
    end_date: '2024-08-15',
    updated_at: '2024-02-18',
    member_count: 3,
    members: 'Jane, Alex, Chris',
    created_by_name: 'Jane Smith',
    created_at: '2024-01-25',
    is_template: false,
    description: 'Research and development initiative',
    overdue_tasks: 0,
    days_remaining: 120,
  },
  {
    id: '3',
    year: 2023,
    name: 'Gamma Release',
    manager_name: 'Mike Johnson',
    status: 'active',
    progress: 90,
    task_count: 24,
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    updated_at: '2024-02-21',
    member_count: 8,
    members: 'Mike, Lisa, David, Emma, Ryan, Kate, Sam, Olivia',
    created_by_name: 'Mike Johnson',
    created_at: '2023-12-15',
    is_template: true,
    description: 'Q1 release template for quarterly deployments',
    overdue_tasks: 5,
    days_remaining: -3,
  },
];

export default function ViewSettingsSection(): ReactNode {
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const getTenantConfig = useViewConfigStore((s) => s.getTenantConfig);
  const updateTenantConfig = useViewConfigStore((s) => s.updateTenantConfig);
  const clearUserState = useViewConfigStore((s) => s.clearUserState);

  const [activeView, setActiveView] = useState<ViewKey>('projects_list');
  const [editConfig, setEditConfig] = useState<ViewConfig>({ columns: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const activeMeta = VIEWS.find((v) => v.key === activeView)!;
  const isBoard = activeView === 'board';

  // Load config when view changes
  useEffect(() => {
    const config = getTenantConfig(activeView);
    setEditConfig(JSON.parse(JSON.stringify(config))); // Deep copy
    setSaved(false);
    setExpandedColumn(null);
  }, [activeView, getTenantConfig]);

  // Column handlers
  const handleColumnChange = useCallback((dataField: string, field: keyof ColumnConfig, value: unknown) => {
    setEditConfig((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.dataField === dataField ? { ...c, [field]: value } : c
      ),
    }));
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setEditConfig((prev) => {
      const cols = [...prev.columns];
      [cols[index - 1], cols[index]] = [cols[index], cols[index - 1]];
      return {
        ...prev,
        columns: cols.map((c, i) => ({ ...c, visibleIndex: i })),
      };
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setEditConfig((prev) => {
      if (index >= prev.columns.length - 1) return prev;
      const cols = [...prev.columns];
      [cols[index], cols[index + 1]] = [cols[index + 1], cols[index]];
      return {
        ...prev,
        columns: cols.map((c, i) => ({ ...c, visibleIndex: i })),
      };
    });
  }, []);

  // Grid settings handlers
  const handleGridSettingChange = useCallback((field: keyof GridSettings, value: unknown) => {
    setEditConfig((prev) => ({
      ...prev,
      gridSettings: { ...prev.gridSettings, [field]: value },
    }));
  }, []);

  // Gantt/Board handlers
  const handleTaskListWidthChange = useCallback((width: number) => {
    setEditConfig((prev) => ({ ...prev, taskListWidth: width }));
  }, []);

  const handleCardFieldChange = useCallback((field: string, enabled: boolean) => {
    setEditConfig((prev) => ({
      ...prev,
      cardFields: { ...prev.cardFields, [field]: enabled },
    }));
  }, []);

  // Presets
  const applyPreset = useCallback((preset: 'compact' | 'standard' | 'detailed') => {
    setEditConfig((prev) => ({
      ...prev,
      gridSettings: { ...prev.gridSettings, ...GRID_PRESETS[preset] },
    }));
  }, []);

  // Reset & Save
  const handleResetToDefault = useCallback(() => {
    const defaultConfig = DEFAULT_CONFIGS[activeView];
    setEditConfig(JSON.parse(JSON.stringify(defaultConfig)));
  }, [activeView]);

  const handleSave = useCallback(async () => {
    if (!tenantId) return;
    setSaving(true);
    setSaved(false);
    try {
      const cleaned: ViewConfig = {
        ...editConfig,
        columns: (editConfig.columns || []).map((c, i) => ({ ...c, visibleIndex: i })),
      };
      await updateTenantConfig(tenantId, activeView, cleaned);
      // Clear admin's own user state so they immediately see the new tenant defaults
      clearUserState(activeView);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save view config:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  }, [tenantId, activeView, editConfig, updateTenantConfig, clearUserState]);

  const sortedColumns = useMemo(
    () =>
      (editConfig.columns || [])
        .map((c, originalIndex) => ({ ...c, originalIndex }))
        .sort((a, b) => a.visibleIndex - b.visibleIndex),
    [editConfig.columns]
  );

  const gridSettings = editConfig.gridSettings || {};

  return (
    <div className="view-settings-section">
      {/* Sidebar */}
      <div className="view-settings-sidebar">
        {VIEWS.map((view) => (
          <div
            key={view.key}
            className={`view-settings-sidebar-item ${activeView === view.key ? 'active' : ''}`}
            onClick={() => setActiveView(view.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveView(view.key)}
          >
            {view.label}
          </div>
        ))}
      </div>

      {/* Main Editor */}
      <div className="view-settings-main">
        <div className="view-settings-editor-header">
          <div>
            <h3>{activeMeta.label}</h3>
            <p className="view-settings-desc">{activeMeta.description}</p>
          </div>
          <div className="view-settings-header-actions">
            <Button
              icon="revert"
              text="Reset to Default"
              stylingMode="outlined"
              onClick={handleResetToDefault}
            />
            <Button
              text={saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              type={saved ? 'success' : 'default'}
              stylingMode="contained"
              icon={saved ? 'check' : ''}
              disabled={saving}
              onClick={handleSave}
            />
          </div>
        </div>

        {isBoard ? (
          // Board view: card field toggles
          <div className="view-settings-card-fields">
            <h4>Card Fields</h4>
            <p className="view-settings-hint">
              Choose which fields are displayed on Kanban cards.
            </p>
            <div className="card-field-list">
              {Object.entries(editConfig.cardFields || {}).map(([field, enabled]) => (
                <div key={field} className="card-field-row">
                  <Switch
                    value={enabled}
                    onValueChanged={(e) => handleCardFieldChange(field, e.value)}
                  />
                  <span className="card-field-name">{formatFieldName(field)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="view-settings-content">
            {/* Grid Settings (only for DataGrid/TreeList views) */}
            {activeMeta.hasGrid && (
              <div className="view-settings-grid-settings">
                <div className="settings-section-header">
                  <h4>Grid Settings</h4>
                  <div className="preset-buttons">
                    <Button text="Compact" stylingMode="text" onClick={() => applyPreset('compact')} />
                    <Button text="Standard" stylingMode="text" onClick={() => applyPreset('standard')} />
                    <Button text="Detailed" stylingMode="text" onClick={() => applyPreset('detailed')} />
                  </div>
                </div>
                <div className="grid-settings-grid">
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.showRowLines ?? true}
                      onValueChanged={(e) => handleGridSettingChange('showRowLines', e.value)}
                    />
                    <span>Row Lines</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.showColumnLines ?? false}
                      onValueChanged={(e) => handleGridSettingChange('showColumnLines', e.value)}
                    />
                    <span>Column Lines</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.rowAlternationEnabled ?? true}
                      onValueChanged={(e) => handleGridSettingChange('rowAlternationEnabled', e.value)}
                    />
                    <span>Alternating Rows</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.wordWrapEnabled ?? false}
                      onValueChanged={(e) => handleGridSettingChange('wordWrapEnabled', e.value)}
                    />
                    <span>Word Wrap</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.showFilterRow ?? true}
                      onValueChanged={(e) => handleGridSettingChange('showFilterRow', e.value)}
                    />
                    <span>Filter Row</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.showHeaderFilter ?? true}
                      onValueChanged={(e) => handleGridSettingChange('showHeaderFilter', e.value)}
                    />
                    <span>Header Filters</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.showGroupPanel ?? false}
                      onValueChanged={(e) => handleGridSettingChange('showGroupPanel', e.value)}
                    />
                    <span>Group Panel</span>
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.showSearchPanel ?? false}
                      onValueChanged={(e) => handleGridSettingChange('showSearchPanel', e.value)}
                    />
                    <span>Search Panel</span>
                  </div>
                  <div className="grid-setting-item row-height">
                    <span>Row Height</span>
                    <SelectBox
                      items={ROW_HEIGHT_OPTIONS}
                      displayExpr="label"
                      valueExpr="value"
                      value={gridSettings.rowHeight ?? 'normal'}
                      onValueChanged={(e) => handleGridSettingChange('rowHeight', e.value)}
                      stylingMode="outlined"
                      width={120}
                    />
                  </div>
                  <div className="grid-setting-item">
                    <Switch
                      value={gridSettings.uppercaseHeaders ?? true}
                      onValueChanged={(e) => handleGridSettingChange('uppercaseHeaders', e.value)}
                    />
                    <span>Uppercase Headers</span>
                  </div>
                </div>
              </div>
            )}

            {/* Gantt-specific: taskListWidth */}
            {activeView === 'gantt' && (
              <div className="view-settings-gantt-extra">
                <h4>Gantt Panel Width</h4>
                <div className="gantt-width-input">
                  <NumberBox
                    value={editConfig.taskListWidth || 600}
                    onValueChanged={(e) => handleTaskListWidthChange(e.value)}
                    min={300}
                    max={1000}
                    step={50}
                    stylingMode="outlined"
                    showSpinButtons={true}
                    width={150}
                  />
                  <span className="gantt-width-hint">px</span>
                </div>
              </div>
            )}

            {/* Column Configuration */}
            {activeMeta.hasColumns && (
              <div className="view-settings-columns">
                <h4>Column Configuration</h4>
                <div className="column-list">
                  <div className="column-list-header">
                    <span className="col-order">#</span>
                    <span className="col-visible">Show</span>
                    <span className="col-caption">Caption</span>
                    <span className="col-field">Field</span>
                    <span className="col-width">Width</span>
                    <span className="col-auto">Auto</span>
                    <span className="col-align">Header</span>
                    <span className="col-align">Cell</span>
                    <span className="col-actions">Order</span>
                    <span className="col-expand"></span>
                  </div>
                  {sortedColumns.map((col, displayIndex) => (
                    <div key={col.dataField} className="column-item-wrapper">
                      <div className="column-item">
                        <span className="col-order">{displayIndex + 1}</span>
                        <div className="col-visible">
                          <Switch
                            value={col.visible}
                            onValueChanged={(e) => handleColumnChange(col.dataField, 'visible', e.value)}
                            disabled={col.dataField === 'name' || col.dataField === 'title'}
                          />
                        </div>
                        <div className="col-caption">
                          <TextBox
                            value={col.caption}
                            onValueChanged={(e) => handleColumnChange(col.dataField, 'caption', e.value)}
                            stylingMode="outlined"
                          />
                        </div>
                        <span className="col-field">{col.dataField}</span>
                        <div className="col-width">
                          {col.autoWidth ? (
                            <span className="auto-width-label">Auto</span>
                          ) : (
                            <NumberBox
                              value={col.width ?? 100}
                              onValueChanged={(e) => handleColumnChange(col.dataField, 'width', e.value)}
                              min={50}
                              max={500}
                              step={10}
                              stylingMode="outlined"
                              showSpinButtons={true}
                            />
                          )}
                        </div>
                        <div className="col-auto">
                          <Switch
                            value={col.autoWidth ?? false}
                            onValueChanged={(e) => handleColumnChange(col.dataField, 'autoWidth', e.value)}
                            hint="Auto width (fill remaining space)"
                          />
                        </div>
                        <div className="col-align">
                          <SelectBox
                            items={ALIGNMENT_OPTIONS}
                            displayExpr="label"
                            valueExpr="value"
                            value={col.headerAlignment || 'center'}
                            onValueChanged={(e) => handleColumnChange(col.dataField, 'headerAlignment', e.value as ColumnAlignment)}
                            stylingMode="outlined"
                          />
                        </div>
                        <div className="col-align">
                          <SelectBox
                            items={ALIGNMENT_OPTIONS}
                            displayExpr="label"
                            valueExpr="value"
                            value={col.cellAlignment || 'left'}
                            onValueChanged={(e) => handleColumnChange(col.dataField, 'cellAlignment', e.value as ColumnAlignment)}
                            stylingMode="outlined"
                          />
                        </div>
                        <div className="col-actions">
                          <Button
                            icon="arrowup"
                            stylingMode="text"
                            hint="Move up"
                            disabled={displayIndex === 0}
                            onClick={() => handleMoveUp(col.originalIndex)}
                          />
                          <Button
                            icon="arrowdown"
                            stylingMode="text"
                            hint="Move down"
                            disabled={displayIndex === sortedColumns.length - 1}
                            onClick={() => handleMoveDown(col.originalIndex)}
                          />
                        </div>
                        <div className="col-expand">
                          <Button
                            icon={expandedColumn === col.dataField ? 'chevronup' : 'chevrondown'}
                            stylingMode="text"
                            hint="More options"
                            onClick={() =>
                              setExpandedColumn(
                                expandedColumn === col.dataField ? null : col.dataField
                              )
                            }
                          />
                        </div>
                      </div>
                      {/* Expanded options */}
                      {expandedColumn === col.dataField && (
                        <div className="column-expanded">
                          {/* Display Mode row (only for person columns) */}
                          {DISPLAY_MODE_COLUMNS.includes(col.dataField) && (
                            <div className="expanded-row">
                              <div className="expanded-item">
                                <span>Display Mode:</span>
                                <SelectBox
                                  items={DISPLAY_MODE_OPTIONS}
                                  displayExpr="label"
                                  valueExpr="value"
                                  value={col.displayMode || 'text'}
                                  onValueChanged={(e) => handleColumnChange(col.dataField, 'displayMode', e.value as ColumnDisplayMode)}
                                  stylingMode="outlined"
                                  width={100}
                                />
                              </div>
                            </div>
                          )}
                          <div className="expanded-row">
                            <div className="expanded-item">
                              <Switch
                                value={col.allowSorting ?? true}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'allowSorting', e.value)}
                              />
                              <span>Allow Sorting</span>
                            </div>
                            <div className="expanded-item">
                              <span>Default Sort:</span>
                              <SelectBox
                                items={SORT_ORDER_OPTIONS}
                                displayExpr="label"
                                valueExpr="value"
                                value={col.sortOrder}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'sortOrder', e.value as SortOrder)}
                                stylingMode="outlined"
                                width={110}
                              />
                            </div>
                            <div className="expanded-item">
                              <span>Sort Index:</span>
                              <NumberBox
                                value={col.sortIndex ?? 0}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'sortIndex', e.value)}
                                min={0}
                                max={10}
                                stylingMode="outlined"
                                showSpinButtons={true}
                                width={80}
                              />
                            </div>
                          </div>
                          <div className="expanded-row">
                            <div className="expanded-item">
                              <Switch
                                value={col.allowFiltering ?? true}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'allowFiltering', e.value)}
                              />
                              <span>Allow Filtering</span>
                            </div>
                            <div className="expanded-item">
                              <Switch
                                value={col.allowGrouping ?? false}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'allowGrouping', e.value)}
                              />
                              <span>Allow Grouping</span>
                            </div>
                            <div className="expanded-item">
                              <span>Group Index:</span>
                              <NumberBox
                                value={col.groupIndex ?? -1}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'groupIndex', e.value >= 0 ? e.value : undefined)}
                                min={-1}
                                max={10}
                                stylingMode="outlined"
                                showSpinButtons={true}
                                width={80}
                              />
                            </div>
                          </div>
                          <div className="expanded-row">
                            <div className="expanded-item">
                              <Switch
                                value={col.fixed ?? false}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'fixed', e.value)}
                              />
                              <span>Fixed Column</span>
                            </div>
                            <div className="expanded-item">
                              <span>Fixed Position:</span>
                              <SelectBox
                                items={FIXED_POSITION_OPTIONS}
                                displayExpr="label"
                                valueExpr="value"
                                value={col.fixedPosition || 'left'}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'fixedPosition', e.value as FixedPosition)}
                                stylingMode="outlined"
                                width={90}
                                disabled={!col.fixed}
                              />
                            </div>
                            <div className="expanded-item">
                              <span>Min Width:</span>
                              <NumberBox
                                value={col.minWidth ?? 50}
                                onValueChanged={(e) => handleColumnChange(col.dataField, 'minWidth', e.value)}
                                min={30}
                                max={300}
                                step={10}
                                stylingMode="outlined"
                                showSpinButtons={true}
                                width={80}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Preview (only for projects_list) */}
            {activeView === 'projects_list' && (
              <div className="view-settings-preview">
                <h4>Preview</h4>
                <div className="preview-container">
                  <DataGrid
                    dataSource={PREVIEW_DATA}
                    keyExpr="id"
                    height={200}
                    showBorders={true}
                    showRowLines={gridSettings.showRowLines ?? true}
                    showColumnLines={gridSettings.showColumnLines ?? false}
                    rowAlternationEnabled={gridSettings.rowAlternationEnabled ?? true}
                    wordWrapEnabled={gridSettings.wordWrapEnabled ?? false}
                    columnAutoWidth={gridSettings.columnAutoWidth ?? false}
                  >
                    {sortedColumns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <Column
                          key={col.dataField}
                          dataField={col.dataField}
                          caption={col.caption}
                          width={col.width}
                          alignment={col.cellAlignment}
                          visible={col.visible}
                        />
                      ))}
                  </DataGrid>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="view-settings-footer">
          <span className="view-settings-footer-hint">
            Changes apply to all users in this tenant. Users can override column visibility in their own settings.
          </span>
        </div>
      </div>
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
