import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

export interface MyTaskItem {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  item_type: string;
  task_status: string;
  percent_complete: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface MyTasksFilter {
  projectId?: string;
  status?: string; // 'all' | 'todo' | 'in_progress' | 'review' | 'done'
  includeCompleted?: boolean;
}

interface UseMyTasksResult {
  tasks: MyTaskItem[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function useMyTasks(filter: MyTasksFilter = {}): UseMyTasksResult {
  const profile = useAuthStore((s) => s.profile);
  const userId = profile?.user_id;

  const [tasks, setTasks] = useState<MyTaskItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!profile?.tenant_id || !userId) {
      setTasks([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query for tasks assigned to current user
      let query = supabase
        .from('task_assignees')
        .select(`
          item_id,
          project_items!inner(
            id, name, project_id, item_type, task_status,
            percent_complete, start_date, end_date, created_at
          )
        `)
        .eq('is_active', true)
        .eq('user_id', userId);

      // Apply status filter
      if (filter.status && filter.status !== 'all') {
        query = query.eq('project_items.task_status' as string, filter.status);
      } else if (!filter.includeCompleted) {
        // By default, exclude completed tasks
        query = query.neq('project_items.task_status' as string, 'done');
      }

      // Apply project filter
      if (filter.projectId) {
        query = query.eq('project_items.project_id' as string, filter.projectId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Extract project IDs for name lookup
      const projectIds = new Set<string>();
      const taskItems: MyTaskItem[] = [];

      if (data) {
        for (const row of data as unknown as Array<{ project_items: Record<string, unknown> }>) {
          const pi = row.project_items as unknown as MyTaskItem;
          if (pi) {
            taskItems.push({ ...pi, project_name: '' });
            projectIds.add(pi.project_id);
          }
        }
      }

      // Fetch project names
      if (projectIds.size > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', Array.from(projectIds));

        const nameMap = new Map<string, string>();
        if (projects) {
          for (const p of projects) nameMap.set(p.id, p.name);
        }

        for (const t of taskItems) {
          t.project_name = nameMap.get(t.project_id) || '';
        }
      }

      // Sort: overdue first, then by end_date
      const todayStr = today();
      taskItems.sort((a, b) => {
        // Overdue items first
        const aOverdue = a.end_date && a.end_date < todayStr ? 0 : 1;
        const bOverdue = b.end_date && b.end_date < todayStr ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;

        // Then by end_date (nulls last)
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return a.end_date.localeCompare(b.end_date);
      });

      setTasks(taskItems);
      setTotalCount(taskItems.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      console.error('Error fetching my tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, userId, filter.projectId, filter.status, filter.includeCompleted]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, totalCount, loading, error, refetch: fetchTasks };
}
