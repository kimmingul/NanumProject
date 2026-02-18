import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PMActivityLog } from '@/types';

interface ActivityLogWithActor extends PMActivityLog {
  actor_name: string | null;
}

interface UseActivityLogResult {
  logs: ActivityLogWithActor[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useActivityLog(
  projectId: string | undefined,
  filters?: { action?: string; dateFrom?: string; dateTo?: string },
): UseActivityLogResult {
  const [logs, setLogs] = useState<ActivityLogWithActor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Fetch actor profiles
      const rows = (data ?? []) as PMActivityLog[];
      const actorIds = [...new Set(rows.map((l) => l.actor_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, string>();

      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', actorIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: { user_id: string; full_name: string | null }) => [
              p.user_id,
              p.full_name || 'Unknown',
            ]),
          );
        }
      }

      const enriched: ActivityLogWithActor[] = (data ?? []).map((l: Record<string, unknown>) => ({
        ...(l as unknown as PMActivityLog),
        actor_name: l.actor_id ? profileMap.get(l.actor_id as string) ?? null : null,
      }));

      setLogs(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activity log';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, filters?.action, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}
