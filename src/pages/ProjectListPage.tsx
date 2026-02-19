import { type ReactNode, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from 'devextreme-react/data-grid';
import {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Toolbar,
  Item,
} from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import { Popup } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import { TextArea } from 'devextreme-react/text-area';
import { DateBox } from 'devextreme-react/date-box';
import { SelectBox } from 'devextreme-react/select-box';
import { useProjects, useProjectCrud } from '@/hooks';
import type { ProjectStatus } from '@/types';
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

export default function ProjectListPage(): ReactNode {
  const navigate = useNavigate();
  const { projects, loading, error, refetch } = useProjects({ status: 'active' });
  const { createProject } = useProjectCrud();
  const [showPopup, setShowPopup] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

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

  return (
      <div className="project-list-page">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Projects</h2>
              <p>Manage your project portfolio</p>
            </div>
            <Button
              text="New Project"
              icon="plus"
              type="default"
              stylingMode="contained"
              onClick={() => setShowPopup(true)}
            />
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <i className="dx-icon-warning"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="project-grid-container">
          <DataGrid
            dataSource={projects}
            keyExpr="id"
            showBorders={true}
            showRowLines={true}
            showColumnLines={false}
            rowAlternationEnabled={true}
            hoverStateEnabled={true}
            columnAutoWidth={true}
            onRowClick={(e) => {
              if (e.data?.id) {
                navigate(`/projects/${e.data.id}`);
              }
            }}
            noDataText={loading ? 'Loading projects...' : 'No projects found. Click "New Project" to get started.'}
          >
            <FilterRow visible={true} />
            <HeaderFilter visible={true} />
            <SearchPanel visible={true} width={240} placeholder="Search projects..." />

            <Toolbar>
              <Item name="searchPanel" />
            </Toolbar>

            <Column
              dataField="name"
              caption="Project Name"
              minWidth={300}
              sortOrder="asc"
              sortIndex={0}
              cellRender={(data: { value: string; data: { is_starred: boolean } }) => (
                <div className="project-name-cell">
                  {data.data.is_starred && (
                    <i className="dx-icon-favorites project-star"></i>
                  )}
                  <span>{data.value}</span>
                </div>
              )}
            />

            <Column
              dataField="status"
              caption="Status"
              width={120}
              cellRender={(data: { value: string }) => (
                <span className={`project-status-badge status-${data.value}`}>
                  {statusLabels[data.value] || data.value}
                </span>
              )}
            />

            <Column
              dataField="start_date"
              caption="Start"
              dataType="date"
              width={120}
            />

            <Column
              dataField="end_date"
              caption="End"
              dataType="date"
              width={120}
            />

            <Column
              dataField="updated_at"
              caption="Last Updated"
              dataType="datetime"
              width={170}
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
      </div>
  );
}
