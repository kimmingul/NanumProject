import { type ReactNode, useEffect, useState } from 'react';
import { TabPanel, Item } from 'devextreme-react/tab-panel';
import { supabase } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import { useItemLinks } from '@/hooks/useItemLinks';
import { useItemRelations } from '@/hooks/useItemRelations';
import type { ProjectItem, TaskDependency } from '@/types';
import InfoTab from './tabs/InfoTab';
import RelationsTab from './tabs/RelationsTab';
import CommentsTab from './tabs/CommentsTab';
import ChecklistTab from './tabs/ChecklistTab';
import './TaskDetailPanel.css';

interface TaskDetailPanelProps {
  projectId: string;
  itemId: string;
  items: ProjectItem[];
  dependencies: TaskDependency[];
}

export default function TaskDetailPanel({ projectId, itemId, items, dependencies }: TaskDetailPanelProps): ReactNode {
  const [task, setTask] = useState<ProjectItem | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const rightPanelTab = usePMStore((s) => s.rightPanelTab);
  const setRightPanelTab = usePMStore((s) => s.setRightPanelTab);

  const { links: itemLinks, addLink, deleteLink } = useItemLinks(projectId, itemId);
  const relations = useItemRelations(itemId, items, dependencies, itemLinks);

  useEffect(() => {
    let cancelled = false;
    const fetchTask = async () => {
      setTaskLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_items')
          .select('*')
          .eq('id', itemId)
          .eq('project_id', projectId)
          .single();

        if (error) throw error;
        if (!cancelled) setTask(data as ProjectItem);
      } catch (err) {
        console.error('Failed to load task:', err);
      } finally {
        if (!cancelled) setTaskLoading(false);
      }
    };

    fetchTask();
    return () => { cancelled = true; };
  }, [itemId, projectId]);

  if (taskLoading) {
    return <div className="checklist-loading">Loading task details...</div>;
  }

  if (!task) {
    return <div className="checklist-loading">Task not found.</div>;
  }

  return (
    <div className="task-detail-content">
      <TabPanel
        selectedIndex={rightPanelTab}
        onSelectedIndexChange={setRightPanelTab}
        swipeEnabled={false}
        animationEnabled={false}
        className="task-detail-tabs"
      >
        <Item title="Info" icon="info">
          <InfoTab task={task} />
        </Item>
        <Item title="Relations" icon="hierarchy">
          <RelationsTab
            itemId={itemId}
            parent={relations.parent}
            children={relations.children}
            predecessors={relations.predecessors}
            successors={relations.successors}
            links={relations.links}
            allItems={items}
            onAddLink={addLink}
            onDeleteLink={deleteLink}
          />
        </Item>
        <Item title="Comments" icon="comment">
          <CommentsTab projectId={projectId} itemId={itemId} />
        </Item>
        <Item title="Checklist" icon="checklist">
          <ChecklistTab itemId={itemId} />
        </Item>
      </TabPanel>
    </div>
  );
}
