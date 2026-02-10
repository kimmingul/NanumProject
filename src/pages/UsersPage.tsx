import { type ReactNode } from 'react';
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
import './UsersPage.css';

// Sample data - will be replaced with real data from Supabase
const sampleUsers = [
  {
    id: '1',
    email: 'admin@nanumauth.com',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true,
    last_login_at: new Date(),
    created_at: new Date(),
  },
];

export default function UsersPage(): ReactNode {
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
          dataSource={sampleUsers}
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
                <button className="action-icon" title="Edit">
                  <i className="dx-icon-edit"></i>
                </button>
                <button className="action-icon" title="Delete">
                  <i className="dx-icon-trash"></i>
                </button>
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
