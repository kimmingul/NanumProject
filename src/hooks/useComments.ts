import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { PMComment, CommentTarget } from '@/types';

interface CommentWithAuthor extends PMComment {
  author_name: string | null;
  author_email: string | null;
}

interface UseCommentsResult {
  comments: CommentWithAuthor[];
  loading: boolean;
  error: string | null;
  addComment: (message: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useComments(
  projectId: string | undefined,
  targetType: CommentTarget = 'project',
  targetId?: string,
): UseCommentsResult {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);

  const effectiveTargetId = targetId || projectId;

  const fetchComments = useCallback(async () => {
    if (!projectId || !effectiveTargetId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('project_id', projectId)
        .eq('target_type', targetType)
        .eq('target_id', effectiveTargetId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch author profiles
      const rows = (data ?? []) as PMComment[];
      const userIds = [...new Set(rows.map((c) => c.created_by).filter(Boolean))] as string[];
      let profileMap = new Map<string, { full_name: string | null; email: string }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: { user_id: string; full_name: string | null; email: string }) => [
              p.user_id,
              { full_name: p.full_name, email: p.email },
            ]),
          );
        }
      }

      const enriched: CommentWithAuthor[] = (data ?? []).map((c: Record<string, unknown>) => {
        const authorProfile = c.created_by ? profileMap.get(c.created_by as string) : null;
        return {
          ...(c as unknown as PMComment),
          author_name: authorProfile?.full_name ?? null,
          author_email: authorProfile?.email ?? null,
        };
      });

      setComments(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load comments';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, targetType, effectiveTargetId]);

  const addComment = useCallback(
    async (message: string) => {
      if (!projectId || !effectiveTargetId || !profile) return;

      const { error: insertError } = await supabase.from('comments').insert({
        tenant_id: profile.tenant_id,
        project_id: projectId,
        target_type: targetType,
        target_id: effectiveTargetId,
        message,
        created_by: profile.user_id,
      });

      if (insertError) throw insertError;
      await fetchComments();
    },
    [projectId, targetType, effectiveTargetId, profile, fetchComments],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const { error: delError } = await supabase
        .from('comments')
        .update({ is_active: false })
        .eq('id', commentId);

      if (delError) throw delError;
      await fetchComments();
    },
    [fetchComments],
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, addComment, deleteComment, refetch: fetchComments };
}
