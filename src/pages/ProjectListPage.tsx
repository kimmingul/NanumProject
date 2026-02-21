import { type ReactNode, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from 'devextreme-react/data-grid';
import {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  StateStoring,
  Grouping,
  GroupPanel,
  SearchPanel,
} from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import { Popup } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import { TextArea } from 'devextreme-react/text-area';
import { DateBox } from 'devextreme-react/date-box';
import { SelectBox } from 'devextreme-react/select-box';
import { supabase } from '@/lib/supabase';
import { useProjects, useProjectCrud, useEnumOptions, useViewConfig } from '@/hooks';
import { usePreferencesStore } from '@/lib/preferences-store';
import { getDxDateFormat, getDxDateTimeFormat } from '@/utils/formatDate';
import type { Project, ColumnConfig } from '@/types';
import './ProjectListPage.css';

// Helper to build column props, filtering out undefined values to avoid exactOptionalPropertyTypes issues
function getColumnProps(col: ColumnConfig) {
  const props: Record<string, unknown> = {
    dataField: col.dataField,
    caption: col.caption,
    visible: col.visible,
    visibleIndex: col.visibleIndex,
  };
  // Only set width if autoWidth is not enabled
  if (!col.autoWidth && col.width !== undefined) props.width = col.width;
  if (col.minWidth !== undefined) props.minWidth = col.minWidth;
  // Use cellAlignment for the alignment prop (affects cell values)
  if (col.cellAlignment !== undefined) props.alignment = col.cellAlignment;
  // Apply header alignment via CSS class
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

interface ProjectFormData {
  name: string;
  description: string;
  status: string;
  start_date: Date | null;
  end_date: Date | null;
}

const emptyForm: ProjectFormData = {
  name: '',
  description: '',
  status: 'active',
  start_date: null,
  end_date: null,
};

interface ProjectStats {
  taskCount: number;
  doneCount: number;
  overdueCount: number;
}

interface PersonInfo {
  name: string;
  avatarUrl: string | null;
}

interface MemberData {
  count: number;
  members: PersonInfo[];
}

interface EnrichedProject extends Project {
  manager_name: string | null;
  manager_avatar: string | null;
  task_count: number;
  progress: number;
  member_count: number;
  members: PersonInfo[];
  created_by_name: string | null;
  overdue_tasks: number;
  days_remaining: number | null;
  year: number | null;
}

export default function ProjectListPage(): ReactNode {
  const navigate = useNavigate();
  const { labels: statusLabels, items: statusOptions } = useEnumOptions('project_status');
  const { projects, loading, error, refetch } = useProjects({ status: 'all' });
  const { createProject, cloneFromTemplate, toggleStar } = useProjectCrud();
  const dateFormat = usePreferencesStore((s) => s.preferences.dateFormat);
  const dxDateFmt = useMemo(() => getDxDateFormat(), [dateFormat]);
  const dxDateTimeFmt = useMemo(() => getDxDateTimeFormat(), [dateFormat]);
  const [showPopup, setShowPopup] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [templateForm, setTemplateForm] = useState({ templateId: '', name: '', startDate: new Date() });
  const [templateSaving, setTemplateSaving] = useState(false);

  // View configuration
  const { effectiveColumns, gridSettings, customLoad, customSave, resetToDefault } = useViewConfig({
    viewKey: 'projects_list',
  });
  const [gridKey, setGridKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const lastCountRef = useRef<number | null>(null);

  // Supplementary data
  const [managerMap, setManagerMap] = useState<Record<string, PersonInfo>>({});
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStats>>({});
  const [memberMap, setMemberMap] = useState<Record<string, MemberData>>({});
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});

  const templateProjects = projects.filter((p: Project) => p.is_template);

  // Fetch supplementary data when projects change
  useEffect(() => {
    if (!projects.length) return;

    const projectIds = projects.map((p) => p.id);
    const todayStr = new Date().toISOString().split('T')[0];

    // Manager info from manager_id (name + avatar)
    const managerIds = [...new Set(projects.map((p) => p.manager_id).filter(Boolean))] as string[];
    if (managerIds.length) {
      supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', managerIds)
        .then(({ data }) => {
          if (!data) return;
          const map: Record<string, PersonInfo> = {};
          for (const p of data) {
            map[p.user_id] = { name: p.full_name || '', avatarUrl: p.avatar_url || null };
          }
          setManagerMap(map);
        });
    } else {
      setManagerMap({});
    }

    // Creator names from created_by
    const creatorIds = [...new Set(projects.map((p) => p.created_by).filter(Boolean))] as string[];
    if (creatorIds.length) {
      supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds)
        .then(({ data }) => {
          if (!data) return;
          const map: Record<string, string> = {};
          for (const p of data) map[p.user_id] = p.full_name || '';
          setCreatorMap(map);
        });
    } else {
      setCreatorMap({});
    }

    // Task stats per project (including overdue count)
    supabase
      .from('project_items')
      .select('project_id, task_status, end_date')
      .in('project_id', projectIds)
      .eq('item_type', 'task')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, ProjectStats> = {};
        for (const row of data) {
          if (!map[row.project_id]) {
            map[row.project_id] = { taskCount: 0, doneCount: 0, overdueCount: 0 };
          }
          map[row.project_id].taskCount++;
          if (row.task_status === 'done') {
            map[row.project_id].doneCount++;
          } else if (row.end_date && row.end_date < todayStr) {
            map[row.project_id].overdueCount++;
          }
        }
        setStatsMap(map);
      });

    // Member data per project (count and member info with avatars)
    supabase
      .from('project_members')
      .select('project_id, user_id')
      .in('project_id', projectIds)
      .then(({ data: memberRows }) => {
        if (!memberRows || memberRows.length === 0) {
          setMemberMap({});
          return;
        }
        // Get unique user IDs to fetch names and avatars
        const userIds = [...new Set(memberRows.map((r) => r.user_id))];
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds)
          .then(({ data: profileRows }) => {
            const profileMap: Record<string, PersonInfo> = {};
            for (const p of profileRows || []) {
              profileMap[p.user_id] = { name: p.full_name || '', avatarUrl: p.avatar_url || null };
            }
            // Aggregate by project
            const map: Record<string, MemberData> = {};
            for (const row of memberRows) {
              if (!map[row.project_id]) {
                map[row.project_id] = { count: 0, members: [] };
              }
              map[row.project_id].count++;
              const info = profileMap[row.user_id];
              if (info) {
                map[row.project_id].members.push(info);
              }
            }
            setMemberMap(map);
          });
      });
  }, [projects]);

  // Enriched projects for the grid
  const enrichedProjects: EnrichedProject[] = projects.map((p) => {
    const stats = statsMap[p.id];
    const taskCount = stats?.taskCount ?? 0;
    const doneCount = stats?.doneCount ?? 0;
    const memberData = memberMap[p.id] || { count: 0, members: [] };
    const managerInfo = p.manager_id ? managerMap[p.manager_id] : null;
    const daysRemaining = p.end_date
      ? Math.ceil((new Date(p.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...p,
      manager_name: managerInfo?.name || null,
      manager_avatar: managerInfo?.avatarUrl || null,
      task_count: taskCount,
      progress: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
      member_count: memberData.count,
      members: memberData.members,
      created_by_name: p.created_by ? creatorMap[p.created_by] || null : null,
      overdue_tasks: stats?.overdueCount ?? 0,
      days_remaining: daysRemaining,
      year: p.start_date ? new Date(p.start_date).getFullYear() : null,
    };
  });

  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      await createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        start_date: formData.start_date?.toISOString().split('T')[0] ?? null,
        end_date: formData.end_date?.toISOString().split('T')[0] ?? null,
      });
      setShowPopup(false);
      setFormData(emptyForm);
      await refetch();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setSaving(false);
    }
  }, [formData, createProject, refetch]);

  const handleCloneFromTemplate = useCallback(async () => {
    if (!templateForm.templateId || !templateForm.name.trim()) return;
    setTemplateSaving(true);
    try {
      const newProjectId = await cloneFromTemplate(
        templateForm.templateId,
        templateForm.name.trim(),
        templateForm.startDate?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
      );
      setShowTemplatePopup(false);
      setTemplateForm({ templateId: '', name: '', startDate: new Date() });
      await refetch();
      navigate(`/tasks/${newProjectId}`);
    } catch (err) {
      console.error('Failed to clone from template:', err);
    } finally {
      setTemplateSaving(false);
    }
  }, [templateForm, cloneFromTemplate, refetch, navigate]);

  return (
      <div className="project-list-page">
        <div className="project-list-header">
          <span className="project-list-header-title">PROJECTS</span>
          <span className="project-list-header-count">{loading ? '...' : (visibleCount ?? enrichedProjects.length)}</span>
          <Button
            icon="plus"
            text="New"
            stylingMode="text"
            className="project-list-header-btn"
            onClick={() => setShowPopup(true)}
          />
          <Button
            icon="copy"
            text="Template"
            stylingMode="text"
            className="project-list-header-btn"
            onClick={() => setShowTemplatePopup(true)}
          />
          <Button
            icon="columnchooser"
            hint="Reset columns to default"
            stylingMode="text"
            className="project-list-header-btn reset-view-btn"
            onClick={() => {
              resetToDefault();
              setGridKey((k) => k + 1);
            }}
          />
        </div>

        {error && (
          <div className="error-banner">
            <i className="dx-icon-warning"></i>
            <span>{error}</span>
          </div>
        )}

        <div className={`project-grid-container${gridSettings.uppercaseHeaders ? ' uppercase-headers' : ''}`}>
          <DataGrid
            key={gridKey}
            dataSource={enrichedProjects}
            keyExpr="id"
            width="100%"
            height="100%"
            showBorders={false}
            showRowLines={gridSettings.showRowLines ?? true}
            showColumnLines={gridSettings.showColumnLines ?? false}
            rowAlternationEnabled={gridSettings.rowAlternationEnabled ?? true}
            wordWrapEnabled={gridSettings.wordWrapEnabled ?? false}
            columnAutoWidth={gridSettings.columnAutoWidth ?? false}
            hoverStateEnabled={true}
            onRowClick={(e) => {
              if (e.data?.id) {
                navigate(`/tasks/${e.data.id}`);
              }
            }}
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
            noDataText={loading ? 'Loading projects...' : 'No projects found. Click "New Project" to get started.'}
          >
            <StateStoring
              enabled={true}
              type="custom"
              customLoad={customLoad}
              customSave={customSave}
              savingTimeout={2000}
            />
            <FilterRow visible={gridSettings.showFilterRow ?? true} />
            <HeaderFilter visible={gridSettings.showHeaderFilter ?? true} />
            <SearchPanel visible={gridSettings.showSearchPanel ?? false} />
            <GroupPanel visible={gridSettings.showGroupPanel ?? false} />
            <Grouping autoExpandAll={true} />

            {effectiveColumns.map((col) => {
              const colProps = getColumnProps(col);

              // Custom cell renders for specific columns
              if (col.dataField === 'name') {
                // Name column: auto width to fill remaining space
                const { width: _w, ...nameColProps } = colProps;
                return (
                  <Column
                    key={col.dataField}
                    {...nameColProps}
                    minWidth={col.minWidth || 200}
                    cellRender={(data: { value: string; data: { id: string; is_starred: boolean } }) => (
                      <div className="project-name-cell">
                        <i
                          className={`dx-icon-favorites project-star${data.data.is_starred ? ' starred' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(data.data.id).then(() => refetch());
                          }}
                        />
                        <span>{data.value}</span>
                      </div>
                    )}
                  />
                );
              }

              if (col.dataField === 'year') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
                    cellRender={(data: { value: number | null }) => (
                      <span className="project-year-cell">{data.value ?? '—'}</span>
                    )}
                  />
                );
              }

              if (col.dataField === 'manager_name') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { value: string | null; data: EnrichedProject }) => {
                      if (!data.value) return <span className="project-owner-cell">—</span>;
                      if (col.displayMode === 'avatar') {
                        const avatarUrl = data.data.manager_avatar;
                        return avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={data.value}
                            title={data.value}
                            className="avatar-single avatar-img"
                          />
                        ) : (
                          <span className="avatar-single" title={data.value}>
                            {data.value.charAt(0).toUpperCase()}
                          </span>
                        );
                      }
                      return <span className="project-owner-cell">{data.value}</span>;
                    }}
                  />
                );
              }

              if (col.dataField === 'status') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    defaultFilterValue="active"
                    cellRender={(data: { value: string }) => (
                      <span className={`project-status-badge status-${data.value}`}>
                        {statusLabels[data.value] || data.value}
                      </span>
                    )}
                  />
                );
              }

              if (col.dataField === 'progress') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
                    cellRender={(data: { value: number }) => (
                      <div className="project-progress-cell">
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${data.value}%` }}
                          />
                        </div>
                        <span className="progress-label">{data.value}%</span>
                      </div>
                    )}
                  />
                );
              }

              if (col.dataField === 'task_count') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
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

              if (col.dataField === 'end_date') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="date"
                    format={dxDateFmt}
                  />
                );
              }

              if (col.dataField === 'updated_at') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="datetime"
                    format={dxDateTimeFmt}
                  />
                );
              }

              if (col.dataField === 'member_count') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
                    cellRender={(data: { value: number }) => (
                      <span className="member-count-badge">{data.value}</span>
                    )}
                  />
                );
              }

              if (col.dataField === 'members') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { data: EnrichedProject }) => {
                      const members = data.data.members;
                      if (!members || members.length === 0) return null;
                      if (col.displayMode === 'avatar') {
                        return (
                          <span className="avatar-stack">
                            {members.slice(0, 5).map((member, i) => (
                              member.avatarUrl ? (
                                <img
                                  key={i}
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  title={member.name}
                                  className={`avatar-stack-item avatar-img stack-pos-${i}`}
                                />
                              ) : (
                                <span
                                  key={i}
                                  className={`avatar-stack-item stack-pos-${i}`}
                                  title={member.name}
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              )
                            ))}
                            {members.length > 5 && (
                              <span className="avatar-stack-more">+{members.length - 5}</span>
                            )}
                          </span>
                        );
                      }
                      // Text mode: comma-separated names
                      const namesText = members.map((m) => m.name).join(', ');
                      return (
                        <span className="project-members-text" title={namesText}>
                          {namesText.length > 30 ? namesText.substring(0, 30) + '...' : namesText}
                        </span>
                      );
                    }}
                  />
                );
              }

              if (col.dataField === 'created_by_name') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { value: string | null }) => (
                      <span className="project-owner-cell">{data.value || '—'}</span>
                    )}
                  />
                );
              }

              if (col.dataField === 'created_at') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="datetime"
                    format={dxDateTimeFmt}
                  />
                );
              }

              if (col.dataField === 'is_template') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { value: boolean }) =>
                      data.value ? <span className="template-badge">Template</span> : null
                    }
                  />
                );
              }

              if (col.dataField === 'description') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    cellRender={(data: { value: string | null }) => (
                      <span className="description-cell" title={data.value || ''}>
                        {data.value && data.value.length > 80 ? data.value.substring(0, 80) + '...' : data.value}
                      </span>
                    )}
                  />
                );
              }

              if (col.dataField === 'overdue_tasks') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
                    cellRender={(data: { value: number }) => (
                      <span className={`overdue-badge${data.value > 0 ? ' has-overdue' : ''}`}>
                        {data.value}
                      </span>
                    )}
                  />
                );
              }

              if (col.dataField === 'days_remaining') {
                return (
                  <Column
                    key={col.dataField}
                    {...colProps}
                    dataType="number"
                    cellRender={(data: { value: number | null }) => {
                      if (data.value === null) return <span className="days-remaining none">—</span>;
                      const className = data.value < 0 ? 'overdue' : data.value <= 7 ? 'soon' : '';
                      return (
                        <span className={`days-remaining ${className}`}>
                          {data.value}d
                        </span>
                      );
                    }}
                  />
                );
              }

              // Generic column for any additional fields
              return (
                <Column
                  key={col.dataField}
                  {...colProps}
                />
              );
            })}

            <Pager
              visible={true}
              showPageSizeSelector={true}
              allowedPageSizes={[10, 25, 50, 100]}
              showInfo={true}
            />
            <Paging defaultPageSize={25} />
          </DataGrid>
        </div>

        <Popup
          visible={showPopup}
          onHiding={() => setShowPopup(false)}
          title="New Project"
          showCloseButton={true}
          width={520}
          height="auto"
          maxHeight="80vh"
        >
          <div className="project-form">
            <div className="form-field">
              <label>Project Name *</label>
              <TextBox
                value={formData.name}
                onValueChanged={(e) => setFormData((f) => ({ ...f, name: e.value }))}
                placeholder="Enter project name"
                stylingMode="outlined"
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <TextArea
                value={formData.description}
                onValueChanged={(e) => setFormData((f) => ({ ...f, description: e.value }))}
                placeholder="Brief project description"
                stylingMode="outlined"
                height={80}
              />
            </div>

            <div className="form-field">
              <label>Status</label>
              <SelectBox
                dataSource={statusOptions}
                displayExpr="label"
                valueExpr="value"
                value={formData.status}
                onValueChanged={(e) => setFormData((f) => ({ ...f, status: e.value }))}
                stylingMode="outlined"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Start Date</label>
                <DateBox
                  value={formData.start_date}
                  onValueChanged={(e) => setFormData((f) => ({ ...f, start_date: e.value }))}
                  type="date"
                  stylingMode="outlined"
                  placeholder="Select start date"
                />
              </div>
              <div className="form-field">
                <label>End Date</label>
                <DateBox
                  value={formData.end_date}
                  onValueChanged={(e) => setFormData((f) => ({ ...f, end_date: e.value }))}
                  type="date"
                  stylingMode="outlined"
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div className="form-actions">
              <Button
                text="Cancel"
                stylingMode="outlined"
                onClick={() => {
                  setShowPopup(false);
                  setFormData(emptyForm);
                }}
              />
              <Button
                text={saving ? 'Creating...' : 'Create Project'}
                type="default"
                stylingMode="contained"
                disabled={!formData.name.trim() || saving}
                onClick={handleCreate}
              />
            </div>
          </div>
        </Popup>

        <Popup
          visible={showTemplatePopup}
          onHiding={() => setShowTemplatePopup(false)}
          title="New Project from Template"
          showCloseButton={true}
          width={480}
          height="auto"
        >
          <div className="project-form">
            <div className="form-field">
              <label>Template *</label>
              <SelectBox
                dataSource={templateProjects}
                displayExpr="name"
                valueExpr="id"
                value={templateForm.templateId}
                onValueChanged={(e) => setTemplateForm((f) => ({ ...f, templateId: e.value }))}
                stylingMode="outlined"
                placeholder="Select a template..."
                noDataText="No template projects. Mark a project as template in Settings."
              />
            </div>
            <div className="form-field">
              <label>Project Name *</label>
              <TextBox
                value={templateForm.name}
                onValueChanged={(e) => setTemplateForm((f) => ({ ...f, name: e.value }))}
                placeholder="New project name"
                stylingMode="outlined"
              />
            </div>
            <div className="form-field">
              <label>Start Date</label>
              <DateBox
                value={templateForm.startDate}
                onValueChanged={(e) => setTemplateForm((f) => ({ ...f, startDate: e.value }))}
                type="date"
                stylingMode="outlined"
              />
            </div>
            <div className="form-actions">
              <Button text="Cancel" stylingMode="outlined" onClick={() => setShowTemplatePopup(false)} />
              <Button
                text={templateSaving ? 'Creating...' : 'Create from Template'}
                type="default"
                stylingMode="contained"
                disabled={!templateForm.templateId || !templateForm.name.trim() || templateSaving}
                onClick={handleCloneFromTemplate}
              />
            </div>
          </div>
        </Popup>
      </div>
  );
}
