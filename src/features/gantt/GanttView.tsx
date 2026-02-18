import { type ReactNode, useCallback, useMemo, useState } from 'react';
import Gantt, {
  Tasks,
  Dependencies,
  Resources,
  ResourceAssignments,
  Column,
  Editing,
  Toolbar,
  Item,
  Validation,
} from 'devextreme-react/gantt';
import 'devexpress-gantt/dist/dx-gantt.css';
import { supabase, dbUpdate } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useProjectItems } from '@/hooks/useProjectItems';
import type { DependencyType } from '@/types';
import TaskDetailPopup from '@/features/tasks/TaskDetailPopup';
import './GanttView.css';

interface GanttViewProps {
  projectId: string;
}

// Map DB dependency_type to DevExtreme numeric type
const depTypeMap: Record<DependencyType, number> = {
  fs: 0,
  ss: 1,
  ff: 2,
  sf: 3,
};

const numToDepType: Record<number, DependencyType> = {
  0: 'fs',
  1: 'ss',
  2: 'ff',
  3: 'sf',
};

export default function GanttView({ projectId }: GanttViewProps): ReactNode {
  const { items, dependencies, resources, assignments, loading, error, refetch } =
    useProjectItems(projectId);
  const profile = useAuthStore((s) => s.profile);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaskClick = useCallback((e: any) => {
    if (e.key) {
      setSelectedItemId(e.key);
    }
  }, []);

  // Transform project_items → Gantt tasks format
  const ganttTasks = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        parentId: item.parent_id || '',
        title: item.name,
        start: item.start_date ? new Date(item.start_date) : null,
        end: item.end_date ? new Date(item.end_date) : null,
        progress: item.percent_complete ?? 0,
        color: item.color || undefined,
      })),
    [items],
  );

  // Transform task_dependencies → Gantt dependencies format
  const ganttDependencies = useMemo(
    () =>
      dependencies.map((dep) => ({
        id: dep.id,
        predecessorId: dep.predecessor_id,
        successorId: dep.successor_id,
        type: depTypeMap[dep.dependency_type] ?? 0,
      })),
    [dependencies],
  );

  // Transform task_assignees → Gantt resource assignments format
  const ganttAssignments = useMemo(
    () =>
      assignments.map((a) => ({
        id: a.id,
        taskId: a.item_id,
        resourceId: a.user_id,
      })),
    [assignments],
  );

  // --- CRUD Handlers ---
  const formatDate = (d: Date | null): string | null =>
    d ? d.toISOString().split('T')[0] : null;

  const handleTaskInserted = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      if (!profile?.tenant_id || !e.values) return;
      try {
        await supabase.from('project_items').insert({
          tenant_id: profile.tenant_id,
          project_id: projectId,
          parent_id: e.values.parentId || null,
          item_type: 'task',
          name: e.values.title || 'New Task',
          start_date: formatDate(e.values.start ?? null),
          end_date: formatDate(e.values.end ?? null),
          percent_complete: e.values.progress ?? 0,
          created_by: profile.user_id,
        });
        await refetch();
      } catch (err) {
        console.error('Failed to insert task:', err);
      }
    },
    [projectId, profile, refetch],
  );

  const handleTaskUpdated = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      try {
        const updates: Record<string, unknown> = {};
        if (e.values?.title !== undefined) updates.name = e.values.title;
        if (e.values?.start !== undefined) updates.start_date = formatDate(e.values.start);
        if (e.values?.end !== undefined) updates.end_date = formatDate(e.values.end);
        if (e.values?.progress !== undefined) updates.percent_complete = e.values.progress;
        if (e.values?.parentId !== undefined) updates.parent_id = e.values.parentId || null;

        if (Object.keys(updates).length > 0) {
          await supabase.from('project_items').update(dbUpdate(updates)).eq('id', e.key);
        }
      } catch (err) {
        console.error('Failed to update task:', err);
      }
    },
    [],
  );

  const handleTaskDeleted = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      try {
        await supabase.from('project_items').update({ is_active: false }).eq('id', e.key);
        await refetch();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    },
    [refetch],
  );

  const handleDependencyInserted = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      if (!profile?.tenant_id || !e.values?.predecessorId || !e.values?.successorId) return;
      try {
        await supabase.from('task_dependencies').insert({
          tenant_id: profile.tenant_id,
          project_id: projectId,
          predecessor_id: e.values.predecessorId,
          successor_id: e.values.successorId,
          dependency_type: numToDepType[e.values.type ?? 0] || 'fs',
        });
        await refetch();
      } catch (err) {
        console.error('Failed to insert dependency:', err);
      }
    },
    [projectId, profile, refetch],
  );

  const handleDependencyDeleted = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      try {
        await supabase.from('task_dependencies').delete().eq('id', e.key);
        await refetch();
      } catch (err) {
        console.error('Failed to delete dependency:', err);
      }
    },
    [refetch],
  );

  const handleResourceAssigning = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      if (!profile?.tenant_id || !e.values?.taskId || !e.values?.resourceId) return;
      try {
        await supabase.from('task_assignees').insert({
          tenant_id: profile.tenant_id,
          project_id: projectId,
          item_id: e.values.taskId,
          user_id: e.values.resourceId,
        });
        await refetch();
      } catch (err) {
        console.error('Failed to assign resource:', err);
      }
    },
    [projectId, profile, refetch],
  );

  const handleResourceUnassigning = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      try {
        await supabase.from('task_assignees').delete().eq('id', e.key);
        await refetch();
      } catch (err) {
        console.error('Failed to unassign resource:', err);
      }
    },
    [refetch],
  );

  if (loading) {
    return (
      <div className="gantt-loading">
        <div className="loading-spinner" />
        <p>Loading Gantt chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gantt-error">
        <i className="dx-icon-warning" />
        <p>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="gantt-empty">
        <i className="dx-icon-chart" />
        <h3>No tasks yet</h3>
        <p>Create tasks to see them on the Gantt chart.</p>
      </div>
    );
  }

  return (
    <div className="gantt-view">
      <Gantt
        taskListWidth={400}
        scaleType="weeks"
        height="calc(100vh - 280px)"
        rootValue=""
        showResources={true}
        showDependencies={true}
        onTaskClick={handleTaskClick}
        onTaskInserted={handleTaskInserted}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        onDependencyInserted={handleDependencyInserted}
        onDependencyDeleted={handleDependencyDeleted}
        onResourceAssigned={handleResourceAssigning}
        onResourceUnassigned={handleResourceUnassigning}
      >
        <Tasks
          dataSource={ganttTasks}
          keyExpr="id"
          parentIdExpr="parentId"
          titleExpr="title"
          startExpr="start"
          endExpr="end"
          progressExpr="progress"
          colorExpr="color"
        />
        <Dependencies
          dataSource={ganttDependencies}
          keyExpr="id"
          predecessorIdExpr="predecessorId"
          successorIdExpr="successorId"
          typeExpr="type"
        />
        <Resources dataSource={resources} keyExpr="id" textExpr="text" />
        <ResourceAssignments
          dataSource={ganttAssignments}
          keyExpr="id"
          taskIdExpr="taskId"
          resourceIdExpr="resourceId"
        />

        <Column dataField="title" caption="Task Name" width={280} />
        <Column dataField="start" caption="Start" width={90} />
        <Column dataField="end" caption="End" width={90} />
        <Column dataField="progress" caption="%" width={50} />

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
          <Item name="separator" />
          <Item name="fullScreen" />
        </Toolbar>

        <Validation autoUpdateParentTasks={true} />

        <Editing
          enabled={true}
          allowDependencyAdding={true}
          allowDependencyDeleting={true}
          allowTaskAdding={true}
          allowTaskDeleting={true}
          allowTaskUpdating={true}
          allowResourceAdding={true}
          allowResourceDeleting={true}
        />
      </Gantt>

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
