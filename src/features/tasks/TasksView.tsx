import { type ReactNode, useMemo, useState } from 'react';
import TreeList, {
  Column,
  Editing,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Selection,
  Toolbar,
  Item,
} from 'devextreme-react/tree-list';
import { useProjectItems } from '@/hooks/useProjectItems';
import TaskDetailPopup from './TaskDetailPopup';
import './TasksView.css';

interface TasksViewProps {
  projectId: string;
}

const itemTypeIcons: Record<string, string> = {
  group: 'folder',
  task: 'detailslayout',
  milestone: 'event',
};

export default function TasksView({ projectId }: TasksViewProps): ReactNode {
  const { items, resources, assignments, loading, error, refetch } = useProjectItems(projectId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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
      setSelectedItemId(e.data.id);
    }
  };

  return (
    <div className="tasks-view">
      <TreeList
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
        height="calc(100vh - 280px)"
        onRowClick={handleRowClick}
      >
        <FilterRow visible={true} />
        <HeaderFilter visible={true} />
        <SearchPanel visible={true} width={240} placeholder="Search tasks..." />
        <Selection mode="single" />

        <Toolbar>
          <Item name="searchPanel" />
        </Toolbar>

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

        <Column dataField="start_date" caption="Start" dataType="date" width={110} />
        <Column dataField="end_date" caption="End" dataType="date" width={110} />

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

        <Column dataField="assignee_names" caption="Assignees" width={180} />
        <Column dataField="wbs" caption="WBS" width={70} />

        <Editing
          mode="row"
          allowUpdating={true}
          allowDeleting={true}
          allowAdding={true}
        />
      </TreeList>

      <TaskDetailPopup
        visible={selectedItemId !== null}
        projectId={projectId}
        itemId={selectedItemId}
        onHiding={() => setSelectedItemId(null)}
        onTaskUpdated={refetch}
      />
    </div>
  );
}
