import { useCallback } from 'react';
import { supabase, dbUpdate } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { Project, ProjectStatus } from '@/types';

export interface CreateProjectInput {
  name: string;
  description?: string | undefined;
  status?: ProjectStatus | undefined;
  start_date?: string | null | undefined;
  end_date?: string | null | undefined;
  has_hours_enabled?: boolean | undefined;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  is_starred?: boolean | undefined;
  is_active?: boolean | undefined;
}

export function useProjectCrud() {
  const profile = useAuthStore((s) => s.profile);

  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<Project> => {
      if (!profile?.tenant_id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          tenant_id: profile.tenant_id,
          name: input.name,
          description: input.description || null,
          status: input.status || 'active',
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          has_hours_enabled: input.has_hours_enabled || false,
          created_by: profile.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-add creator as admin member
      await supabase.from('project_members').insert({
        tenant_id: profile.tenant_id,
        project_id: data.id,
        user_id: profile.user_id,
        permission: 'admin',
        status: 'accepted',
      });

      return data as Project;
    },
    [profile],
  );

  const updateProject = useCallback(
    async (projectId: string, input: UpdateProjectInput): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .update(dbUpdate(input))
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    [],
  );

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', projectId);

    if (error) throw error;
  }, []);

  return { createProject, updateProject, deleteProject };
}
