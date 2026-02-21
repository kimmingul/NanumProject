import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { DataGrid } from 'devextreme-react/data-grid';
import {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Export,
  Toolbar,
  Item,
  Selection,
} from 'devextreme-react/data-grid';
import { TreeList, Column as TreeColumn } from 'devextreme-react/tree-list';
import { Popup } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import { confirm as dxConfirm } from 'devextreme/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useEnumOptions } from '@/hooks/useEnumOptions';
import { useEnumConfigStore } from '@/lib/enum-config-store';
import type { UserRole, EmploymentStatus } from '@/types';
import { DEFAULT_GRID_SETTINGS } from '@/lib/view-config-store';
import './UsersSection.css';

// Tab definition
type UserTab = 'directory' | 'departments' | 'orgchart' | 'active' | 'onleave' | 'terminated' | 'settings';

interface TabMeta {
  key: UserTab;
  label: string;
  icon: string;
}

const TABS: TabMeta[] = [
  { key: 'directory', label: 'Directory', icon: 'dx-icon-group' },
  { key: 'departments', label: 'Departments', icon: 'dx-icon-hierarchy' },
  { key: 'orgchart', label: 'Org Chart', icon: 'dx-icon-smalliconslayout' },
  { key: 'active', label: 'Active', icon: 'dx-icon-user' },
  { key: 'onleave', label: 'On Leave', icon: 'dx-icon-clock' },
  { key: 'terminated', label: 'Terminated', icon: 'dx-icon-remove' },
  { key: 'settings', label: 'Settings', icon: 'dx-icon-preferences' },
];

const TAB_DESCRIPTIONS: Record<UserTab, string> = {
  directory: 'View and manage all users in your organization',
  departments: 'Create and organize departments',
  orgchart: 'Visualize organizational hierarchy',
  active: 'Currently employed users',
  onleave: 'Users on temporary leave',
  terminated: 'Former employees',
  settings: 'Configure user management defaults',
};

interface UserRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  employment_status: EmploymentStatus;
  department_id: string | null;
  manager_id: string | null;
  last_login_at: string | null;
  created_at: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
}

const employmentStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];

export default function UsersSection(): ReactNode {
  const { items: roleOptions } = useEnumOptions('user_role');
  const { options: departmentEnumOptions } = useEnumOptions('department');
  const loadEnumConfigs = useEnumConfigStore((s) => s.loadConfigs);
  const departmentOptions = departmentEnumOptions.map((o) => o.label);
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const currentUserId = useAuthStore((s) => s.profile?.user_id);
  const currentRole = useAuthStore((s) => s.profile?.role);
  const setProfile = useAuthStore((s) => s.setProfile);
  const authProfile = useAuthStore((s) => s.profile);
  const { updatePassword } = useAuth();
  const {
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deactivateUser,
    reactivateUser,
    sendPasswordReset,
    createUser,
    updateEmploymentStatus,
    updateUserManager,
    updateUserDepartment,
  } = useUserManagement();

  // Tab state
  const [activeTab, setActiveTab] = useState<UserTab>('directory');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected user for detail panel
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Edit popup state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editEmploymentStatus, setEditEmploymentStatus] = useState<EmploymentStatus>('active');
  const [editManagerId, setEditManagerId] = useState<string | null>(null);
  const [editDepartmentId, setEditDepartmentId] = useState<string | null>(null);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extended fields
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editZipCode, setEditZipCode] = useState('');

  // Add User popup state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addFullName, setAddFullName] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('member');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // Department management state
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, email, full_name, avatar_url, role, is_active, employment_status, department_id, manager_id, last_login_at, created_at, phone, department, position, bio, address, city, state, country, zip_code')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load users:', error);
    } else {
      setUsers(data as unknown as UserRow[]);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users by employment status for employment tabs
  const getFilteredUsers = useCallback(
    (status?: EmploymentStatus) => {
      if (!status) return users;
      return users.filter((u) => u.employment_status === status);
    },
    [users],
  );

  const openEditPopup = (user: UserRow) => {
    setEditUser(user);
    setEditFullName(user.full_name || '');
    setEditRole(user.role as UserRole);
    setEditIsActive(user.is_active);
    setEditEmploymentStatus(user.employment_status || 'active');
    setEditManagerId(user.manager_id);
    setEditDepartmentId(user.department_id);
    setEditAvatarUrl(user.avatar_url);
    setEditPhone(user.phone || '');
    setEditDepartment(user.department || '');
    setEditPosition(user.position || '');
    setEditBio(user.bio || '');
    setEditAddress(user.address || '');
    setEditCity(user.city || '');
    setEditState(user.state || '');
    setEditCountry(user.country || '');
    setEditZipCode(user.zip_code || '');
    setNewPassword('');
    setFormError('');
    setFormSuccess('');
  };

  const closeEditPopup = () => {
    setEditUser(null);
    setFormError('');
    setFormSuccess('');
  };

  const isSelf = editUser?.user_id === currentUserId;
  const isAdmin = currentRole === 'admin';

  const openAddUserPopup = () => {
    setAddEmail('');
    setAddFullName('');
    setAddRole('member');
    setAddError('');
    setAddUserOpen(true);
  };

  const closeAddUserPopup = () => {
    setAddUserOpen(false);
    setAddError('');
  };

  const handleCreateUser = async () => {
    if (!addEmail.trim()) {
      setAddError('Email is required');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      await createUser(addEmail.trim(), addFullName.trim(), addRole);
      await fetchUsers();
      closeAddUserPopup();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setAddSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setFormError('');
    try {
      const updates: Record<string, unknown> = {};
      if (editFullName !== (editUser.full_name || '')) {
        updates.full_name = editFullName || null;
      }
      if (editRole !== editUser.role && isAdmin) {
        updates.role = editRole;
      }
      // Extended fields
      if (editPhone !== (editUser.phone || '')) updates.phone = editPhone || null;
      if (editDepartment !== (editUser.department || '')) updates.department = editDepartment || null;
      if (editPosition !== (editUser.position || '')) updates.position = editPosition || null;
      if (editBio !== (editUser.bio || '')) updates.bio = editBio || null;
      if (editAddress !== (editUser.address || '')) updates.address = editAddress || null;
      if (editCity !== (editUser.city || '')) updates.city = editCity || null;
      if (editState !== (editUser.state || '')) updates.state = editState || null;
      if (editCountry !== (editUser.country || '')) updates.country = editCountry || null;
      if (editZipCode !== (editUser.zip_code || '')) updates.zip_code = editZipCode || null;

      // Separate role update (via RPC) from direct profile updates
      const roleUpdate = updates.role as string | undefined;
      delete updates.role;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', editUser.user_id);
        if (error) throw error;
      }
      if (roleUpdate) {
        await updateProfile(editUser.user_id, { role: roleUpdate });
      }

      // Employment status update (admin only)
      if (editEmploymentStatus !== editUser.employment_status && isAdmin) {
        await updateEmploymentStatus(editUser.user_id, editEmploymentStatus);
      }

      // Manager update (admin only)
      if (editManagerId !== editUser.manager_id && isAdmin) {
        await updateUserManager(editUser.user_id, editManagerId);
      }

      // Department ID update (admin only)
      if (editDepartmentId !== editUser.department_id && isAdmin) {
        await updateUserDepartment(editUser.user_id, editDepartmentId);
      }

      if (editIsActive !== editUser.is_active && isAdmin) {
        if (editIsActive) {
          await reactivateUser(editUser.user_id);
        } else {
          await deactivateUser(editUser.user_id);
        }
      }

      if (isSelf && authProfile) {
        setProfile({
          ...authProfile,
          full_name: editFullName || authProfile.full_name,
          role: isAdmin ? editRole : authProfile.role,
          avatar_url: editAvatarUrl,
        });
      }

      await fetchUsers();
      closeEditPopup();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editUser) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image must be under 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('Only image files are allowed');
      return;
    }

    setFormError('');
    try {
      const url = await uploadAvatar(editUser.user_id, file);
      setEditAvatarUrl(url);
      if (isSelf && authProfile) {
        setProfile({ ...authProfile, avatar_url: url });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarRemove = async () => {
    if (!editUser) return;
    setFormError('');
    try {
      await removeAvatar(editUser.user_id);
      setEditAvatarUrl(null);
      if (isSelf && authProfile) {
        setProfile({ ...authProfile, avatar_url: null });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    setFormError('');
    setFormSuccess('');
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setFormSuccess('Password changed successfully');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Password change failed');
    }
  };

  const handlePasswordReset = async () => {
    if (!editUser) return;
    setFormError('');
    setFormSuccess('');
    try {
      await sendPasswordReset(editUser.email);
      setFormSuccess('Password reset email sent');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  const handleToggleActive = async (user: UserRow) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    const result = await dxConfirm(
      `Are you sure you want to ${action} ${user.email}?`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
    );
    if (!result) return;

    try {
      if (user.is_active) {
        await deactivateUser(user.user_id);
      } else {
        await reactivateUser(user.user_id);
      }
      await fetchUsers();
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  const onExporting = (e: { component: { beginUpdate: () => void; endUpdate: () => void } }) => {
    e.component.beginUpdate();
    e.component.endUpdate();
  };

  // Department management handlers
  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || !tenantId) return;
    setAddingDept(true);
    try {
      const currentConfig = departmentEnumOptions;
      const newValue = newDeptName.trim().toLowerCase().replace(/\s+/g, '_');
      const newItem = { value: newValue, label: newDeptName.trim(), color: '#64748b' };

      // Check if already exists
      if (currentConfig.some((o) => o.value === newValue)) {
        return;
      }

      const updatedConfig = [...currentConfig, newItem];

      const { error } = await supabase
        .from('tenant_enum_config')
        .upsert({
          tenant_id: tenantId,
          category: 'department',
          options: updatedConfig,
        }, { onConflict: 'tenant_id,category' });

      if (error) throw error;
      setNewDeptName('');
      await loadEnumConfigs(tenantId);
    } catch (err) {
      console.error('Failed to add department:', err);
    } finally {
      setAddingDept(false);
    }
  };

  const handleDeleteDepartment = async (value: string) => {
    if (!tenantId) return;
    const result = await dxConfirm(
      'Are you sure you want to delete this department?',
      'Delete Department',
    );
    if (!result) return;

    try {
      const updatedConfig = departmentEnumOptions.filter((o) => o.value !== value);
      const { error } = await supabase
        .from('tenant_enum_config')
        .upsert({
          tenant_id: tenantId,
          category: 'department',
          options: updatedConfig,
        }, { onConflict: 'tenant_id,category' });

      if (error) throw error;
      await loadEnumConfigs(tenantId);
    } catch (err) {
      console.error('Failed to delete department:', err);
    }
  };

  // Potential managers for org chart (exclude self)
  const managerOptions = users
    .filter((u) => u.user_id !== editUser?.user_id && u.employment_status === 'active')
    .map((u) => ({ value: u.user_id, label: u.full_name || u.email }));

  // Handle row selection for detail panel
  const handleSelectionChanged = useCallback((e: { selectedRowsData: UserRow[] }) => {
    if (e.selectedRowsData.length > 0) {
      setSelectedUser(e.selectedRowsData[0]);
    }
  }, []);

  // Get manager name for detail panel
  const getManagerName = useCallback((managerId: string | null) => {
    if (!managerId) return null;
    const manager = users.find((u) => u.id === managerId);
    return manager?.full_name || manager?.email || null;
  }, [users]);

  // Render Detail Panel for selected user
  const renderDetailPanel = () => {
    if (!selectedUser) {
      return (
        <div className="detail-panel-empty">
          <i className="dx-icon-user" />
          <h4>Select a user</h4>
          <p>Click on a row to view details</p>
        </div>
      );
    }

    const statusLabels: Record<EmploymentStatus, string> = {
      active: 'Active',
      on_leave: 'On Leave',
      terminated: 'Terminated',
    };

    return (
      <div className="detail-panel-content">
        {/* Header with avatar and basic info */}
        <div className="detail-panel-header">
          <div className="detail-avatar-large">
            {selectedUser.avatar_url ? (
              <img src={selectedUser.avatar_url} alt="" className="detail-avatar-img" />
            ) : (
              <span className="detail-avatar-initials">
                {getInitials(selectedUser.full_name, selectedUser.email)}
              </span>
            )}
          </div>
          <div className="detail-header-info">
            <h3 className="detail-name">{selectedUser.full_name || selectedUser.email}</h3>
            <p className="detail-position">{selectedUser.position || 'No position'}</p>
            <div className="detail-badges">
              <span className={`role-badge role-${selectedUser.role}`}>{selectedUser.role}</span>
              <span className={`status-badge status-${selectedUser.employment_status || 'active'}`}>
                {statusLabels[selectedUser.employment_status] || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="detail-actions">
          <Button
            text="Edit"
            icon="edit"
            stylingMode="contained"
            type="default"
            onClick={() => openEditPopup(selectedUser)}
          />
          <Button
            text="Send Email"
            icon="email"
            stylingMode="outlined"
            onClick={() => handlePasswordReset()}
          />
          {selectedUser.user_id !== currentUserId && (
            <Button
              text={selectedUser.is_active ? 'Deactivate' : 'Reactivate'}
              icon={selectedUser.is_active ? 'remove' : 'revert'}
              stylingMode="outlined"
              onClick={() => handleToggleActive(selectedUser)}
            />
          )}
        </div>

        {/* Contact Info */}
        <div className="detail-section">
          <h4 className="detail-section-title">
            <i className="dx-icon-tel" /> Contact
          </h4>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{selectedUser.email}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{selectedUser.phone || '-'}</span>
            </div>
          </div>
        </div>

        {/* Organization Info */}
        <div className="detail-section">
          <h4 className="detail-section-title">
            <i className="dx-icon-hierarchy" /> Organization
          </h4>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <span className="detail-label">Department</span>
              <span className="detail-value">{selectedUser.department || '-'}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">Manager</span>
              <span className="detail-value">{getManagerName(selectedUser.manager_id) || '-'}</span>
            </div>
          </div>
        </div>

        {/* Address Info */}
        <div className="detail-section">
          <h4 className="detail-section-title">
            <i className="dx-icon-map" /> Address
          </h4>
          <div className="detail-info-grid">
            <div className="detail-info-item full-width">
              <span className="detail-label">Address</span>
              <span className="detail-value">{selectedUser.address || '-'}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">City</span>
              <span className="detail-value">{selectedUser.city || '-'}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">State</span>
              <span className="detail-value">{selectedUser.state || '-'}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">Country</span>
              <span className="detail-value">{selectedUser.country || '-'}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">Zip Code</span>
              <span className="detail-value">{selectedUser.zip_code || '-'}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {selectedUser.bio && (
          <div className="detail-section">
            <h4 className="detail-section-title">
              <i className="dx-icon-comment" /> Bio
            </h4>
            <p className="detail-bio">{selectedUser.bio}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="detail-section detail-meta">
          <div className="detail-meta-item">
            <span className="detail-label">Last Login</span>
            <span className="detail-value">
              {selectedUser.last_login_at
                ? new Date(selectedUser.last_login_at).toLocaleString()
                : 'Never'}
            </span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-label">Created</span>
            <span className="detail-value">
              {new Date(selectedUser.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render DataGrid for user lists
  const renderUserGrid = (dataSource: UserRow[], showStatusColumn = true) => (
    <div className="users-grid-wrapper">
      <DataGrid
        dataSource={dataSource}
        noDataText={loading ? 'Loading...' : 'No users found'}
        keyExpr="id"
        height="100%"
        showBorders={true}
        showRowLines={DEFAULT_GRID_SETTINGS.showRowLines ?? true}
        showColumnLines={DEFAULT_GRID_SETTINGS.showColumnLines ?? false}
        rowAlternationEnabled={DEFAULT_GRID_SETTINGS.rowAlternationEnabled ?? true}
        wordWrapEnabled={DEFAULT_GRID_SETTINGS.wordWrapEnabled ?? false}
        hoverStateEnabled={true}
        columnAutoWidth={true}
        onExporting={onExporting}
        onSelectionChanged={handleSelectionChanged}
        focusedRowEnabled={true}
        selectedRowKeys={selectedUser ? [selectedUser.id] : []}
      >
        <Selection mode="single" />
        <FilterRow visible={DEFAULT_GRID_SETTINGS.showFilterRow ?? true} />
        <HeaderFilter visible={DEFAULT_GRID_SETTINGS.showHeaderFilter ?? true} />
        <SearchPanel visible={true} width={240} placeholder="Search users..." />
        <Export enabled={true} allowExportSelectedData={true} />

        <Toolbar>
          <Item name="searchPanel" />
          {isAdmin && activeTab === 'directory' && (
            <Item
              widget="dxButton"
              options={{
                icon: 'add',
                text: 'Add User',
                type: 'default',
                stylingMode: 'contained',
                onClick: openAddUserPopup,
              }}
            />
          )}
          <Item name="exportButton" />
        </Toolbar>

        <Column
          caption=""
          width={50}
          allowFiltering={false}
          allowSorting={false}
          cellRender={(data: { data: UserRow }) => (
            <div className="user-avatar-cell">
              {data.data.avatar_url ? (
                <img src={data.data.avatar_url} alt="" className="user-avatar-img" />
              ) : (
                <span className="user-avatar-placeholder">
                  {getInitials(data.data.full_name, data.data.email)}
                </span>
              )}
            </div>
          )}
        />

        <Column dataField="full_name" caption="Name" width={80} />
        <Column dataField="department" caption="Department" width={120} />

        <Column
          dataField="role"
          caption="Role"
          width={90}
          cellRender={(data: { value: string }) => (
            <span className={`role-badge role-${data.value}`}>{data.value}</span>
          )}
        />

        <Column dataField="position" caption="Position" width={80} />
        <Column dataField="email" caption="Email" width={120} />

        <Column
          type="buttons"
          width={80}
          caption="Actions"
          cellRender={(cell: { data: UserRow }) => (
            <div className="action-buttons">
              <Button icon="edit" stylingMode="text" hint="Edit" onClick={() => openEditPopup(cell.data)} />
              {activeTab === 'directory' && (
                <Button
                  icon={cell.data.is_active ? 'remove' : 'revert'}
                  stylingMode="text"
                  hint={cell.data.is_active ? 'Deactivate' : 'Reactivate'}
                  onClick={() => handleToggleActive(cell.data)}
                  disabled={cell.data.user_id === currentUserId}
                />
              )}
            </div>
          )}
        />

        <Pager visible={true} showPageSizeSelector={true} allowedPageSizes={[10, 25, 50]} showInfo={true} />
        <Paging defaultPageSize={10} />
      </DataGrid>
    </div>
  );

  // Render org chart using TreeList
  const renderOrgChart = () => {
    // Build tree data with parent relationship
    // Note: manager_id references profiles.id, so we use profiles.id as the key
    const treeData = users
      .filter((u) => u.employment_status === 'active')
      .map((u) => ({
        id: u.id,  // profiles.id (primary key)
        parentId: u.manager_id,  // references profiles.id
        userId: u.user_id,
        email: u.email,
        fullName: u.full_name,
        department: u.department,
        position: u.position,
        avatarUrl: u.avatar_url,
      }));

    return (
      <div className="org-chart-wrapper">
        <TreeList
          dataSource={treeData}
          keyExpr="id"
          parentIdExpr="parentId"
          height="100%"
          showBorders={true}
          showRowLines={true}
          columnAutoWidth={true}
          expandNodesOnFiltering={true}
          defaultExpandedRowKeys={treeData.map((d) => d.id)}
        >
          <TreeColumn
            dataField="fullName"
            caption="Name"
            width={250}
            cellRender={(data: { data: { fullName: string | null; email: string; avatarUrl: string | null } }) => (
              <div className="org-chart-name-cell">
                {data.data.avatarUrl ? (
                  <img src={data.data.avatarUrl} alt="" className="org-chart-avatar" />
                ) : (
                  <span className="org-chart-avatar-placeholder">
                    {getInitials(data.data.fullName, data.data.email)}
                  </span>
                )}
                <span>{data.data.fullName || data.data.email}</span>
              </div>
            )}
          />
          <TreeColumn dataField="position" caption="Position" width={180} />
          <TreeColumn dataField="department" caption="Department" width={150} />
          <TreeColumn dataField="email" caption="Email" width={220} />
        </TreeList>
      </div>
    );
  };

  // Render departments tab
  const renderDepartmentsTab = () => (
    <div className="departments-tab-content">
      <div className="admin-card-box">
        <div className="admin-card-box-header">
          <h4>Department List</h4>
        </div>

        <div className="dept-add-form">
          <TextBox
            value={newDeptName}
            onValueChanged={(e) => setNewDeptName(e.value)}
            placeholder="New department name"
            stylingMode="outlined"
            width={300}
          />
          <Button
            text={addingDept ? 'Adding...' : 'Add Department'}
            icon="add"
            type="default"
            stylingMode="contained"
            onClick={handleAddDepartment}
            disabled={addingDept || !newDeptName.trim()}
          />
        </div>

        <div className="admin-list-table">
          <div className="admin-list-header">
            <span className="dept-name-col">Department Name</span>
            <span className="dept-count-col">Members</span>
            <span className="dept-actions-col">Actions</span>
          </div>
          {departmentEnumOptions.length === 0 ? (
            <div className="admin-list-row">
              <span className="dept-empty-text">No departments defined</span>
            </div>
          ) : (
            departmentEnumOptions.map((dept) => {
              const memberCount = users.filter((u) => u.department === dept.label).length;
              return (
                <div key={dept.value} className="admin-list-row">
                  <span className="dept-name-col">{dept.label}</span>
                  <span className="dept-count-col">{memberCount}</span>
                  <span className="dept-actions-col">
                    <Button
                      icon="trash"
                      stylingMode="text"
                      hint="Delete"
                      onClick={() => handleDeleteDepartment(dept.value)}
                    />
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // Render settings tab
  const renderSettingsTab = () => (
    <div className="settings-tab-content">
      <div className="admin-card-box">
        <div className="admin-card-box-header">
          <h4>User Default Settings</h4>
        </div>
        <p className="admin-card-box-hint">
          Configure default values for new users in your organization.
        </p>

        <div className="admin-form-field">
          <label>Default Role for New Users</label>
          <SelectBox
            dataSource={roleOptions}
            displayExpr="label"
            valueExpr="value"
            value="member"
            stylingMode="outlined"
            width={200}
            disabled={true}
          />
          <div className="admin-form-hint">
            New users are assigned the "Member" role by default.
          </div>
        </div>
      </div>

      <div className="admin-card-box">
        <div className="admin-card-box-header">
          <h4>Employment Status</h4>
        </div>
        <p className="admin-card-box-hint">
          Manage how employment statuses are used in your organization.
        </p>

        <div className="admin-settings-grid">
          <div className="admin-settings-item">
            <span className="status-badge status-active">Active</span>
            <span>Currently employed</span>
          </div>
          <div className="admin-settings-item">
            <span className="status-badge status-on_leave">On Leave</span>
            <span>Temporary leave (maternity, medical, etc.)</span>
          </div>
          <div className="admin-settings-item">
            <span className="status-badge status-terminated">Terminated</span>
            <span>No longer with the organization</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'directory':
        return (
          <div className="users-split-layout">
            <div className="users-grid-panel">
              {renderUserGrid(users)}
            </div>
            <div className="users-detail-panel">
              {renderDetailPanel()}
            </div>
          </div>
        );
      case 'departments':
        return renderDepartmentsTab();
      case 'orgchart':
        return renderOrgChart();
      case 'active':
        return renderUserGrid(getFilteredUsers('active'), false);
      case 'onleave':
        return renderUserGrid(getFilteredUsers('on_leave'), false);
      case 'terminated':
        return renderUserGrid(getFilteredUsers('terminated'), false);
      case 'settings':
        return renderSettingsTab();
      default:
        return renderUserGrid(users);
    }
  };

  return (
    <div className="users-section admin-section-layout">
      {/* Sidebar */}
      <div className="admin-section-sidebar">
        {TABS.map((tab) => (
          <div
            key={tab.key}
            className={`admin-section-sidebar-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="admin-section-main">
        {/* Sticky Header */}
        <div className="admin-section-header">
          <div className="admin-section-header-info">
            <h3>{TABS.find((t) => t.key === activeTab)?.label}</h3>
            <p className="admin-section-header-desc">{TAB_DESCRIPTIONS[activeTab]}</p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="users-tab-content">{renderTabContent()}</div>
      </div>

      {/* Add User Popup */}
      <Popup
        visible={addUserOpen}
        onHiding={closeAddUserPopup}
        title="Add User"
        showCloseButton={true}
        width={420}
        height="auto"
        maxHeight="80vh"
      >
        <div className="user-edit-form">
          <div className="form-field">
            <label>Email *</label>
            <TextBox value={addEmail} onValueChanged={(e) => setAddEmail(e.value)} placeholder="user@example.com" stylingMode="outlined" mode="email" />
          </div>
          <div className="form-field">
            <label>Full Name</label>
            <TextBox value={addFullName} onValueChanged={(e) => setAddFullName(e.value)} placeholder="Enter full name" stylingMode="outlined" />
          </div>
          <div className="form-field">
            <label>Role</label>
            <SelectBox dataSource={roleOptions} displayExpr="label" valueExpr="value" value={addRole} onValueChanged={(e) => setAddRole(e.value)} stylingMode="outlined" />
          </div>
          <div className="add-user-note">A password setup email will be sent to the user after creation.</div>
          {addError && <div className="form-error">{addError}</div>}
          <div className="form-actions">
            <Button text="Cancel" stylingMode="outlined" onClick={closeAddUserPopup} />
            <Button text={addSaving ? 'Creating...' : 'Create User'} type="default" stylingMode="contained" onClick={handleCreateUser} disabled={addSaving} />
          </div>
        </div>
      </Popup>

      {/* Edit User Popup */}
      {editUser && (
        <Popup
          visible={true}
          onHiding={closeEditPopup}
          title={`Edit User — ${editUser.email}`}
          showCloseButton={true}
          width={560}
          height="auto"
          maxHeight="90vh"
        >
          <div className="user-edit-form">
            <div className="avatar-section">
              <div className="avatar-preview-wrap">
                {editAvatarUrl ? (
                  <img src={editAvatarUrl} alt="" className="avatar-preview" />
                ) : (
                  <span className="avatar-placeholder">
                    {getInitials(editFullName || editUser.full_name, editUser.email)}
                  </span>
                )}
              </div>
              <div className="avatar-actions">
                <Button text="Upload Photo" icon="image" stylingMode="outlined" onClick={() => fileInputRef.current?.click()} />
                {editAvatarUrl && <Button text="Remove" icon="trash" stylingMode="text" onClick={handleAvatarRemove} />}
                <input ref={fileInputRef} type="file" accept="image/*" className="avatar-file-input" onChange={handleAvatarUpload} aria-label="Upload avatar image" />
              </div>
            </div>

            <div className="form-divider" />

            <div className="form-field">
              <label>Full Name</label>
              <TextBox value={editFullName} onValueChanged={(e) => setEditFullName(e.value)} placeholder="Enter full name" stylingMode="outlined" />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Role</label>
                <SelectBox dataSource={roleOptions} displayExpr="label" valueExpr="value" value={editRole} onValueChanged={(e) => setEditRole(e.value)} stylingMode="outlined" disabled={!isAdmin} />
              </div>
              <div className="form-field">
                <label>Employment Status</label>
                <SelectBox
                  dataSource={employmentStatusOptions}
                  displayExpr="label"
                  valueExpr="value"
                  value={editEmploymentStatus}
                  onValueChanged={(e) => setEditEmploymentStatus(e.value)}
                  stylingMode="outlined"
                  disabled={!isAdmin || isSelf}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Manager</label>
                <SelectBox
                  dataSource={[{ value: null, label: '(No Manager)' }, ...managerOptions]}
                  displayExpr="label"
                  valueExpr="value"
                  value={editManagerId}
                  onValueChanged={(e) => setEditManagerId(e.value)}
                  stylingMode="outlined"
                  disabled={!isAdmin}
                  searchEnabled={true}
                />
              </div>
              <div className="form-field">
                <label>Department</label>
                <SelectBox
                  items={departmentOptions}
                  value={editDepartment}
                  onValueChanged={(e) => setEditDepartment(e.value)}
                  stylingMode="outlined"
                  acceptCustomValue={true}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Position</label>
                <TextBox value={editPosition} onValueChanged={(e) => setEditPosition(e.value)} placeholder="e.g. Project Manager" stylingMode="outlined" />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <TextBox value={editPhone} onValueChanged={(e) => setEditPhone(e.value)} placeholder="010-1234-5678" stylingMode="outlined" />
              </div>
            </div>

            <div className="form-field">
              <label>Bio</label>
              <TextBox value={editBio} onValueChanged={(e) => setEditBio(e.value)} placeholder="Short introduction..." stylingMode="outlined" />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Country</label>
                <TextBox value={editCountry} onValueChanged={(e) => setEditCountry(e.value)} stylingMode="outlined" />
              </div>
              <div className="form-field">
                <label>City</label>
                <TextBox value={editCity} onValueChanged={(e) => setEditCity(e.value)} stylingMode="outlined" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>State / Province</label>
                <TextBox value={editState} onValueChanged={(e) => setEditState(e.value)} stylingMode="outlined" />
              </div>
              <div className="form-field">
                <label>Zip Code</label>
                <TextBox value={editZipCode} onValueChanged={(e) => setEditZipCode(e.value)} stylingMode="outlined" />
              </div>
            </div>

            <div className="form-field">
              <label>Address</label>
              <TextBox value={editAddress} onValueChanged={(e) => setEditAddress(e.value)} stylingMode="outlined" />
            </div>

            <div className="form-divider" />

            <div className="password-section">
              <label className="section-label">Password</label>
              {isSelf ? (
                <div className="password-self">
                  <TextBox value={newPassword} onValueChanged={(e) => setNewPassword(e.value)} placeholder="New password (min 6 chars)" mode="password" stylingMode="outlined" />
                  <Button text="Change Password" stylingMode="outlined" onClick={handlePasswordChange} disabled={!newPassword} />
                </div>
              ) : (
                <Button text="Send Password Reset Email" icon="email" stylingMode="outlined" onClick={handlePasswordReset} />
              )}
            </div>

            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            <div className="form-actions">
              <Button text="Cancel" stylingMode="outlined" onClick={closeEditPopup} />
              <Button text={saving ? 'Saving...' : 'Save Changes'} type="default" stylingMode="contained" onClick={handleSave} disabled={saving} />
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}
