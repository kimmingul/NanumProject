import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { DataGrid, Column, Paging, Pager, FilterRow, HeaderFilter, SearchPanel, Selection } from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import { SelectBox } from 'devextreme-react/select-box';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { DEFAULT_GRID_SETTINGS } from '@/lib/view-config-store';
import type { EmploymentStatus } from '@/types';
import './UsersPage.css';

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

const statusFilterOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];

export default function UsersPage(): ReactNode {
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, email, full_name, avatar_url, role, is_active, employment_status, department_id, manager_id, last_login_at, created_at, phone, department, position, bio, address, city, state, country, zip_code')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true });

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

  // Filter users by employment status
  const filteredUsers = statusFilter === 'all'
    ? users
    : users.filter((u) => u.employment_status === statusFilter);

  const handleSelectionChanged = useCallback((e: { selectedRowsData: UserRow[] }) => {
    if (e.selectedRowsData.length > 0) {
      setSelectedUser(e.selectedRowsData[0]);
    }
  }, []);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
        : name.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const getManagerName = useCallback((managerId: string | null) => {
    if (!managerId) return null;
    const manager = users.find((u) => u.id === managerId);
    return manager?.full_name || manager?.email || null;
  }, [users]);

  const statusLabels: Record<EmploymentStatus, string> = {
    active: 'Active',
    on_leave: 'On Leave',
    terminated: 'Terminated',
  };

  const renderDetailPanel = () => {
    if (!selectedUser) {
      return (
        <div className="users-detail-empty">
          <i className="dx-icon-user" />
          <h4>Select a user</h4>
          <p>Click on a row to view details</p>
        </div>
      );
    }

    return (
      <div className="users-detail-content">
        {/* Header */}
        <div className="users-detail-header">
          <div className="users-detail-avatar">
            {selectedUser.avatar_url ? (
              <img src={selectedUser.avatar_url} alt="" />
            ) : (
              <span className="users-detail-initials">
                {getInitials(selectedUser.full_name, selectedUser.email)}
              </span>
            )}
          </div>
          <div className="users-detail-info">
            <h3 className="users-detail-name">{selectedUser.full_name || selectedUser.email}</h3>
            <p className="users-detail-position">{selectedUser.position || 'No position'}</p>
            <div className="users-detail-badges">
              <span className={`role-badge role-${selectedUser.role}`}>{selectedUser.role}</span>
              <span className={`status-badge status-${selectedUser.employment_status || 'active'}`}>
                {statusLabels[selectedUser.employment_status] || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="users-detail-section">
          <h4 className="users-detail-section-title">
            <i className="dx-icon-tel" /> Contact
          </h4>
          <div className="users-detail-grid">
            <div className="users-detail-item">
              <span className="users-detail-label">Email</span>
              <span className="users-detail-value">{selectedUser.email}</span>
            </div>
            <div className="users-detail-item">
              <span className="users-detail-label">Phone</span>
              <span className="users-detail-value">{selectedUser.phone || '-'}</span>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="users-detail-section">
          <h4 className="users-detail-section-title">
            <i className="dx-icon-hierarchy" /> Organization
          </h4>
          <div className="users-detail-grid">
            <div className="users-detail-item">
              <span className="users-detail-label">Department</span>
              <span className="users-detail-value">{selectedUser.department || '-'}</span>
            </div>
            <div className="users-detail-item">
              <span className="users-detail-label">Manager</span>
              <span className="users-detail-value">{getManagerName(selectedUser.manager_id) || '-'}</span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="users-detail-section">
          <h4 className="users-detail-section-title">
            <i className="dx-icon-map" /> Address
          </h4>
          <div className="users-detail-grid">
            <div className="users-detail-item full-width">
              <span className="users-detail-label">Address</span>
              <span className="users-detail-value">{selectedUser.address || '-'}</span>
            </div>
            <div className="users-detail-item">
              <span className="users-detail-label">City</span>
              <span className="users-detail-value">{selectedUser.city || '-'}</span>
            </div>
            <div className="users-detail-item">
              <span className="users-detail-label">State</span>
              <span className="users-detail-value">{selectedUser.state || '-'}</span>
            </div>
            <div className="users-detail-item">
              <span className="users-detail-label">Country</span>
              <span className="users-detail-value">{selectedUser.country || '-'}</span>
            </div>
            <div className="users-detail-item">
              <span className="users-detail-label">Zip Code</span>
              <span className="users-detail-value">{selectedUser.zip_code || '-'}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {selectedUser.bio && (
          <div className="users-detail-section">
            <h4 className="users-detail-section-title">
              <i className="dx-icon-comment" /> Bio
            </h4>
            <p className="users-detail-bio">{selectedUser.bio}</p>
          </div>
        )}

        {/* Meta */}
        <div className="users-detail-section users-detail-meta">
          <div className="users-detail-meta-item">
            <span className="users-detail-label">Last Login</span>
            <span className="users-detail-value">
              {selectedUser.last_login_at
                ? new Date(selectedUser.last_login_at).toLocaleString()
                : 'Never'}
            </span>
          </div>
          <div className="users-detail-meta-item">
            <span className="users-detail-label">Created</span>
            <span className="users-detail-value">
              {new Date(selectedUser.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="users-page">
      {/* Header — my-tasks style */}
      <div className="users-page-header">
        <span className="users-page-header-title">TEAM</span>
        <span className="users-page-header-count">{loading ? '...' : filteredUsers.length}</span>
        <div className="users-page-header-spacer" />
        <SelectBox
          items={statusFilterOptions}
          displayExpr="label"
          valueExpr="value"
          value={statusFilter}
          onValueChanged={(e) => setStatusFilter(e.value)}
          width={130}
          stylingMode="outlined"
          className="users-page-header-select"
        />
        <Button
          icon="refresh"
          stylingMode="text"
          hint="Refresh"
          className="users-page-header-btn"
          onClick={fetchUsers}
        />
        <Button
          icon={detailPanelOpen ? 'chevrondoubleright' : 'chevrondoubleleft'}
          stylingMode="text"
          hint={detailPanelOpen ? 'Hide detail panel' : 'Show detail panel'}
          className="users-page-header-btn"
          onClick={() => setDetailPanelOpen(!detailPanelOpen)}
        />
      </div>

      {/* Split Layout */}
      <div className={`users-page-body ${detailPanelOpen ? '' : 'detail-collapsed'}`}>
        <div className="users-page-grid">
          <DataGrid
            dataSource={filteredUsers}
            noDataText={loading ? 'Loading...' : 'No users found'}
            keyExpr="id"
            width="100%"
            height="100%"
            showBorders={true}
            showRowLines={DEFAULT_GRID_SETTINGS.showRowLines ?? true}
            showColumnLines={DEFAULT_GRID_SETTINGS.showColumnLines ?? false}
            rowAlternationEnabled={DEFAULT_GRID_SETTINGS.rowAlternationEnabled ?? true}
            hoverStateEnabled={true}
            onSelectionChanged={handleSelectionChanged}
            focusedRowEnabled={true}
            selectedRowKeys={selectedUser ? [selectedUser.id] : []}
          >
            <Selection mode="single" />
            <FilterRow visible={DEFAULT_GRID_SETTINGS.showFilterRow ?? true} />
            <HeaderFilter visible={DEFAULT_GRID_SETTINGS.showHeaderFilter ?? true} />
            <SearchPanel visible={true} width={200} placeholder="Search..." />

            <Column
              caption=""
              width={50}
              allowFiltering={false}
              allowSorting={false}
              cellRender={(data: { data: UserRow }) => (
                <div className="users-avatar-cell">
                  {data.data.avatar_url ? (
                    <img src={data.data.avatar_url} alt="" className="users-avatar-img" />
                  ) : (
                    <span className="users-avatar-placeholder">
                      {getInitials(data.data.full_name, data.data.email)}
                    </span>
                  )}
                </div>
              )}
            />

            <Column dataField="full_name" caption="Name" width={140} />
            <Column dataField="phone" caption="Phone" width={120} />
            <Column dataField="email" caption="Email" width={180} />
            <Column dataField="department" caption="Department" width={100} />
            <Column dataField="position" caption="Position" width={120} />

            <Column
              dataField="role"
              caption="Role"
              width={85}
              cellRender={(data: { value: string }) => (
                <span className={`role-badge role-${data.value}`}>{data.value}</span>
              )}
            />

            <Column
              dataField="employment_status"
              caption="Status"
              width={90}
              cellRender={(data: { value: EmploymentStatus }) => (
                <span className={`status-badge status-${data.value || 'active'}`}>
                  {statusLabels[data.value] || 'Active'}
                </span>
              )}
            />

            <Pager visible={true} showPageSizeSelector={true} allowedPageSizes={[10, 25, 50]} showInfo={true} />
            <Paging defaultPageSize={25} />
          </DataGrid>
        </div>

        {detailPanelOpen && (
          <div className="users-page-detail">
            {renderDetailPanel()}
          </div>
        )}
      </div>
    </div>
  );
}
