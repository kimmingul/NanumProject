import { useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import { useAuthStore } from '@/lib/auth-store';
import type { TaskGroup, Task, TaskDependency, DependencyType } from '@/types';

// DevExtreme Gantt data format types
export interface GanttTask {
  id: string;
  parentId: string;
  title: string;
  start: Date;
  end: Date;
  progress: number;
}

export interface GanttDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: number;
}

const ROOT_ID = '0';

const DEPENDENCY_TYPE_TO_NUMBER: Record<DependencyType, number> = {
  fs: 0,
  ss: 1,
  ff: 2,
  sf: 3,
};

const NUMBER_TO_DEPENDENCY_TYPE: Record<number, DependencyType> = {
  0: 'fs',
  1: 'ss',
  2: 'ff',
  3: 'sf',
};

function toGanttTasks(groups: TaskGroup[], tasks: Task[]): GanttTask[] {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const ganttGroups: GanttTask[] = groups.map((g) => ({
    id: `g-${g.id}`,
    parentId: g.parent_group_id ? `g-${g.parent_group_id}` : ROOT_ID,
    title: g.name,
    start: g.start_date ? new Date(g.start_date) : defaultStart,
    end: g.end_date ? new Date(g.end_date) : defaultEnd,
    progress: g.percent_complete,
  }));

  const ganttTasks: GanttTask[] = tasks.map((t) => ({
    id: `t-${t.id}`,
    parentId: t.group_id ? `g-${t.group_id}` : ROOT_ID,
    title: t.name,
    start: t.start_date ? new Date(t.start_date) : defaultStart,
    end: t.end_date ? new Date(t.end_date) : defaultEnd,
    progress: t.percent_complete,
  }));

  return [...ganttGroups, ...ganttTasks];
}

function toGanttDependencies(deps: TaskDependency[]): GanttDependency[] {
  return deps.map((d) => ({
    id: d.id,
    predecessorId: `t-${d.predecessor_id}`,
    successorId: `t-${d.successor_id}`,
    type: DEPENDENCY_TYPE_TO_NUMBER[d.dependency_type] ?? 0,
  }));
}

function parseGanttId(ganttId: string): { type: 'group' | 'task'; id: string } {
  if (typeof ganttId === 'string' && ganttId.startsWith('g-')) {
    return { type: 'group', id: ganttId.slice(2) };
  }
  if (typeof ganttId === 'string' && ganttId.startsWith('t-')) {
    return { type: 'task', id: ganttId.slice(2) };
  }
  return { type: 'task', id: String(ganttId) };
}

function toISODate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

export function useGanttData(projectId: string | undefined) {
  const {
    taskGroups,
    tasks,
    dependencies,
    ganttLoading,
    ganttError,
    setTaskGroups,
    setTasks,
    setDependencies,
    setGanttLoading,
    setGanttError,
  } = usePMStore();

  const profile = useAuthStore((s) => s.profile);
  const tenantId = profile?.tenant_id;

  const fetchGanttData = useCallback(async () => {
    if (!projectId) return;
    setGanttLoading(true);
    setGanttError(null);

    try {
      const [groupsRes, tasksRes, depsRes] = await Promise.all([
        supabase
          .from('task_groups')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('task_dependencies')
          .select('*')
          .eq('tenant_id', tenantId ?? ''),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (depsRes.error) throw depsRes.error;

      const fetchedGroups = (groupsRes.data ?? []) as TaskGroup[];
      const fetchedTasks = (tasksRes.data ?? []) as Task[];

      // Filter dependencies to only include tasks in this project
      const taskIds = new Set(fetchedTasks.map((t) => t.id));
      const projectDeps = ((depsRes.data ?? []) as TaskDependency[]).filter(
        (d) => taskIds.has(d.predecessor_id) || taskIds.has(d.successor_id),
      );

      setTaskGroups(fetchedGroups);
      setTasks(fetchedTasks);
      setDependencies(projectDeps);
    } catch (err) {
      console.error('Error loading gantt data:', err);
      setGanttError(err instanceof Error ? err.message : 'Failed to load gantt data');
    } finally {
      setGanttLoading(false);
    }
  }, [projectId, tenantId, setTaskGroups, setTasks, setDependencies, setGanttLoading, setGanttError]);

  useEffect(() => {
    fetchGanttData();
    return () => {
      setTaskGroups([]);
      setTasks([]);
      setDependencies([]);
    };
  }, [fetchGanttData, setTaskGroups, setTasks, setDependencies]);

  const ganttTasks = useMemo(() => toGanttTasks(taskGroups, tasks), [taskGroups, tasks]);
  const ganttDependencies = useMemo(() => toGanttDependencies(dependencies), [dependencies]);

  // CRUD handlers

  const handleTaskInserted = useCallback(
    async (e: { values: Record<string, unknown>; key: unknown }) => {
      if (!projectId || !tenantId) return;
      const values = e.values;
      const parentId = values.parentId as string | undefined;

      // Determine if this should be a group or task based on parentId prefix
      const isGroup = parentId?.startsWith('g-') && !parentId;

      if (isGroup) {
        // Insert as group
        await supabase.from('task_groups').insert({
          tenant_id: tenantId,
          project_id: projectId,
          name: (values.title as string) || 'New Group',
          parent_group_id: parentId && parentId !== ROOT_ID ? parentId.slice(2) : null,
          start_date: values.start ? toISODate(values.start as Date) : null,
          end_date: values.end ? toISODate(values.end as Date) : null,
          percent_complete: (values.progress as number) ?? 0,
          sort_order: 0,
        });
      } else {
        // Insert as task
        const groupId =
          parentId && parentId !== ROOT_ID && parentId.startsWith('g-')
            ? parentId.slice(2)
            : null;
        await supabase.from('tasks').insert({
          tenant_id: tenantId,
          project_id: projectId,
          name: (values.title as string) || 'New Task',
          group_id: groupId,
          start_date: values.start ? toISODate(values.start as Date) : null,
          end_date: values.end ? toISODate(values.end as Date) : null,
          percent_complete: (values.progress as number) ?? 0,
          sort_order: 0,
        });
      }

      await fetchGanttData();
    },
    [projectId, tenantId, fetchGanttData],
  );

  const handleTaskUpdated = useCallback(
    async (e: { key: unknown; values: Record<string, unknown> }) => {
      const parsed = parseGanttId(String(e.key));
      const values = e.values;

      const updates: Record<string, unknown> = {};
      if (values.title !== undefined) updates.name = values.title;
      if (values.start !== undefined) updates.start_date = toISODate(values.start as Date);
      if (values.end !== undefined) updates.end_date = toISODate(values.end as Date);
      if (values.progress !== undefined) updates.percent_complete = values.progress;

      if (Object.keys(updates).length === 0) return;

      if (parsed.type === 'group') {
        await supabase.from('task_groups').update(updates).eq('id', parsed.id);
      } else {
        await supabase.from('tasks').update(updates).eq('id', parsed.id);
      }

      await fetchGanttData();
    },
    [fetchGanttData],
  );

  const handleTaskDeleted = useCallback(
    async (e: { key: unknown }) => {
      const parsed = parseGanttId(String(e.key));

      // Soft delete: set is_active = false
      if (parsed.type === 'group') {
        await supabase.from('task_groups').update({ is_active: false }).eq('id', parsed.id);
      } else {
        await supabase.from('tasks').update({ is_active: false }).eq('id', parsed.id);
      }

      await fetchGanttData();
    },
    [fetchGanttData],
  );

  const handleDependencyInserted = useCallback(
    async (e: { values: Record<string, unknown> }) => {
      if (!tenantId) return;
      const values = e.values;

      const predecessorParsed = parseGanttId(String(values.predecessorId));
      const successorParsed = parseGanttId(String(values.successorId));

      await supabase.from('task_dependencies').insert({
        tenant_id: tenantId,
        predecessor_id: predecessorParsed.id,
        successor_id: successorParsed.id,
        dependency_type: NUMBER_TO_DEPENDENCY_TYPE[values.type as number] ?? 'fs',
        lag_days: 0,
      });

      await fetchGanttData();
    },
    [tenantId, fetchGanttData],
  );

  const handleDependencyDeleted = useCallback(
    async (e: { key: unknown }) => {
      await supabase.from('task_dependencies').delete().eq('id', String(e.key));
      await fetchGanttData();
    },
    [fetchGanttData],
  );

  return {
    ganttTasks,
    ganttDependencies,
    ganttLoading,
    ganttError,
    refetch: fetchGanttData,
    handleTaskInserted,
    handleTaskUpdated,
    handleTaskDeleted,
    handleDependencyInserted,
    handleDependencyDeleted,
  };
}
