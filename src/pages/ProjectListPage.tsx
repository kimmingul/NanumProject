import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from 'devextreme-react/data-grid';
import {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
} from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import { Popup } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import { TextArea } from 'devextreme-react/text-area';
import { DateBox } from 'devextreme-react/date-box';
import { SelectBox } from 'devextreme-react/select-box';
import { supabase } from '@/lib/supabase';
import { useProjects, useProjectCrud } from '@/hooks';
import { usePreferencesStore } from '@/lib/preferences-store';
import { getDxDateFormat, getDxDateTimeFormat } from '@/utils/formatDate';
import type { ProjectStatus, Project } from '@/types';
import './ProjectListPage.css';

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  complete: 'Complete',
  archived: 'Archived',
};

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' },
];

interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
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
}

interface EnrichedProject extends Project {
  manager_name: string | null;
  task_count: number;
  progress: number;
}

export default function ProjectListPage(): ReactNode {
  const navigate = useNavigate();
  const { projects, loading, error, refetch } = useProjects({ status: 'all' });
  const { createProject, updateProject, cloneFromTemplate } = useProjectCrud();
  const dateFormat = usePreferencesStore((s) => s.preferences.dateFormat);
  const dxDateFmt = useMemo(() => getDxDateFormat(), [dateFormat]);
  const dxDateTimeFmt = useMemo(() => getDxDateTimeFormat(), [dateFormat]);
  const [showPopup, setShowPopup] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [templateForm, setTemplateForm] = useState({ templateId: '', name: '', startDate: new Date() });
  const [templateSaving, setTemplateSaving] = useState(false);

  // Supplementary data
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStats>>({});

  const templateProjects = projects.filter((p: Project) => p.is_template);

  // Fetch manager names and task stats when projects change
  useEffect(() => {
    if (!projects.length) return;

    // Manager names from manager_id
    const managerIds = [...new Set(projects.map((p) => p.manager_id).filter(Boolean))] as string[];
    if (managerIds.length) {
      supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', managerIds)
        .then(({ data }) => {
          if (!data) return;
          const map: Record<string, string> = {};
          for (const p of data) map[p.user_id] = p.full_name || '';
          setManagerMap(map);
        });
    } else {
      setManagerMap({});
    }

    // Task stats per project
    const projectIds = projects.map((p) => p.id);
    supabase
      .from('project_items')
      .select('project_id, task_status')
      .in('project_id', projectIds)
      .eq('item_type', 'task')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, ProjectStats> = {};
        for (const row of data) {
          if (!map[row.project_id]) {
            map[row.project_id] = { taskCount: 0, doneCount: 0 };
          }
          map[row.project_id].taskCount++;
          if (row.task_status === 'done') {
            map[row.project_id].doneCount++;
          }
        }
        setStatsMap(map);
      });
  }, [projects]);

  // Enriched projects for the grid
  const enrichedProjects: EnrichedProject[] = projects.map((p) => {
    const stats = statsMap[p.id];
    const taskCount = stats?.taskCount ?? 0;
    const doneCount = stats?.doneCount ?? 0;
    return {
      ...p,
      manager_name: p.manager_id ? managerMap[p.manager_id] || null : null,
      task_count: taskCount,
      progress: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
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
        </div>

        {error && (
          <div className="error-banner">
            <i className="dx-icon-warning"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="project-grid-container">
          <DataGrid
            dataSource={enrichedProjects}
            keyExpr="id"
            height="100%"
            showBorders={false}
            showRowLines={true}
            showColumnLines={false}
            rowAlternationEnabled={true}
            hoverStateEnabled={true}
            onRowClick={(e) => {
              if (e.data?.id) {
                navigate(`/tasks/${e.data.id}`);
              }
            }}
            noDataText={loading ? 'Loading projects...' : 'No projects found. Click "New Project" to get started.'}
          >
            <FilterRow visible={true} />
            <HeaderFilter visible={true} />

            <Column
              dataField="name"
              caption="Project Name"
              minWidth={200}
              cellRender={(data: { value: string; data: { id: string; is_starred: boolean } }) => (
                <div className="project-name-cell">
                  <i
                    className={`dx-icon-favorites project-star${data.data.is_starred ? ' starred' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateProject(data.data.id, { is_starred: !data.data.is_starred }).then(() => refetch());
                    }}
                  />
                  <span>{data.value}</span>
                </div>
              )}
            />

            <Column
              dataField="manager_name"
              caption="Manager"
              width={120}
              cellRender={(data: { value: string | null }) => (
                <span className="project-owner-cell">{data.value || '—'}</span>
              )}
            />

            <Column
              dataField="status"
              caption="Status"
              width={100}
              defaultFilterValue="active"
              cellRender={(data: { value: string }) => (
                <span className={`project-status-badge status-${data.value}`}>
                  {statusLabels[data.value] || data.value}
                </span>
              )}
            />

            <Column
              dataField="progress"
              caption="Progress"
              width={120}
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

            <Column
              dataField="task_count"
              caption="Tasks"
              width={110}
              dataType="number"
              alignment="center"
            />

            <Column
              dataField="start_date"
              caption="Start"
              dataType="date"
              format={dxDateFmt}
              width={100}
              sortOrder="desc"
              sortIndex={0}
            />

            <Column
              dataField="end_date"
              caption="End"
              dataType="date"
              format={dxDateFmt}
              width={100}
            />

            <Column
              dataField="updated_at"
              caption="Updated"
              dataType="datetime"
              format={dxDateTimeFmt}
              width={160}
            />

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
