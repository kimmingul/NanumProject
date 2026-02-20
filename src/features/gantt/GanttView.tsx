import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Gantt, {
  Tasks,
  Dependencies,
  Resources,
  ResourceAssignments,
  Column,
  Editing,
  Validation,
  ContextMenu,
  ContextMenuItem,
} from 'devextreme-react/gantt';
import type { GanttRef } from 'devextreme-react/gantt';
import 'devexpress-gantt/dist/dx-gantt.css';
import { supabase, dbUpdate } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { usePMStore } from '@/lib/pm-store';
import { usePreferencesStore } from '@/lib/preferences-store';
import { getDxDateFormat } from '@/utils/formatDate';
import { useProjectItems } from '@/hooks/useProjectItems';
import TaskDetailPopup from '@/features/tasks/TaskDetailPopup';
import type { DependencyType } from '@/types';
import './GanttView.css';

export interface GanttActions {
  addTask: () => void;
  deleteTask: () => void;
}

interface GanttViewProps {
  projectId: string;
  actionsRef?: React.MutableRefObject<GanttActions | undefined>;
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

const typeIconMap: Record<string, string> = {
  group: 'folder',
  task: 'detailslayout',
  milestone: 'event',
};

export default function GanttView({ projectId, actionsRef }: GanttViewProps): ReactNode {
  // Popup state (declared early — used by useProjectItems paused flag)
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupItemId, setPopupItemId] = useState<string | null>(null);

  const { items, dependencies, resources, assignments, commentCounts, loading, error, refetch } =
    useProjectItems(projectId, popupVisible);
  const profile = useAuthStore((s) => s.profile);
  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);
  const selectedTaskId = usePMStore((s) => s.selectedTaskId);
  const dateFormat = usePreferencesStore((s) => s.preferences.dateFormat);
  const dxDateFmt = useMemo(() => getDxDateFormat(), [dateFormat]);
  const ganttRef = useRef<GanttRef>(null);

  // Expose add/delete actions to parent via ref
  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        addTask: () => {
          ganttRef.current?.instance().insertTask({
            title: 'New Task',
            start: new Date(),
            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            progress: 0,
          });
        },
        deleteTask: () => {
          if (selectedTaskId) {
            ganttRef.current?.instance().deleteTask(selectedTaskId);
          }
        },
      };
    }
    return () => {
      if (actionsRef) actionsRef.current = undefined;
    };
  }, [actionsRef, selectedTaskId]);

  // Build a lookup map from item id → item_type
  const itemTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.id, item.item_type);
    }
    return map;
  }, [items]);

  // Single click — row highlight only (no panel/popup)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaskClick = useCallback((e: any) => {
    if (e.key) {
      setSelectedTaskId(e.key);
    }
  }, [setSelectedTaskId]);

  // Double click — block default popup, open custom popup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaskDblClick = useCallback((e: any) => {
    e.cancel = true;
    if (e.key) {
      setPopupItemId(e.key);
      setPopupVisible(true);
    }
  }, []);

  // Block DevExtreme's built-in edit dialog
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaskEditDialogShowing = useCallback((e: any) => {
    e.cancel = true;
  }, []);

  // Context menu custom command: "Task Details..."
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCustomCommand = useCallback((e: any) => {
    if (e.name === 'openTaskDetails') {
      const taskId = selectedTaskId;
      if (taskId) {
        setPopupItemId(taskId);
        setPopupVisible(true);
      }
    }
  }, [selectedTaskId]);

  const handlePopupClose = useCallback(() => {
    setPopupVisible(false);
    setPopupItemId(null);
  }, []);

  // Custom cell render for Task Name column
  const taskNameCellRender = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cellData: any) => {
      const taskId = cellData.data?.id;
      const title = cellData.value || '';
      const itemType = taskId ? itemTypeMap.get(taskId) : 'task';
      const iconName = typeIconMap[itemType || 'task'] || 'detailslayout';
      const count = taskId ? commentCounts.get(taskId) || 0 : 0;

      return (
        <span className={`gantt-task-name-cell gantt-item-${itemType || 'task'}`}>
          <i className={`dx-icon-${iconName} gantt-type-icon`} />
          <span className="gantt-task-title">{title}</span>
          {count > 0 && (
            <span className="gantt-comment-badge" title={`${count} comment${count > 1 ? 's' : ''}`}>
              {count}
            </span>
          )}
        </span>
      );
    },
    [itemTypeMap, commentCounts],
  );

  // Custom cell render for Assignees column
  const assigneesCellRender = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cellData: any) => {
      const value = cellData.value || '';
      if (!value) return <span className="gantt-assignees-cell" />;
      const names: string[] = value.split(', ');
      return (
        <span className="gantt-assignees-cell">
          {names.map((name: string, i: number) => (
            <span key={i} className="gantt-assignee-badge" title={name}>
              {name.charAt(0).toUpperCase()}
            </span>
          ))}
        </span>
      );
    },
    [],
  );

  // Build resource lookup: userId → name
  const resourceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resources) {
      map.set(r.id, r.text);
    }
    return map;
  }, [resources]);

  // Build assignment lookup: itemId → userId[]
  const assignmentsByItem = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of assignments) {
      const list = map.get(a.item_id) || [];
      list.push(a.user_id);
      map.set(a.item_id, list);
    }
    return map;
  }, [assignments]);

  // Transform project_items → Gantt tasks format (with assignees)
  const ganttTasks = useMemo(
    () =>
      items.map((item) => {
        const userIds = assignmentsByItem.get(item.id) || [];
        const names = userIds.map((uid) => resourceMap.get(uid) || '').filter(Boolean);
        return {
          id: item.id,
          parentId: item.parent_id || '',
          title: item.name,
          start: item.start_date ? new Date(item.start_date) : null,
          end: item.end_date ? new Date(item.end_date) : null,
          progress: item.percent_complete ?? 0,
          color: item.color || undefined,
          assignees: names.join(', '),
        };
      }),
    [items, assignmentsByItem, resourceMap],
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
          await refetch();
        }
      } catch (err) {
        console.error('Failed to update task:', err);
      }
    },
    [refetch],
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
        ref={ganttRef}
        taskListWidth={600}
        scaleType="weeks"
        height="calc(100vh - 90px)"
        rootValue=""
        showResources={true}
        showDependencies={true}
        onTaskClick={handleTaskClick}
        onTaskDblClick={handleTaskDblClick}
        onTaskEditDialogShowing={handleTaskEditDialogShowing}
        onCustomCommand={handleCustomCommand}
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

        <Column dataField="title" caption="Task Name" width={280} cellRender={taskNameCellRender} />
        <Column dataField="start" caption="Start" width={90} format={dxDateFmt} />
        <Column dataField="end" caption="End" width={90} format={dxDateFmt} />
        <Column dataField="progress" caption="%" width={50} />
        <Column dataField="assignees" caption="Assigned" width={90} cellRender={assigneesCellRender} />

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

        <ContextMenu>
          <ContextMenuItem name="addTask" />
          <ContextMenuItem name="openTaskDetails" text="Task Details..." />
          <ContextMenuItem name="deleteTask" />
        </ContextMenu>
      </Gantt>

      <TaskDetailPopup
        visible={popupVisible}
        itemId={popupItemId}
        projectId={projectId}
        items={items}
        dependencies={dependencies}
        onClose={handlePopupClose}
        onTaskUpdated={refetch}
      />
    </div>
  );
}
