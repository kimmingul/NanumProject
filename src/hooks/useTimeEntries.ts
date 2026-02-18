import { useCallback, useEffect, useState } from 'react';
import { supabase, dbUpdate } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { TimeEntry } from '@/types';

interface TimeEntryWithDetails extends TimeEntry {
  task_name: string | null;
  user_name: string | null;
}

interface UseTimeEntriesResult {
  entries: TimeEntryWithDetails[];
  loading: boolean;
  error: string | null;
  addEntry: (entry: {
    item_id: string;
    start_time: string;
    end_time?: string;
    duration_minutes: number;
    note?: string;
  }) => Promise<void>;
  updateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTimeEntries(
  projectId: string | undefined,
  filters?: { userId?: string; dateFrom?: string; dateTo?: string },
): UseTimeEntriesResult {
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);

  const fetchEntries = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('start_time', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.dateFrom) {
        query = query.gte('start_time', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('start_time', filters.dateTo + 'T23:59:59');
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Fetch task names
      const rows = (data ?? []) as TimeEntry[];
      const itemIds = [...new Set(rows.map((e) => e.item_id).filter(Boolean))] as string[];
      let taskMap = new Map<string, string>();

      if (itemIds.length > 0) {
        const { data: items } = await supabase
          .from('project_items')
          .select('id, name')
          .in('id', itemIds);

        if (items) {
          taskMap = new Map(
            items.map((i: { id: string; name: string }) => [i.id, i.name]),
          );
        }
      }

      // Fetch user names
      const userIds = [...new Set(rows.map((e) => e.user_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: { user_id: string; full_name: string | null }) => [
              p.user_id,
              p.full_name || 'Unknown',
            ]),
          );
        }
      }

      const enriched: TimeEntryWithDetails[] = (data ?? []).map((e: Record<string, unknown>) => ({
        ...(e as unknown as TimeEntry),
        task_name: e.item_id ? taskMap.get(e.item_id as string) ?? null : null,
        user_name: e.user_id ? profileMap.get(e.user_id as string) ?? null : null,
      }));

      setEntries(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load time entries';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, filters?.userId, filters?.dateFrom, filters?.dateTo]);

  const addEntry = useCallback(
    async (entry: {
      item_id: string;
      start_time: string;
      end_time?: string;
      duration_minutes: number;
      note?: string;
    }) => {
      if (!projectId || !profile) return;

      const { error: insertError } = await supabase.from('time_entries').insert({
        tenant_id: profile.tenant_id,
        project_id: projectId,
        item_id: entry.item_id,
        user_id: profile.user_id,
        entry_type: 'manual',
        start_time: entry.start_time,
        end_time: entry.end_time || null,
        duration_minutes: entry.duration_minutes,
        note: entry.note || null,
      });

      if (insertError) throw insertError;
      await fetchEntries();
    },
    [projectId, profile, fetchEntries],
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<TimeEntry>) => {
      const { error: updateError } = await supabase
        .from('time_entries')
        .update(dbUpdate(updates))
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchEntries();
    },
    [fetchEntries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error: delError } = await supabase
        .from('time_entries')
        .update({ is_active: false })
        .eq('id', id);

      if (delError) throw delError;
      await fetchEntries();
    },
    [fetchEntries],
  );

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, error, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
