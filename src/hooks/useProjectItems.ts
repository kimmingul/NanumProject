import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAutoRefresh } from './useAutoRefresh';
import type {
  ProjectItem,
  TaskDependency,
  TaskAssignee,
} from '@/types';

interface ProjectMemberResource {
  id: string;
  text: string;
}

export interface MoveItemUpdate {
  id: string;
  parent_id?: string | null;
  sort_order?: number;
}

interface UseProjectItemsResult {
  items: ProjectItem[];
  dependencies: TaskDependency[];
  resources: ProjectMemberResource[];
  assignments: TaskAssignee[];
  commentCounts: Map<string, number>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchAssignees: () => Promise<void>;
  moveItem: (updates: MoveItemUpdate[]) => Promise<void>;
}

/** Compute WBS codes from a flat list of items based on parent_id tree + sort_order */
function computeWbs(
  items: { id: string; parent_id: string | null; sort_order: number }[],
): Map<string, string> {
  // Build children map (normalize empty string parent_id to null)
  const childrenMap = new Map<string | null, typeof items>();
  for (const item of items) {
    const key = item.parent_id || null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(item);
  }
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.sort_order - b.sort_order);
  }

  const result = new Map<string, string>();
  function traverse(parentId: string | null, prefix: string): void {
    const children = childrenMap.get(parentId) || [];
    children.forEach((child, index) => {
      const wbs = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      result.set(child.id, wbs);
      traverse(child.id, wbs);
    });
  }
  traverse(null, '');
  return result;
}

export function useProjectItems(projectId: string | undefined, paused?: boolean): UseProjectItemsResult {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [resources, setResources] = useState<ProjectMemberResource[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignee[]>([]);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      // 1) Fetch items and assignees in parallel
      const [itemsRes, assigneesRes, membersRes] = await Promise.all([
        supabase
          .from('project_items')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('task_assignees')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true),
        supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
          .eq('is_active', true),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (assigneesRes.error) throw assigneesRes.error;

      const fetchedItems = (itemsRes.data as ProjectItem[]) ?? [];
      setItems(fetchedItems);
      setAssignments((assigneesRes.data as TaskAssignee[]) ?? []);

      // 2) Fetch dependencies using item IDs (task_dependencies may lack project_id column)
      if (fetchedItems.length > 0) {
        const itemIds = fetchedItems.map((item) => item.id);
        const { data: depsData, error: depsError } = await supabase
          .from('task_dependencies')
          .select('*')
          .in('predecessor_id', itemIds);

        if (depsError) throw depsError;
        setDependencies((depsData as TaskDependency[]) ?? []);
      } else {
        setDependencies([]);
      }

      // 3) Fetch comment counts via RPC
      const { data: countData } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(
        'get_item_comment_counts',
        { p_project_id: projectId },
      );
      if (countData && Array.isArray(countData)) {
        const map = new Map<string, number>();
        for (const row of countData as { item_id: string; comment_count: number }[]) {
          map.set(row.item_id, Number(row.comment_count));
        }
        setCommentCounts(map);
      }

      // 4) Fetch member profiles for resource names
      if (membersRes.data && membersRes.data.length > 0) {
        const userIds = [...new Set(membersRes.data.map((m: { user_id: string }) => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profiles) {
          setResources(
            profiles.map((p: { user_id: string; full_name: string | null }) => ({
              id: p.user_id,
              text: p.full_name || 'Unknown',
            })),
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project data';
      setError(message);
      console.error('Error fetching project items:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetchAssignees = useCallback(async () => {
    if (!projectId) return;
    const { data, error: err } = await supabase
      .from('task_assignees')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);
    if (!err) setAssignments((data as TaskAssignee[]) ?? []);
  }, [projectId]);

  const moveItem = useCallback(async (updates: MoveItemUpdate[]) => {
    if (!projectId) return;

    // 1. Update sort_order / parent_id
    await Promise.all(
      updates.map(({ id, ...fields }) =>
        supabase.from('project_items').update(fields).eq('id', id),
      ),
    );

    // 2. Fetch fresh items to recompute WBS
    const { data: freshItems } = await supabase
      .from('project_items')
      .select('id, parent_id, sort_order, wbs')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (freshItems && freshItems.length > 0) {
      const newWbs = computeWbs(freshItems);

      // 3. Only update rows whose WBS actually changed
      const wbsUpdates = freshItems.filter((item) => {
        const computed = newWbs.get(item.id);
        return computed && computed !== (item.wbs || '');
      });

      if (wbsUpdates.length > 0) {
        await Promise.all(
          wbsUpdates.map((item) =>
            supabase
              .from('project_items')
              .update({ wbs: newWbs.get(item.id)! })
              .eq('id', item.id),
          ),
        );
      }
    }

    // 4. Refetch full data
    await fetchData();
  }, [fetchData, projectId]);

  useAutoRefresh(fetchData, 30_000, !!projectId && !paused);

  return { items, dependencies, resources, assignments, commentCounts, loading, error, refetch: fetchData, refetchAssignees, moveItem };
}
