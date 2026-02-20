import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import { useAuthStore } from '@/lib/auth-store';
import type { Database } from '@/types/supabase';
import type { Project, ProjectStatus } from '@/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

interface UseProjectsOptions {
  status?: ProjectStatus | 'all';
  search?: string;
  autoFetch?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { status = 'all', search, autoFetch = true } = options;
  const {
    projects,
    projectsLoading,
    projectsError,
    setProjects,
    setProjectsLoading,
    setProjectsError,
  } = usePMStore();
  const profile = useAuthStore((s) => s.profile);

  const fetchProjects = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.user_id) return;

    setProjectsLoading(true);
    setProjectsError(null);

    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      // Fetch projects and user's stars in parallel
      const projectsPromise = query;
      const starsPromise = supabase
        .from('user_project_stars')
        .select('project_id')
        .eq('user_id', profile.user_id);

      const [projectsResult, starsResult] = await Promise.all([projectsPromise, starsPromise]);

      if (projectsResult.error) throw projectsResult.error;
      const rows = projectsResult.data as ProjectRow[];

      const starredIds = new Set(
        (starsResult.data ?? []).map((s) => s.project_id),
      );

      // Inject is_starred and sort: starred first, then by name
      const enriched = (rows ?? []).map((p) => ({
        ...p,
        is_starred: starredIds.has(p.id),
      })) as Project[];

      enriched.sort((a, b) => {
        if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setProjects(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setProjectsError(message);
      console.error('Error fetching projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  }, [profile?.tenant_id, profile?.user_id, status, search, setProjects, setProjectsLoading, setProjectsError]);

  useEffect(() => {
    if (autoFetch) {
      fetchProjects();
    }
  }, [autoFetch, fetchProjects]);

  return {
    projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: fetchProjects,
  };
}
