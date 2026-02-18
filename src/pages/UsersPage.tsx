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
} from 'devextreme-react/data-grid';
import { Popup } from 'devextreme-react/popup';
import { TextBox } from 'devextreme-react/text-box';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import { confirm as dxConfirm } from 'devextreme/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import type { UserRole } from '@/types';
import './UsersPage.css';

interface UserRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

const statusOptions = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
];

export default function UsersPage(): ReactNode {
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
  } = useUserManagement();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit popup state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, email, full_name, avatar_url, role, is_active, last_login_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load users:', error);
    } else {
      setUsers(data as UserRow[]);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEditPopup = (user: UserRow) => {
    setEditUser(user);
    setEditFullName(user.full_name || '');
    setEditRole(user.role as UserRole);
    setEditIsActive(user.is_active);
    setEditAvatarUrl(user.avatar_url);
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

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setFormError('');
    try {
      const updates: { full_name?: string; role?: string } = {};
      if (editFullName !== (editUser.full_name || '')) {
        updates.full_name = editFullName;
      }
      if (editRole !== editUser.role && isAdmin) {
        updates.role = editRole;
      }
      if (Object.keys(updates).length > 0) {
        await updateProfile(editUser.user_id, updates);
      }

      // Handle status change (deactivate/reactivate)
      if (editIsActive !== editUser.is_active && isAdmin) {
        if (editIsActive) {
          await reactivateUser(editUser.user_id);
        } else {
          await deactivateUser(editUser.user_id);
        }
      }

      // Sync auth-store if editing self
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
    // Reset file input
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

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage users within your tenant</p>
      </div>

      <div className="users-grid-container">
        <DataGrid
          dataSource={users}
          noDataText={loading ? 'Loading...' : 'No users found'}
          keyExpr="id"
          showBorders={true}
          showRowLines={true}
          showColumnLines={false}
          rowAlternationEnabled={true}
          hoverStateEnabled={true}
          columnAutoWidth={true}
          onExporting={onExporting}
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} width={240} placeholder="Search users..." />
          <Export enabled={true} allowExportSelectedData={true} />

          <Toolbar>
            <Item name="searchPanel" />
            <Item
              widget="dxButton"
              options={{
                icon: 'add',
                text: 'Add User',
                type: 'default',
                stylingMode: 'contained',
                onClick: () => alert('Add User - Coming soon!'),
              }}
            />
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

          <Column
            dataField="email"
            caption="Email"
            width={250}
          />

          <Column
            dataField="full_name"
            caption="Full Name"
            width={200}
          />

          <Column
            dataField="role"
            caption="Role"
            width={120}
            cellRender={(data: { value: string }) => (
              <span className={`role-badge role-${data.value}`}>
                {data.value}
              </span>
            )}
          />

          <Column
            dataField="is_active"
            caption="Status"
            width={100}
            cellRender={(data: { value: boolean }) => (
              <span className={`status-badge ${data.value ? 'active' : 'inactive'}`}>
                {data.value ? 'Active' : 'Inactive'}
              </span>
            )}
          />

          <Column
            dataField="last_login_at"
            caption="Last Login"
            dataType="datetime"
            width={180}
          />

          <Column
            dataField="created_at"
            caption="Created"
            dataType="datetime"
            width={180}
          />

          <Column
            type="buttons"
            width={110}
            caption="Actions"
            cellRender={(cell: { data: UserRow }) => (
              <div className="action-buttons">
                <Button
                  icon="edit"
                  stylingMode="text"
                  hint="Edit"
                  onClick={() => openEditPopup(cell.data)}
                />
                <Button
                  icon={cell.data.is_active ? 'remove' : 'revert'}
                  stylingMode="text"
                  hint={cell.data.is_active ? 'Deactivate' : 'Reactivate'}
                  onClick={() => handleToggleActive(cell.data)}
                  disabled={cell.data.user_id === currentUserId}
                />
              </div>
            )}
          />

          <Pager
            visible={true}
            showPageSizeSelector={true}
            allowedPageSizes={[10, 25, 50, 100]}
            showInfo={true}
          />
          <Paging defaultPageSize={10} />
        </DataGrid>
      </div>

      {/* Edit User Popup */}
      {editUser && (
      <Popup
        visible={true}
        onHiding={closeEditPopup}
        title={`Edit User — ${editUser.email}`}
        showCloseButton={true}
        width={480}
        height="auto"
        maxHeight="80vh"
      >
          <div className="user-edit-form">
            {/* Avatar Section */}
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
                <Button
                  text="Upload Photo"
                  icon="image"
                  stylingMode="outlined"
                  onClick={() => fileInputRef.current?.click()}
                />
                {editAvatarUrl && (
                  <Button
                    text="Remove"
                    icon="trash"
                    stylingMode="text"
                    onClick={handleAvatarRemove}
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            <div className="form-divider" />

            {/* Profile Fields */}
            <div className="form-field">
              <label>Full Name</label>
              <TextBox
                value={editFullName}
                onValueChanged={(e) => setEditFullName(e.value)}
                placeholder="Enter full name"
                stylingMode="outlined"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Role</label>
                <SelectBox
                  dataSource={roleOptions}
                  displayExpr="label"
                  valueExpr="value"
                  value={editRole}
                  onValueChanged={(e) => setEditRole(e.value)}
                  stylingMode="outlined"
                  disabled={!isAdmin}
                />
              </div>
              <div className="form-field">
                <label>Status</label>
                <SelectBox
                  dataSource={statusOptions}
                  displayExpr="label"
                  valueExpr="value"
                  value={editIsActive}
                  onValueChanged={(e) => setEditIsActive(e.value)}
                  stylingMode="outlined"
                  disabled={!isAdmin || isSelf}
                />
              </div>
            </div>

            <div className="form-divider" />

            {/* Password Section */}
            <div className="password-section">
              <label className="section-label">Password</label>
              {isSelf ? (
                <div className="password-self">
                  <TextBox
                    value={newPassword}
                    onValueChanged={(e) => setNewPassword(e.value)}
                    placeholder="New password (min 6 chars)"
                    mode="password"
                    stylingMode="outlined"
                  />
                  <Button
                    text="Change Password"
                    stylingMode="outlined"
                    onClick={handlePasswordChange}
                    disabled={!newPassword}
                  />
                </div>
              ) : (
                <Button
                  text="Send Password Reset Email"
                  icon="email"
                  stylingMode="outlined"
                  onClick={handlePasswordReset}
                />
              )}
            </div>

            {/* Error / Success */}
            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            {/* Actions */}
            <div className="form-actions">
              <Button
                text="Cancel"
                stylingMode="outlined"
                onClick={closeEditPopup}
              />
              <Button
                text={saving ? 'Saving...' : 'Save Changes'}
                type="default"
                stylingMode="contained"
                onClick={handleSave}
                disabled={saving}
              />
            </div>
          </div>
      </Popup>
      )}
    </div>
  );
}
