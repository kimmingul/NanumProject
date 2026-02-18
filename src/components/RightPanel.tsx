import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { usePMStore } from '@/lib/pm-store';
import TaskDetailPanel from '@/features/tasks/TaskDetailPanel';

export function RightPanel(): ReactNode {
  const { projectId } = useParams();
  const selectedTaskId = usePMStore((s) => s.selectedTaskId);
  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);

  return (
    <aside className="ide-right-panel">
      <div className="right-panel-header">
        <span className="right-panel-title">Task Detail</span>
        <Button
          icon="close"
          stylingMode="text"
          hint="Close panel"
          className="right-panel-close"
          onClick={() => setSelectedTaskId(null)}
        />
      </div>
      <div className="right-panel-body">
        {selectedTaskId && projectId ? (
          <TaskDetailPanel projectId={projectId} itemId={selectedTaskId} />
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
