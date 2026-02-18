import { useCallback, useEffect, useState } from 'react';
import { supabase, dbUpdate } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { ChecklistItem } from '@/types';

interface UseChecklistResult {
  items: ChecklistItem[];
  loading: boolean;
  error: string | null;
  addItem: (name: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<ChecklistItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItem: (item: ChecklistItem) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useChecklist(itemId: string | undefined): UseChecklistResult {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);

  const fetchItems = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('item_id', itemId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      setItems((data as ChecklistItem[]) ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load checklist';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const addItem = useCallback(
    async (name: string) => {
      if (!itemId || !profile) return;

      const nextOrder = items.length > 0
        ? Math.max(...items.map((i) => i.sort_order)) + 1
        : 0;

      const { error: insertError } = await supabase.from('checklist_items').insert({
        tenant_id: profile.tenant_id,
        item_id: itemId,
        name,
        sort_order: nextOrder,
      });

      if (insertError) throw insertError;
      await fetchItems();
    },
    [itemId, profile, items, fetchItems],
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<ChecklistItem>) => {
      const { error: updateError } = await supabase
        .from('checklist_items')
        .update(dbUpdate(updates))
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchItems();
    },
    [fetchItems],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const { error: delError } = await supabase
        .from('checklist_items')
        .update({ is_active: false })
        .eq('id', id);

      if (delError) throw delError;
      await fetchItems();
    },
    [fetchItems],
  );

  const toggleItem = useCallback(
    async (item: ChecklistItem) => {
      const nowCompleted = !item.is_completed;
      const updates: Record<string, unknown> = {
        is_completed: nowCompleted,
        completed_by: nowCompleted ? profile?.user_id ?? null : null,
        completed_at: nowCompleted ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from('checklist_items')
        .update(dbUpdate(updates))
        .eq('id', item.id);

      if (updateError) throw updateError;
      await fetchItems();
    },
    [profile, fetchItems],
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, addItem, updateItem, deleteItem, toggleItem, refetch: fetchItems };
}
