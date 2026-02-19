import { type ReactNode, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { usePMStore } from '@/lib/pm-store';
import { useProjectItems } from '@/hooks/useProjectItems';
import TaskDetailPanel from '@/features/tasks/TaskDetailPanel';

export function RightPanel(): ReactNode {
  const { projectId } = useParams();
  const selectedTaskId = usePMStore((s) => s.selectedTaskId);
  const setRightPanelOpen = usePMStore((s) => s.setRightPanelOpen);
  const { items, dependencies } = useProjectItems(projectId);

  const selectedItemName = useMemo(() => {
    if (!selectedTaskId) return 'Task Detail';
    const item = items.find((i) => i.id === selectedTaskId);
    return item?.name || 'Task Detail';
  }, [selectedTaskId, items]);

  return (
    <aside className="ide-right-panel">
      <div className="right-panel-header">
        <span className="right-panel-title" title={selectedItemName}>
          {selectedItemName}
        </span>
        <Button
          icon="close"
          stylingMode="text"
          hint="Close panel"
          className="right-panel-close"
          onClick={() => setRightPanelOpen(false)}
        />
      </div>
      <div className="right-panel-body">
        {selectedTaskId && projectId ? (
          <TaskDetailPanel
            projectId={projectId}
            itemId={selectedTaskId}
            items={items}
            dependencies={dependencies}
          />
        ) : (
          <div className="right-panel-empty">
            <i className="dx-icon-detailslayout" />
            <p>Select a task to view details</p>
          </div>
        )}
      </div>
    </aside>
  );
}
