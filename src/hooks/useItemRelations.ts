import { useMemo } from 'react';
import type { ProjectItem, TaskDependency, ItemLinkWithNames, DependencyType } from '@/types';

export interface RelationItem {
  id: string;
  name: string;
  item_type: string;
}

export interface DependencyItem extends RelationItem {
  dependency_type: DependencyType;
  dependency_id: string;
}

export interface LinkItem {
  id: string; // link ID
  linked_item_id: string;
  linked_item_name: string;
  link_type: string;
  direction: 'outgoing' | 'incoming';
}

interface UseItemRelationsResult {
  parent: RelationItem | null;
  children: RelationItem[];
  predecessors: DependencyItem[];
  successors: DependencyItem[];
  links: LinkItem[];
}

export function useItemRelations(
  itemId: string | undefined,
  items: ProjectItem[],
  dependencies: TaskDependency[],
  itemLinks: ItemLinkWithNames[],
): UseItemRelationsResult {
  return useMemo(() => {
    if (!itemId) {
      return { parent: null, children: [], predecessors: [], successors: [], links: [] };
    }

    const currentItem = items.find((i) => i.id === itemId);

    // Parent
    let parent: RelationItem | null = null;
    if (currentItem?.parent_id) {
      const p = items.find((i) => i.id === currentItem.parent_id);
      if (p) parent = { id: p.id, name: p.name, item_type: p.item_type };
    }

    // Children
    const children: RelationItem[] = items
      .filter((i) => i.parent_id === itemId && i.is_active)
      .map((i) => ({ id: i.id, name: i.name, item_type: i.item_type }));

    // Predecessors (items that must finish before this)
    const predecessors: DependencyItem[] = dependencies
      .filter((d) => d.successor_id === itemId)
      .map((d) => {
        const pred = items.find((i) => i.id === d.predecessor_id);
        return {
          id: pred?.id || d.predecessor_id,
          name: pred?.name || 'Unknown',
          item_type: pred?.item_type || 'task',
          dependency_type: d.dependency_type,
          dependency_id: d.id,
        };
      });

    // Successors (items that depend on this)
    const successors: DependencyItem[] = dependencies
      .filter((d) => d.predecessor_id === itemId)
      .map((d) => {
        const succ = items.find((i) => i.id === d.successor_id);
        return {
          id: succ?.id || d.successor_id,
          name: succ?.name || 'Unknown',
          item_type: succ?.item_type || 'task',
          dependency_type: d.dependency_type,
          dependency_id: d.id,
        };
      });

    // Semantic links (bidirectional)
    const links: LinkItem[] = itemLinks.map((link) => {
      const isSource = link.source_id === itemId;
      return {
        id: link.id,
        linked_item_id: isSource ? link.target_id : link.source_id,
        linked_item_name: isSource ? link.target_name : link.source_name,
        link_type: link.link_type,
        direction: isSource ? 'outgoing' as const : 'incoming' as const,
      };
    });

    return { parent, children, predecessors, successors, links };
  }, [itemId, items, dependencies, itemLinks]);
}
