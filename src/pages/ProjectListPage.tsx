import { type ReactNode } from 'react';
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
import { PMLayout } from '@/components/PMLayout';
import { useProjects } from '@/hooks';
import './ProjectListPage.css';

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  complete: 'Complete',
  archived: 'Archived',
};

export default function ProjectListPage(): ReactNode {
  const navigate = useNavigate();
  const { projects, loading, error } = useProjects();

  return (
    <PMLayout breadcrumbs={[{ label: 'Projects' }]}>
      <div className="project-list-page">
        <div className="page-header">
          <h2>Projects</h2>
          <p>Manage your project portfolio</p>
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
            noDataText={loading ? 'Loading projects...' : 'No projects found'}
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
              sortOrder="desc"
              sortIndex={0}
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
      </div>
    </PMLayout>
  );
}
