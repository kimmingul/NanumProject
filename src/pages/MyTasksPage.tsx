import { type ReactNode, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  Column,
  FilterRow,
  HeaderFilter,
  Paging,
  Pager,
  Sorting,
  StateStoring,
  SearchPanel,
  GroupPanel,
  Grouping,
} from 'devextreme-react/data-grid';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import { useMyTasks, type MyTaskItem } from '@/hooks/useMyTasks';
import { useProjects } from '@/hooks';
import { useViewConfig } from '@/hooks/useViewConfig';
import { useEnumOptions } from '@/hooks/useEnumOptions';
import { usePMStore } from '@/lib/pm-store';
import { usePreferencesStore } from '@/lib/preferences-store';
import { getDxDateFormat } from '@/utils/formatDate';
import type { ColumnConfig } from '@/types';
import './MyTasksPage.css';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDueDate(endDate: string | null): { text: string; className: string } {
  if (!endDate) return { text: 'No date', className: 'due-none' };
  const todayStr = today();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (endDate < todayStr) {
    const diff = Math.ceil(
      (new Date(todayStr).getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return { text: `${diff}d overdue`, className: 'due-overdue' };
  }
  if (endDate === todayStr) return { text: 'Today', className: 'due-today' };
  if (endDate === tomorrowStr) return { text: 'Tomorrow', className: 'due-soon' };

  const d = new Date(endDate + 'T00:00:00');
  return {
    text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'due-normal',
  };
}

// Helper to build column props from ColumnConfig
function getColumnProps(col: ColumnConfig) {
  const props: Record<string, unknown> = {
    dataField: col.dataField,
    caption: col.caption,
    visible: col.visible,
    visibleIndex: col.visibleIndex,
  };
  if (!col.autoWidth && col.width !== undefined) props.width = col.width;
  if (col.minWidth !== undefined) props.minWidth = col.minWidth;
  if (col.cellAlignment !== undefined) props.alignment = col.cellAlignment;
  if (col.headerAlignment !== undefined) {
    props.headerCssClass = `header-align-${col.headerAlignment}`;
  }
  if (col.allowSorting !== undefined) props.allowSorting = col.allowSorting;
  if (col.allowFiltering !== undefined) props.allowFiltering = col.allowFiltering;
  if (col.allowGrouping !== undefined) props.allowGrouping = col.allowGrouping;
  if (col.fixed !== undefined) props.fixed = col.fixed;
  if (col.fixedPosition !== undefined) props.fixedPosition = col.fixedPosition;
  if (col.sortOrder !== undefined) props.sortOrder = col.sortOrder;
  if (col.sortIndex !== undefined) props.sortIndex = col.sortIndex;
  if (col.groupIndex !== undefined) props.groupIndex = col.groupIndex;
  return props;
}

const statusFilterOptions = [
  { value: 'all_active', label: 'All Active' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Completed' },
  { value: 'all', label: 'All (incl. Completed)' },
];

export default function MyTasksPage(): ReactNode {
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all_active');

  const { projects } = useProjects({ status: 'all', autoFetch: true });
  const { labels: statusLabels } = useEnumOptions('task_status');
  const dateFormat = usePreferencesStore((s) => s.preferences.dateFormat);
  const dxDateFmt = useMemo(() => getDxDateFormat(), [dateFormat]);
  const { effectiveColumns, gridSettings, customLoad, customSave, resetToDefault } = useViewConfig({ viewKey: 'my_tasks' });
  const [gridKey, setGridKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const lastCountRef = useRef<number | null>(null);
  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);
  const setRightPanelOpen = usePMStore((s) => s.setRightPanelOpen);

  // Determine filter params
  const filterParams = useMemo(() => {
    const base: { projectId?: string } = projectFilter ? { projectId: projectFilter } : {};
    if (statusFilter === 'all_active') {
      return { ...base, includeCompleted: false };
    }
    if (statusFilter === 'all') {
      return { ...base, includeCompleted: true };
    }
    return { ...base, status: statusFilter };
  }, [projectFilter, statusFilter]);

  const { tasks, totalCount, loading, error, refetch } = useMyTasks(filterParams);

  const projectFilterOptions = useMemo(() => [
    { id: '', name: 'All Projects' },
    ...projects.map((p) => ({ id: p.id, name: p.name })),
  ], [projects]);

  const handleRowClick = useCallback((e: { data?: MyTaskItem }) => {
    if (e.data) {
      setSelectedTaskId(e.data.id);
      setRightPanelOpen(true);
    }
  }, [setSelectedTaskId, setRightPanelOpen]);

  const handleGoToProject = useCallback((task: MyTaskItem) => {
    navigate(`/tasks/${task.project_id}`);
  }, [navigate]);

  return (
    <div className="my-tasks-page">
      <div className="my-tasks-header">
        <span className="my-tasks-header-title">MY TASKS</span>
        <span className="my-tasks-header-count">{loading ? '...' : (visibleCount ?? totalCount)}</span>
        <div className="my-tasks-header-spacer" />
        <SelectBox
          items={statusFilterOptions}
          displayExpr="label"
          valueExpr="value"
          value={statusFilter}
          onValueChanged={(e) => setStatusFilter(e.value)}
          width={140}
          stylingMode="outlined"
          className="my-tasks-header-select"
        />
        <SelectBox
          items={projectFilterOptions}
          displayExpr="name"
          valueExpr="id"
          value={projectFilter}
          onValueChanged={(e) => setProjectFilter(e.value)}
          width={160}
          stylingMode="outlined"
          placeholder="All Projects"
          className="my-tasks-header-select"
        />
        <Button
          icon="refresh"
          stylingMode="text"
          hint="Refresh"
          className="my-tasks-header-btn"
          onClick={refetch}
        />
        <Button
          icon="columnchooser"
          stylingMode="text"
          hint="Reset columns to default"
          className="my-tasks-header-btn"
          onClick={() => {
            resetToDefault();
            setGridKey((k) => k + 1);
          }}
        />
      </div>

      {error && (
        <div className="error-banner">
          <i className="dx-icon-warning" />
          <span>{error}</span>
        </div>
      )}

      <div className={`my-tasks-grid-container${gridSettings.uppercaseHeaders ? ' uppercase-headers' : ''}`}>
        <DataGrid
          key={gridKey}
          dataSource={tasks}
          keyExpr="id"
          width="100%"
          height="100%"
          showBorders={false}
          showRowLines={gridSettings.showRowLines ?? true}
          showColumnLines={gridSettings.showColumnLines ?? false}
          rowAlternationEnabled={gridSettings.rowAlternationEnabled ?? true}
          wordWrapEnabled={gridSettings.wordWrapEnabled ?? false}
          hoverStateEnabled={true}
          columnAutoWidth={gridSettings.columnAutoWidth ?? false}
          onRowClick={handleRowClick}
          onOptionChanged={(e) => {
            if (e.name === 'filterValue' || e.fullName?.includes('filterValue') || e.name === 'dataSource') {
              setTimeout(() => {
                const total = e.component.totalCount();
                const count = total >= 0 ? total : e.component.getVisibleRows().length;
                if (lastCountRef.current !== count) {
                  lastCountRef.current = count;
                  setVisibleCount(count);
                }
              }, 50);
            }
          }}
          noDataText={loading ? 'Loading tasks...' : 'No tasks found. Tasks assigned to you will appear here.'}
        >
            <StateStoring
              enabled={true}
              type="custom"
              customLoad={customLoad}
              customSave={customSave}
              savingTimeout={2000}
            />
            <Sorting mode="multiple" />
            <FilterRow visible={gridSettings.showFilterRow ?? true} />
            <HeaderFilter visible={gridSettings.showHeaderFilter ?? true} />
            <SearchPanel visible={gridSettings.showSearchPanel ?? false} />
            <GroupPanel visible={gridSettings.showGroupPanel ?? false} />
            <Grouping autoExpandAll={true} />
            <Pager
              visible={true}
              showPageSizeSelector={true}
              allowedPageSizes={[10, 25, 50, 100]}
              showInfo={true}
            />
            <Paging defaultPageSize={25} />

            {effectiveColumns.map((col) => {
              const colProps = getColumnProps(col);

              if (col.dataField === 'name') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    minWidth={col.minWidth || 200}
                    cellRender={(data: { value: string }) => (
                      <div className="task-name-cell">
                        <span className="task-name">{data.value}</span>
                      </div>
                    )}
                  />
                );
              }

              if (col.dataField === 'project_name') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { value: string; data: MyTaskItem }) => (
                      <span
                        className="project-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoToProject(data.data);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {data.value}
                      </span>
                    )}
                  />
                );
              }

              if (col.dataField === 'task_status') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { value: string }) => (
                      <span className={`task-status-badge status-${data.value}`}>
                        {statusLabels[data.value] || data.value}
                      </span>
                    )}
                  />
                );
              }

              if (col.dataField === 'percent_complete') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
                    cellRender={(data: { value: number }) => (
                      <div className="progress-cell">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${data.value}%` }} />
                        </div>
                        <span className="progress-text">{data.value}%</span>
                      </div>
                    )}
                  />
                );
              }

              if (col.dataField === 'end_date') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="date"
                    format={dxDateFmt}
                    cellRender={(data: { data: MyTaskItem }) => {
                      const due = formatDueDate(data.data.end_date);
                      return <span className={`due-badge ${due.className}`}>{due.text}</span>;
                    }}
                  />
                );
              }

              if (col.dataField === 'start_date') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="date"
                    format={dxDateFmt}
                  />
                );
              }

              // Generic column for any other fields
              return <Column key={col.dataField} {...colProps} />;
            })}
          </DataGrid>
        </div>
    </div>
  );
}
