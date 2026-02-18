import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import { useAuthStore } from '@/lib/auth-store';
import type { Project, ProjectStatus } from '@/types';

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
    if (!profile?.tenant_id) return;
    setProjectsLoading(true);
    setProjectsError(null);

    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProjects((data as Project[]) ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setProjectsError(message);
      console.error('Error fetching projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  }, [profile?.tenant_id, status, search, setProjects, setProjectsLoading, setProjectsError]);

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
