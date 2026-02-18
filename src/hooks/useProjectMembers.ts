import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { ProjectMember, ProjectMemberWithProfile, MemberPermission } from '@/types';

interface UseProjectMembersResult {
  members: ProjectMemberWithProfile[];
  loading: boolean;
  error: string | null;
  addMember: (userId: string, permission: MemberPermission) => Promise<void>;
  updateMemberPermission: (memberId: string, permission: MemberPermission) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectMembers(projectId: string | undefined): UseProjectMembersResult {
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: membersData, error: fetchError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const memberRows = (membersData ?? []) as ProjectMember[];
      const userIds = memberRows.map((m) => m.user_id);
      let profileMap = new Map<string, { full_name: string | null; email: string; avatar_url: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: { user_id: string; full_name: string | null; email: string; avatar_url: string | null }) => [
              p.user_id,
              { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url },
            ]),
          );
        }
      }

      const enriched: ProjectMemberWithProfile[] = (membersData ?? []).map((m: Record<string, unknown>) => ({
        ...(m as unknown as ProjectMemberWithProfile),
        profile: profileMap.get(m.user_id as string) ?? { full_name: null, email: '', avatar_url: null },
      }));

      setMembers(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load members';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const addMember = useCallback(
    async (userId: string, permission: MemberPermission) => {
      if (!projectId || !profile) return;

      const { error: insertError } = await supabase.from('project_members').insert({
        tenant_id: profile.tenant_id,
        project_id: projectId,
        user_id: userId,
        permission,
        status: 'accepted',
      });

      if (insertError) throw insertError;
      await fetchMembers();
    },
    [projectId, profile, fetchMembers],
  );

  const updateMemberPermission = useCallback(
    async (memberId: string, permission: MemberPermission) => {
      const { error: updateError } = await supabase
        .from('project_members')
        .update({ permission })
        .eq('id', memberId);

      if (updateError) throw updateError;
      await fetchMembers();
    },
    [fetchMembers],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const { error: delError } = await supabase
        .from('project_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (delError) throw delError;
      await fetchMembers();
    },
    [fetchMembers],
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    addMember,
    updateMemberPermission,
    removeMember,
    refetch: fetchMembers,
  };
}
