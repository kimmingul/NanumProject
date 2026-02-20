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
  manager_id?: string | undefined;
}

export interface UpdateProjectInput extends Partial<Omit<CreateProjectInput, 'manager_id'>> {
  is_starred?: boolean | undefined;
  is_active?: boolean | undefined;
  is_template?: boolean | undefined;
  manager_id?: string | null | undefined;
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
          manager_id: input.manager_id || profile.user_id,
        })
        .select()
        .single();

      if (error) throw error;
      const project = data as Project;

      // Auto-add creator as admin member
      await supabase.from('project_members').insert({
        tenant_id: profile.tenant_id,
        project_id: project.id,
        user_id: profile.user_id,
        permission: 'admin',
        status: 'accepted',
      });

      return project;
    },
    [profile],
  );

  const updateProject = useCallback(
    async (projectId: string, input: UpdateProjectInput): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .update(dbUpdate(input as unknown as Record<string, unknown>))
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

  const cloneFromTemplate = useCallback(
    async (templateId: string, name: string, startDate: string): Promise<string> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>)(
        'clone_project_from_template',
        { p_template_id: templateId, p_name: name, p_start_date: startDate },
      );
      if (error) throw error;
      return data as string;
    },
    [],
  );

  return { createProject, updateProject, deleteProject, cloneFromTemplate };
}
