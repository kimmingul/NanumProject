import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  ProjectItem,
  TaskDependency,
  TaskAssignee,
} from '@/types';

interface ProjectMemberResource {
  id: string;
  text: string;
}

interface UseProjectItemsResult {
  items: ProjectItem[];
  dependencies: TaskDependency[];
  resources: ProjectMemberResource[];
  assignments: TaskAssignee[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProjectItems(projectId: string | undefined): UseProjectItemsResult {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [resources, setResources] = useState<ProjectMemberResource[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignee[]>([]);
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

      // 3) Fetch member profiles for resource names
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

  return { items, dependencies, resources, assignments, loading, error, refetch: fetchData };
}
