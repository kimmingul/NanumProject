import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import { useAuthStore } from '@/lib/auth-store';
import type { Project } from '@/types';

export function useProject(projectId: string | undefined) {
  const {
    activeProject,
    activeProjectLoading,
    setActiveProject,
    setActiveProjectLoading,
  } = usePMStore();
  const profile = useAuthStore((s) => s.profile);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setActiveProjectLoading(true);

    try {
      const [projectResult, starResult] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single(),
        profile?.user_id
          ? supabase
              .from('user_project_stars')
              .select('id')
              .eq('user_id', profile.user_id)
              .eq('project_id', projectId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (projectResult.error) throw projectResult.error;
      setActiveProject({
        ...projectResult.data,
        is_starred: !!starResult.data,
      } as Project);
    } catch (err) {
      console.error('Error loading project:', err);
      setActiveProject(null);
    } finally {
      setActiveProjectLoading(false);
    }
  }, [projectId, profile?.user_id, setActiveProject, setActiveProjectLoading]);

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
