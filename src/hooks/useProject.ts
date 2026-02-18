import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import type { Project } from '@/types';

export function useProject(projectId: string | undefined) {
  const {
    activeProject,
    activeProjectLoading,
    setActiveProject,
    setActiveProjectLoading,
  } = usePMStore();

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setActiveProjectLoading(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setActiveProject(data as Project);
    } catch (err) {
      console.error('Error loading project:', err);
      setActiveProject(null);
    } finally {
      setActiveProjectLoading(false);
    }
  }, [projectId, setActiveProject, setActiveProjectLoading]);

  useEffect(() => {
    fetchProject();
    return () => {
      setActiveProject(null);
    };
  }, [fetchProject, setActiveProject]);

  return {
    project: activeProject,
    loading: activeProjectLoading,
    refetch: fetchProject,
  };
}
