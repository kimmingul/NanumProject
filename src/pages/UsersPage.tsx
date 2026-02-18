import { type ReactNode, useEffect, useState } from 'react';
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
import { Button } from 'devextreme-react/button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import './UsersPage.css';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function UsersPage(): ReactNode {
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, last_login_at, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error('Failed to load users:', error);
        } else {
          setUsers(data as UserRow[]);
        }
        setLoading(false);
      }
    };

    fetchUsers();
    return () => { cancelled = true; };
  }, [tenantId]);

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
            cellRender={() => (
              <div className="action-buttons">
                <Button icon="edit" stylingMode="text" hint="Edit" />
                <Button icon="trash" stylingMode="text" hint="Delete" />
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
    </div>
  );
}
