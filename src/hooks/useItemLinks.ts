import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { ItemLink, ItemLinkWithNames, LinkType } from '@/types';

// item_links table is not yet in generated Supabase types,
// so we use untyped query helpers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const itemLinksTable = () => (supabase as any).from('item_links');

interface UseItemLinksResult {
  links: ItemLinkWithNames[];
  loading: boolean;
  addLink: (sourceId: string, targetId: string, linkType: LinkType) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useItemLinks(projectId: string | undefined, itemId: string | undefined): UseItemLinksResult {
  const [links, setLinks] = useState<ItemLinkWithNames[]>([]);
  const [loading, setLoading] = useState(false);
  const profile = useAuthStore((s) => s.profile);

  const fetchLinks = useCallback(async () => {
    if (!projectId || !itemId) return;
    setLoading(true);
    try {
      // Fetch links where item is source or target (bidirectional)
      const { data, error } = await itemLinksTable()
        .select('*')
        .eq('project_id', projectId)
        .or(`source_id.eq.${itemId},target_id.eq.${itemId}`);

      if (error) throw error;
      const rawLinks = (data ?? []) as ItemLink[];

      // Collect all referenced item IDs for name enrichment
      const itemIds = new Set<string>();
      for (const link of rawLinks) {
        itemIds.add(link.source_id);
        itemIds.add(link.target_id);
      }

      let nameMap = new Map<string, string>();
      if (itemIds.size > 0) {
        const { data: items } = await supabase
          .from('project_items')
          .select('id, name')
          .in('id', [...itemIds]);

        if (items) {
          nameMap = new Map(
            items.map((i: { id: string; name: string }) => [i.id, i.name]),
          );
        }
      }

      const enriched: ItemLinkWithNames[] = rawLinks.map((link) => ({
        ...link,
        source_name: nameMap.get(link.source_id) || 'Unknown',
        target_name: nameMap.get(link.target_id) || 'Unknown',
      }));

      setLinks(enriched);
    } catch (err) {
      console.error('Failed to fetch item links:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, itemId]);

  const addLink = useCallback(
    async (sourceId: string, targetId: string, linkType: LinkType) => {
      if (!projectId || !profile?.tenant_id) return;
      const { error } = await itemLinksTable().insert({
        tenant_id: profile.tenant_id,
        project_id: projectId,
        source_id: sourceId,
        target_id: targetId,
        link_type: linkType,
        created_by: profile.user_id,
      });
      if (error) throw error;
      await fetchLinks();
    },
    [projectId, profile, fetchLinks],
  );

  const deleteLink = useCallback(
    async (linkId: string) => {
      const { error } = await itemLinksTable().delete().eq('id', linkId);
      if (error) throw error;
      await fetchLinks();
    },
    [fetchLinks],
  );

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return { links, loading, addLink, deleteLink, refetch: fetchLinks };
}
