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
import { useAuditLog } from '@/hooks/useAuditLog';
import { DEFAULT_GRID_SETTINGS } from '@/lib/view-config-store';
import './AuditLogPage.css';

function getActionClass(action: string): string {
  if (action.includes('created') || action.includes('create')) return 'action-created';
  if (action.includes('updated') || action.includes('update')) return 'action-updated';
  if (action.includes('deleted') || action.includes('delete')) return 'action-deleted';
  return '';
}

function summarizeMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '-';
  const keys = Object.keys(metadata);
  if (keys.length === 0) return '-';
  const entries = keys.slice(0, 3).map((k) => `${k}: ${JSON.stringify(metadata[k])}`);
  return entries.join(', ') + (keys.length > 3 ? ', ...' : '');
}

export default function AuditLogPage(): ReactNode {
  const { logs, loading, error } = useAuditLog();

  if (error) {
    return (
      <div className="audit-log-page">
        <div className="page-header">
          <h1>Audit Logs</h1>
          <p>View system audit trail</p>
        </div>
        <div className="error-container">
          <p>Failed to load audit logs: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-log-page">
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>View system audit trail</p>
      </div>

      <div className="audit-log-grid-container">
        <DataGrid
          dataSource={logs}
          keyExpr="id"
          showBorders={true}
          showRowLines={DEFAULT_GRID_SETTINGS.showRowLines ?? true}
          showColumnLines={DEFAULT_GRID_SETTINGS.showColumnLines ?? false}
          rowAlternationEnabled={DEFAULT_GRID_SETTINGS.rowAlternationEnabled ?? true}
          wordWrapEnabled={DEFAULT_GRID_SETTINGS.wordWrapEnabled ?? false}
          hoverStateEnabled={true}
          columnAutoWidth={true}
          loadPanel={{ enabled: loading }}
          noDataText={loading ? 'Loading...' : 'No audit logs found'}
        >
          <FilterRow visible={DEFAULT_GRID_SETTINGS.showFilterRow ?? true} />
          <HeaderFilter visible={DEFAULT_GRID_SETTINGS.showHeaderFilter ?? true} />
          <SearchPanel visible={true} width={240} placeholder="Search audit logs..." />
          <Export enabled={true} allowExportSelectedData={true} />

          <Toolbar>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column
            dataField="created_at"
            caption="Date"
            dataType="datetime"
            width={180}
            sortOrder="desc"
          />

          <Column
            dataField="user_email"
            caption="User"
            width={220}
          />

          <Column
            dataField="action"
            caption="Action"
            width={140}
            cellRender={(data: { value: string }) => (
              <span className={`action-badge ${getActionClass(data.value)}`}>
                {data.value}
              </span>
            )}
          />

          <Column
            dataField="resource_type"
            caption="Resource Type"
            width={150}
            cellRender={(data: { value: string }) => (
              <span className="resource-type-badge">
                {data.value}
              </span>
            )}
          />

          <Column
            dataField="resource_id"
            caption="Resource ID"
            width={130}
            cellRender={(data: { value: string | null }) => (
              <span title={data.value ?? ''}>
                {data.value ? data.value.substring(0, 8) + '...' : '-'}
              </span>
            )}
          />

          <Column
            dataField="metadata"
            caption="Details"
            cellRender={(data: { value: Record<string, unknown> | null }) => (
              <span className="metadata-cell" title={JSON.stringify(data.value)}>
                {summarizeMetadata(data.value)}
              </span>
            )}
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
  );
}
