import { type ReactNode, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { TextArea } from 'devextreme-react/text-area';
import { SelectBox } from 'devextreme-react/select-box';
import { DateBox } from 'devextreme-react/date-box';
import { Switch } from 'devextreme-react/switch';
import { Button } from 'devextreme-react/button';
import { DataGrid } from 'devextreme-react/data-grid';
import { Column } from 'devextreme-react/data-grid';
import { useProjectCrud } from '@/hooks/useProjectCrud';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useEnumOptions } from '@/hooks/useEnumOptions';
import { useAuthStore } from '@/lib/auth-store';
import type { Project, MemberPermission } from '@/types';
import { DEFAULT_GRID_SETTINGS } from '@/lib/view-config-store';
import './ProjectSettingsView.css';

export interface ProjectSettingsViewHandle {
  save: () => Promise<void>;
  saving: boolean;
  saved: boolean;
  canSave: boolean;
}

interface ProjectSettingsViewProps {
  project: Project;
  onProjectUpdated?: (project: Project) => void;
  onCancel?: () => void;
  showHeaderActions?: boolean;
}

const ProjectSettingsView = forwardRef<ProjectSettingsViewHandle, ProjectSettingsViewProps>(function ProjectSettingsView({
  project,
  onProjectUpdated,
  onCancel,
  showHeaderActions = true,
}, ref): ReactNode {
  const { updateProject } = useProjectCrud();
  const { members, loading: membersLoading, updateMemberPermission, removeMember } =
    useProjectMembers(project.id);
  const profile = useAuthStore((s) => s.profile);
  const { items: statusOptions } = useEnumOptions('project_status');
  const { items: permissionOptions, labels: permissionLabels } = useEnumOptions('member_permission');

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState<string>(project.status);
  const [managerId, setManagerId] = useState<string | null>(project.manager_id);
  const [startDate, setStartDate] = useState<Date | null>(
    project.start_date ? new Date(project.start_date) : null,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    project.end_date ? new Date(project.end_date) : null,
  );
  const [hoursEnabled, setHoursEnabled] = useState(project.has_hours_enabled);
  const [isTemplate, setIsTemplate] = useState(project.is_template);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSave = !!name.trim() && !saving;

  useEffect(() => {
    setName(project.name);
    setDescription(project.description || '');
    setStatus(project.status);
    setManagerId(project.manager_id);
    setStartDate(project.start_date ? new Date(project.start_date) : null);
    setEndDate(project.end_date ? new Date(project.end_date) : null);
    setHoursEnabled(project.has_hours_enabled);
    setIsTemplate(project.is_template);
  }, [project]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        manager_id: managerId,
        start_date: startDate?.toISOString().split('T')[0] ?? null,
        end_date: endDate?.toISOString().split('T')[0] ?? null,
        has_hours_enabled: hoursEnabled,
        is_template: isTemplate,
      });
      setSaved(true);
      onProjectUpdated?.(updated);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update project:', err);
    } finally {
      setSaving(false);
    }
  }, [name, description, status, managerId, startDate, endDate, hoursEnabled, isTemplate, project.id, updateProject, onProjectUpdated]);

  // Expose save functionality to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    saving,
    saved,
    canSave,
  }), [handleSave, saving, saved, canSave]);

  return (
    <div className="project-settings-view">
      {/* Top Actions - only shown when showHeaderActions is true */}
      {showHeaderActions && (
        <div className="settings-header-actions">
          {onCancel && (
            <Button
              text="Cancel"
              stylingMode="outlined"
              onClick={onCancel}
            />
          )}
          <Button
            text={saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            type={saved ? 'success' : 'default'}
            stylingMode="contained"
            icon={saved ? 'check' : ''}
            disabled={!canSave}
            onClick={handleSave}
          />
        </div>
      )}

      {/* Card-based Settings Form */}
      <div className="settings-form">
        {/* General Information Card */}
        <div className="settings-card">
          <h3 className="settings-card-title">General Information</h3>
          <div className="settings-card-content">
            <div className="form-field">
              <label>Project Name *</label>
              <TextBox
                value={name}
                onValueChanged={(e) => setName(e.value)}
                stylingMode="outlined"
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <TextArea
                value={description}
                onValueChanged={(e) => setDescription(e.value)}
                stylingMode="outlined"
                height={80}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Status</label>
                <SelectBox
                  dataSource={statusOptions}
                  displayExpr="label"
                  valueExpr="value"
                  value={status}
                  onValueChanged={(e) => setStatus(e.value)}
                  stylingMode="outlined"
                />
              </div>

              <div className="form-field">
                <label>Manager</label>
                <SelectBox
                  dataSource={members}
                  displayExpr={(item: { profile?: { full_name: string | null; email: string } } | null) =>
                    item ? (item.profile?.full_name || item.profile?.email || 'Unknown') : ''
                  }
                  valueExpr="user_id"
                  value={managerId}
                  onValueChanged={(e) => setManagerId(e.value)}
                  stylingMode="outlined"
                  placeholder="Select manager..."
                  showClearButton={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Card */}
        <div className="settings-card">
          <h3 className="settings-card-title">Schedule</h3>
          <div className="settings-card-content">
            <div className="form-row">
              <div className="form-field">
                <label>Start Date</label>
                <DateBox
                  value={startDate}
                  onValueChanged={(e) => setStartDate(e.value)}
                  type="date"
                  stylingMode="outlined"
                />
              </div>
              <div className="form-field">
                <label>End Date</label>
                <DateBox
                  value={endDate}
                  onValueChanged={(e) => setEndDate(e.value)}
                  type="date"
                  stylingMode="outlined"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Options Card */}
        <div className="settings-card">
          <h3 className="settings-card-title">Options</h3>
          <div className="settings-card-content">
            <div className="form-row form-switches">
              <div className="form-field form-switch">
                <Switch
                  value={hoursEnabled}
                  onValueChanged={(e) => setHoursEnabled(e.value)}
                />
                <label>Enable time tracking</label>
              </div>

              <div className="form-field form-switch">
                <Switch
                  value={isTemplate}
                  onValueChanged={(e) => setIsTemplate(e.value)}
                />
                <label>Mark as Template</label>
              </div>
            </div>
          </div>
        </div>

        {/* Members Card */}
        <div className="settings-card">
          <h3 className="settings-card-title">Members</h3>
          <div className="settings-card-content">
            <DataGrid
              dataSource={members}
              keyExpr="id"
              showBorders={true}
              showRowLines={DEFAULT_GRID_SETTINGS.showRowLines ?? true}
              showColumnLines={DEFAULT_GRID_SETTINGS.showColumnLines ?? false}
              rowAlternationEnabled={DEFAULT_GRID_SETTINGS.rowAlternationEnabled ?? true}
              hoverStateEnabled={true}
              columnAutoWidth={true}
              noDataText={membersLoading ? 'Loading members...' : 'No members yet'}
            >
              <Column
                caption="Member"
                minWidth={200}
                cellRender={(data: { data: { profile?: { full_name: string | null; email: string; avatar_url: string | null } } }) => {
                  const p = data.data.profile;
                  return (
                    <div className="member-cell">
                      <div className="member-avatar">
                        {(p?.full_name || p?.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="member-name">{p?.full_name || 'Unknown'}</div>
                        <div className="member-email">{p?.email}</div>
                      </div>
                    </div>
                  );
                }}
              />

              <Column
                dataField="permission"
                caption="Role"
                width={160}
                cellRender={(data: { value: string; data: { id: string; user_id: string } }) => {
                  const isCurrentUser = data.data.user_id === profile?.user_id;
                  return isCurrentUser ? (
                    <span className={`permission-badge perm-${data.value}`}>
                      {permissionLabels[data.value] || data.value} (You)
                    </span>
                  ) : (
                    <SelectBox
                      dataSource={permissionOptions}
                      displayExpr="label"
                      valueExpr="value"
                      value={data.value}
                      onValueChanged={(e) =>
                        updateMemberPermission(data.data.id, e.value as MemberPermission)
                      }
                      stylingMode="outlined"
                      width={140}
                    />
                  );
                }}
              />

              <Column
                caption=""
                width={60}
                cellRender={(data: { data: { id: string; user_id: string } }) => {
                  const isCurrentUser = data.data.user_id === profile?.user_id;
                  if (isCurrentUser) return null;
                  return (
                    <Button
                      icon="trash"
                      stylingMode="text"
                      hint="Remove member"
                      onClick={() => removeMember(data.data.id)}
                    />
                  );
                }}
              />
            </DataGrid>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProjectSettingsView;
