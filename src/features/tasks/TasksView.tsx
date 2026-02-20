import { useCallback, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import TreeList, {
  Column,
  Editing,
  FilterRow,
  HeaderFilter,
  Selection,
} from 'devextreme-react/tree-list';
import type { TreeListRef } from 'devextreme-react/tree-list';
import { SelectBox } from 'devextreme-react/select-box';
import { Button } from 'devextreme-react/button';
import { Popup } from 'devextreme-react/popup';
import { DataGrid, Column as DGColumn } from 'devextreme-react/data-grid';
import { useProjectItems } from '@/hooks/useProjectItems';
import { useAuthStore } from '@/lib/auth-store';
import { usePMStore } from '@/lib/pm-store';
import { usePreferencesStore } from '@/lib/preferences-store';
import { getDxDateFormat } from '@/utils/formatDate';
import { supabase } from '@/lib/supabase';
import './TasksView.css';

interface TasksViewProps {
  projectId: string;
  addRowRef?: React.MutableRefObject<(() => void) | undefined>;
}

const itemTypeIcons: Record<string, string> = {
  group: 'folder',
  task: 'detailslayout',
  milestone: 'event',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function TasksView({ projectId, addRowRef }: TasksViewProps): ReactNode {
  const { items, resources, assignments, loading, error, refetch } = useProjectItems(projectId);
  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);
  const profile = useAuthStore((s) => s.profile);
  const dateFormat = usePreferencesStore((s) => s.preferences.dateFormat);
  const dxDateFmt = useMemo(() => getDxDateFormat(), [dateFormat]);
  const treeListRef = useRef<TreeListRef>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importData, setImportData] = useState<Array<{ name: string; item_type: string; start_date: string; end_date: string }>>([]);
  const [importing, setImporting] = useState(false);

  // Expose addRow to parent via ref
  useEffect(() => {
    if (addRowRef) {
      addRowRef.current = () => {
        treeListRef.current?.instance().addRow();
      };
    }
    return () => {
      if (addRowRef) addRowRef.current = undefined;
    };
  }, [addRowRef]);

  // Build a map of user_id → name for display
  const resourceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resources) {
      map.set(r.id, r.text);
    }
    return map;
  }, [resources]);

  // Enrich items with assignee names
  const enrichedItems = useMemo(
    () =>
      items.map((item) => {
        const itemAssignees = assignments
          .filter((a) => a.item_id === item.id)
          .map((a) => resourceMap.get(a.user_id) || 'Unknown');
        return {
          ...item,
          assignee_names: itemAssignees.join(', '),
        };
      }),
    [items, assignments, resourceMap],
  );

  // Bulk action handlers
  const handleBulkStatus = useCallback(async (status: string) => {
    if (selectedKeys.length === 0) return;
    try {
      await supabase
        .from('project_items')
        .update({ task_status: status })
        .in('id', selectedKeys);
      setSelectedKeys([]);
      await refetch();
    } catch (err) {
      console.error('Bulk status update failed:', err);
    }
  }, [selectedKeys, refetch]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedKeys.length === 0) return;
    if (!confirm(`Delete ${selectedKeys.length} items?`)) return;
    try {
      await supabase
        .from('project_items')
        .update({ is_active: false })
        .in('id', selectedKeys);
      setSelectedKeys([]);
      await refetch();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  }, [selectedKeys, refetch]);

  // Excel import handlers
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Workbook } = await import('exceljs');
      const wb = new Workbook();
      const buffer = await file.arrayBuffer();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) return;

      const rows: Array<{ name: string; item_type: string; start_date: string; end_date: string }> = [];
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const name = String(row.getCell(1).value || '').trim();
        if (!name) return;
        rows.push({
          name,
          item_type: String(row.getCell(2).value || 'task').trim().toLowerCase(),
          start_date: String(row.getCell(3).value || '').split('T')[0],
          end_date: String(row.getCell(4).value || '').split('T')[0],
        });
      });
      setImportData(rows);
    } catch (err) {
      console.error('Excel parse error:', err);
    }
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (importData.length === 0 || !profile?.tenant_id) return;
    setImporting(true);
    try {
      const inserts = importData.map((row) => ({
        tenant_id: profile.tenant_id!,
        project_id: projectId,
        item_type: ['group', 'task', 'milestone'].includes(row.item_type) ? row.item_type : 'task',
        name: row.name,
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        created_by: profile.user_id,
      }));
      await supabase.from('project_items').insert(inserts);
      setShowImportPopup(false);
      setImportData([]);
      await refetch();
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  }, [importData, profile, projectId, refetch]);

  // Excel export handler
  const handleExport = useCallback(async () => {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    const ws = wb.addWorksheet('Tasks');
    ws.addRow(['Name', 'Type', 'Start Date', 'End Date', 'Status', 'Progress', 'Assignees', 'WBS']);
    for (const item of enrichedItems) {
      ws.addRow([
        item.name,
        item.item_type,
        item.start_date || '',
        item.end_date || '',
        item.task_status || '',
        item.percent_complete ?? 0,
        item.assignee_names,
        item.wbs || '',
      ]);
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, [enrichedItems]);

  if (loading) {
    return (
      <div className="tasks-loading">
        <div className="loading-spinner" />
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tasks-error">
        <i className="dx-icon-warning" />
        <p>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="tasks-empty">
        <i className="dx-icon-detailslayout" />
        <h3>No tasks yet</h3>
        <p>Tasks will appear here once created.</p>
      </div>
    );
  }

  const handleRowClick = (e: { data?: { id: string; item_type: string } }) => {
    if (e.data && e.data.item_type !== 'group') {
      setSelectedTaskId(e.data.id);
    }
  };

  return (
    <div className="tasks-view">
      <div className="tasks-toolbar">
        <Button
          icon="download"
          text="Export"
          stylingMode="text"
          onClick={handleExport}
        />
        <Button
          icon="upload"
          text="Import"
          stylingMode="text"
          onClick={() => setShowImportPopup(true)}
        />
      </div>

      {selectedKeys.length > 0 && (
        <div className="bulk-toolbar">
          <span className="bulk-toolbar-count">{selectedKeys.length} selected</span>
          <SelectBox
            items={[
              { value: 'todo', label: 'To Do' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'review', label: 'Review' },
              { value: 'done', label: 'Done' },
            ]}
            displayExpr="label"
            valueExpr="value"
            placeholder="Set Status..."
            width={150}
            stylingMode="outlined"
            onValueChanged={(e) => { if (e.value) handleBulkStatus(e.value); }}
          />
          <Button
            icon="trash"
            text="Delete"
            stylingMode="text"
            className="bulk-delete-btn"
            onClick={handleBulkDelete}
          />
          <Button
            text="Clear"
            stylingMode="text"
            onClick={() => setSelectedKeys([])}
          />
        </div>
      )}

      <TreeList
        ref={treeListRef}
        dataSource={enrichedItems}
        keyExpr="id"
        parentIdExpr="parent_id"
        rootValue=""
        showBorders={true}
        showRowLines={true}
        showColumnLines={false}
        rowAlternationEnabled={true}
        hoverStateEnabled={true}
        columnAutoWidth={true}
        autoExpandAll={true}
        height="calc(100vh - 90px)"
        onRowClick={handleRowClick}
        onSelectionChanged={(e) => {
          setSelectedKeys((e.selectedRowKeys || []) as string[]);
        }}
      >
        <FilterRow visible={true} />
        <HeaderFilter visible={true} />
        <Selection mode="multiple" />

        <Column
          dataField="name"
          caption="Task Name"
          minWidth={300}
          cellRender={(data: { value: string; data: { item_type: string } }) => (
            <div className="task-name-cell">
              <i className={`dx-icon-${itemTypeIcons[data.data.item_type] || 'doc'}`} />
              <span>{data.value}</span>
            </div>
          )}
        />

        <Column
          dataField="item_type"
          caption="Type"
          width={100}
          cellRender={(data: { value: string }) => (
            <span className={`item-type-badge type-${data.value}`}>
              {data.value}
            </span>
          )}
        />

        <Column dataField="start_date" caption="Start" dataType="date" format={dxDateFmt} width={110} />
        <Column dataField="end_date" caption="End" dataType="date" format={dxDateFmt} width={110} />

        <Column
          dataField="percent_complete"
          caption="Progress"
          width={100}
          cellRender={(data: { value: number }) => (
            <div className="progress-cell">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${data.value}%` }}
                />
              </div>
              <span className="progress-text">{data.value}%</span>
            </div>
          )}
        />

        <Column
          dataField="task_status"
          caption="Status"
          width={120}
          cellRender={(data: { value: string; data: { item_type: string } }) => {
            if (data.data.item_type !== 'task') return null;
            return (
              <span className={`task-status-badge status-${data.value}`}>
                {statusLabels[data.value] || data.value}
              </span>
            );
          }}
        />

        <Column dataField="assignee_names" caption="Assignees" width={180} />
        <Column dataField="wbs" caption="WBS" width={70} />

        <Editing
          mode="row"
          allowUpdating={true}
          allowDeleting={true}
          allowAdding={true}
        />
      </TreeList>

      <Popup
        visible={showImportPopup}
        onHiding={() => { setShowImportPopup(false); setImportData([]); }}
        title="Import Tasks from Excel"
        showCloseButton={true}
        width={600}
        height="auto"
        maxHeight="80vh"
      >
        <div className="import-form">
          {importData.length === 0 ? (
            <div className="import-upload">
              <p>Upload an Excel file with columns: Name, Type, Start Date, End Date</p>
              <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />
            </div>
          ) : (
            <>
              <p className="import-preview-count">{importData.length} items to import:</p>
              <DataGrid
                dataSource={importData}
                keyExpr="name"
                showBorders={true}
                height={300}
              >
                <DGColumn dataField="name" caption="Name" />
                <DGColumn dataField="item_type" caption="Type" width={100} />
                <DGColumn dataField="start_date" caption="Start" width={110} />
                <DGColumn dataField="end_date" caption="End" width={110} />
              </DataGrid>
              <div className="form-actions" style={{ marginTop: 16 }}>
                <Button text="Cancel" stylingMode="outlined" onClick={() => { setShowImportPopup(false); setImportData([]); }} />
                <Button
                  text={importing ? 'Importing...' : `Import ${importData.length} Items`}
                  type="default"
                  stylingMode="contained"
                  disabled={importing}
                  onClick={handleImportConfirm}
                />
              </div>
            </>
          )}
        </div>
      </Popup>
    </div>
  );
}
