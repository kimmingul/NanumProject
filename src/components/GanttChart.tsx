import { type ReactNode, useCallback } from 'react';
import Gantt, {
  Tasks,
  Dependencies,
  Column,
  Toolbar,
  Item,
  Validation,
  Editing,
} from 'devextreme-react/gantt';
import type {
  TaskInsertedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  DependencyInsertedEvent,
  DependencyDeletedEvent,
} from 'devextreme/ui/gantt';
import 'devexpress-gantt/dist/dx-gantt.min.css';
import type { GanttTask, GanttDependency } from '@/hooks/useGanttData';
import './GanttChart.css';

interface GanttChartProps {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onTaskInserted: (e: { values: Record<string, unknown>; key: unknown }) => void;
  onTaskUpdated: (e: { key: unknown; values: Record<string, unknown> }) => void;
  onTaskDeleted: (e: { key: unknown }) => void;
  onDependencyInserted: (e: { values: Record<string, unknown> }) => void;
  onDependencyDeleted: (e: { key: unknown }) => void;
}

export function GanttChart({
  tasks,
  dependencies,
  loading,
  error,
  onRefetch,
  onTaskInserted,
  onTaskUpdated,
  onTaskDeleted,
  onDependencyInserted,
  onDependencyDeleted,
}: GanttChartProps): ReactNode {
  const handleTaskInserted = useCallback(
    (e: TaskInsertedEvent) => {
      onTaskInserted({ values: e.values, key: e.key });
    },
    [onTaskInserted],
  );

  const handleTaskUpdated = useCallback(
    (e: TaskUpdatedEvent) => {
      onTaskUpdated({ key: e.key, values: e.values });
    },
    [onTaskUpdated],
  );

  const handleTaskDeleted = useCallback(
    (e: TaskDeletedEvent) => {
      onTaskDeleted({ key: e.key });
    },
    [onTaskDeleted],
  );

  const handleDependencyInserted = useCallback(
    (e: DependencyInsertedEvent) => {
      onDependencyInserted({ values: e.values });
    },
    [onDependencyInserted],
  );

  const handleDependencyDeleted = useCallback(
    (e: DependencyDeletedEvent) => {
      onDependencyDeleted({ key: e.key });
    },
    [onDependencyDeleted],
  );

  if (loading) {
    return (
      <div className="gantt-chart-loading">
        <div className="loading-spinner" />
        <p>Loading Gantt chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gantt-chart-error">
        <i className="dx-icon-warning" />
        <p>{error}</p>
        <button onClick={onRefetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="gantt-chart-container">
      <Gantt
        taskListWidth={400}
        scaleType="weeks"
        height="100%"
        rootValue="0"
        onTaskInserted={handleTaskInserted}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        onDependencyInserted={handleDependencyInserted}
        onDependencyDeleted={handleDependencyDeleted}
      >
        <Tasks
          dataSource={tasks}
          keyExpr="id"
          parentIdExpr="parentId"
          titleExpr="title"
          startExpr="start"
          endExpr="end"
          progressExpr="progress"
        />
        <Dependencies
          dataSource={dependencies}
          keyExpr="id"
          predecessorIdExpr="predecessorId"
          successorIdExpr="successorId"
          typeExpr="type"
        />

        <Column dataField="title" caption="Task Name" width={280} />
        <Column dataField="start" caption="Start" />
        <Column dataField="end" caption="End" />
        <Column dataField="progress" caption="Progress %" width={80} />

        <Toolbar>
          <Item name="undo" />
          <Item name="redo" />
          <Item name="separator" />
          <Item name="collapseAll" />
          <Item name="expandAll" />
          <Item name="separator" />
          <Item name="addTask" />
          <Item name="deleteTask" />
          <Item name="separator" />
          <Item name="zoomIn" />
          <Item name="zoomOut" />
        </Toolbar>

        <Validation autoUpdateParentTasks={true} />
        <Editing enabled={true} />
      </Gantt>
    </div>
  );
}
