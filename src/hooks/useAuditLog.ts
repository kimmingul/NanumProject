import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/types';

export interface AuditLogWithUser extends AuditLog {
  user_email: string | null;
  user_name: string | null;
}

interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UseAuditLogResult {
  logs: AuditLogWithUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuditLog(filters?: AuditLogFilters): UseAuditLogResult {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Fetch user profiles
      const userIds = [
        ...new Set(
          (data ?? [])
            .map((l: { user_id: string | null }) => l.user_id)
            .filter(Boolean),
        ),
      ] as string[];

      let profileMap = new Map<string, { email: string; name: string }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map(
              (p: {
                user_id: string;
                email: string | null;
                full_name: string | null;
              }) => [
                p.user_id,
                {
                  email: p.email || 'Unknown',
                  name: p.full_name || 'Unknown',
                },
              ],
            ),
          );
        }
      }

      const enriched: AuditLogWithUser[] = (data ?? []).map(
        (l: Record<string, unknown>) => ({
          ...(l as unknown as AuditLog),
          user_email: l.user_id
            ? (profileMap.get(l.user_id as string)?.email ?? null)
            : null,
          user_name: l.user_id
            ? (profileMap.get(l.user_id as string)?.name ?? null)
            : null,
        }),
      );

      setLogs(enriched);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters?.action, filters?.resource_type, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}
