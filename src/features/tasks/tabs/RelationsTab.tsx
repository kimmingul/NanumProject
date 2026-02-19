import { type ReactNode, useCallback, useState } from 'react';
import { Button } from 'devextreme-react/button';
import { SelectBox } from 'devextreme-react/select-box';
import { usePMStore } from '@/lib/pm-store';
import type { ProjectItem, LinkType } from '@/types';
import type { RelationItem, DependencyItem, LinkItem } from '@/hooks/useItemRelations';
import './RelationsTab.css';

interface RelationsTabProps {
  itemId: string;
  parent: RelationItem | null;
  children: RelationItem[];
  predecessors: DependencyItem[];
  successors: DependencyItem[];
  links: LinkItem[];
  allItems: ProjectItem[];
  onAddLink: (sourceId: string, targetId: string, linkType: LinkType) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

const linkTypeItems = [
  { value: 'blocks', text: 'Blocks' },
  { value: 'related_to', text: 'Related To' },
  { value: 'duplicates', text: 'Duplicates' },
];

const depTypeLabels: Record<string, string> = {
  fs: 'FS',
  ss: 'SS',
  ff: 'FF',
  sf: 'SF',
};

const typeIcons: Record<string, string> = {
  group: 'dx-icon-folder',
  task: 'dx-icon-detailslayout',
  milestone: 'dx-icon-event',
};

export default function RelationsTab({
  itemId,
  parent,
  children,
  predecessors,
  successors,
  links,
  allItems,
  onAddLink,
  onDeleteLink,
}: RelationsTabProps): ReactNode {
  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);
  const [newLinkType, setNewLinkType] = useState<LinkType>('related_to');
  const [newTargetId, setNewTargetId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Filter out current item and already-linked items for target selection
  const linkedIds = new Set([
    itemId,
    ...links.map((l) => l.linked_item_id),
  ]);
  const availableTargets = allItems
    .filter((i) => !linkedIds.has(i.id) && i.is_active)
    .map((i) => ({ id: i.id, name: `${i.name} (${i.item_type})` }));

  const handleNavigate = useCallback((id: string) => {
    setSelectedTaskId(id);
  }, [setSelectedTaskId]);

  const handleAddLink = useCallback(async () => {
    if (!newTargetId) return;
    setAdding(true);
    try {
      await onAddLink(itemId, newTargetId, newLinkType);
      setNewTargetId(null);
    } catch (err) {
      console.error('Failed to add link:', err);
    } finally {
      setAdding(false);
    }
  }, [itemId, newTargetId, newLinkType, onAddLink]);

  const renderRelationItem = (item: RelationItem, icon?: string) => (
    <div key={item.id} className="relation-row" onClick={() => handleNavigate(item.id)}>
      <i className={typeIcons[item.item_type] || 'dx-icon-detailslayout'} />
      <span className="relation-name">{item.name}</span>
      {icon && <span className="relation-badge">{icon}</span>}
    </div>
  );

  return (
    <div className="tab-relations">
      {/* Parent */}
      <div className="relation-group">
        <div className="relation-group-label">Parent</div>
        {parent ? (
          renderRelationItem(parent)
        ) : (
          <div className="relation-empty">No parent</div>
        )}
      </div>

      {/* Children */}
      <div className="relation-group">
        <div className="relation-group-label">Children ({children.length})</div>
        {children.length > 0 ? (
          children.map((c) => renderRelationItem(c))
        ) : (
          <div className="relation-empty">No children</div>
        )}
      </div>

      {/* Predecessors */}
      <div className="relation-group">
        <div className="relation-group-label">Predecessors ({predecessors.length})</div>
        {predecessors.length > 0 ? (
          predecessors.map((p) => (
            <div key={p.dependency_id} className="relation-row" onClick={() => handleNavigate(p.id)}>
              <i className={typeIcons[p.item_type] || 'dx-icon-detailslayout'} />
              <span className="relation-name">{p.name}</span>
              <span className="relation-badge dep">{depTypeLabels[p.dependency_type] || p.dependency_type}</span>
            </div>
          ))
        ) : (
          <div className="relation-empty">None</div>
        )}
      </div>

      {/* Successors */}
      <div className="relation-group">
        <div className="relation-group-label">Successors ({successors.length})</div>
        {successors.length > 0 ? (
          successors.map((s) => (
            <div key={s.dependency_id} className="relation-row" onClick={() => handleNavigate(s.id)}>
              <i className={typeIcons[s.item_type] || 'dx-icon-detailslayout'} />
              <span className="relation-name">{s.name}</span>
              <span className="relation-badge dep">{depTypeLabels[s.dependency_type] || s.dependency_type}</span>
            </div>
          ))
        ) : (
          <div className="relation-empty">None</div>
        )}
      </div>

      {/* Semantic Links */}
      <div className="relation-group">
        <div className="relation-group-label">Links ({links.length})</div>
        {links.length > 0 ? (
          links.map((l) => (
            <div key={l.id} className="relation-row">
              <span className={`link-type-icon ${l.link_type}`}>
                {l.link_type === 'blocks' ? '\u{1F534}' : l.link_type === 'duplicates' ? '\u{1F7E1}' : '\u{1F517}'}
              </span>
              <span
                className="relation-name clickable"
                onClick={() => handleNavigate(l.linked_item_id)}
              >
                {l.link_type} → {l.linked_item_name}
              </span>
              <Button
                icon="trash"
                stylingMode="text"
                hint="Remove link"
                className="relation-delete-btn"
                onClick={() => onDeleteLink(l.id)}
              />
            </div>
          ))
        ) : (
          <div className="relation-empty">No links</div>
        )}

        {/* Add Link UI */}
        <div className="add-link-row">
          <SelectBox
            items={linkTypeItems}
            displayExpr="text"
            valueExpr="value"
            value={newLinkType}
            onValueChanged={(e) => setNewLinkType(e.value)}
            width={120}
            stylingMode="outlined"
          />
          <SelectBox
            items={availableTargets}
            displayExpr="name"
            valueExpr="id"
            value={newTargetId}
            onValueChanged={(e) => setNewTargetId(e.value)}
            placeholder="Select item..."
            searchEnabled={true}
            stylingMode="outlined"
            showClearButton={true}
          />
          <Button
            icon="add"
            stylingMode="outlined"
            onClick={handleAddLink}
            disabled={!newTargetId || adding}
            hint="Add link"
          />
        </div>
      </div>
    </div>
  );
}
