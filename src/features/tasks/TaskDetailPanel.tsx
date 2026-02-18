import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { CheckBox } from 'devextreme-react/check-box';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';
import { supabase } from '@/lib/supabase';
import { useChecklist } from '@/hooks/useChecklist';
import type { ProjectItem } from '@/types';
import './TaskDetailPopup.css';

interface TaskDetailPanelProps {
  projectId: string;
  itemId: string;
}

export default function TaskDetailPanel({ projectId, itemId }: TaskDetailPanelProps): ReactNode {
  const [task, setTask] = useState<ProjectItem | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const { items: checklistItems, loading: checklistLoading, addItem, deleteItem, toggleItem } =
    useChecklist(itemId);

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

  const handleAddChecklistItem = useCallback(async () => {
    if (!newItemText.trim()) return;
    try {
      await addItem(newItemText.trim());
      setNewItemText('');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  }, [newItemText, addItem]);

  const handleKeyDown = (e: { event?: { key: string } }) => {
    if (e.event?.key === 'Enter') {
      handleAddChecklistItem();
    }
  };

  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (taskLoading) {
    return <div className="checklist-loading">Loading task details...</div>;
  }

  if (!task) {
    return <div className="checklist-loading">Task not found.</div>;
  }

  return (
    <div className="task-detail-content">
      <div className="task-info-section">
        <div className="task-info-row">
          <div className="task-info-item">
            <i className="dx-icon-info" />
            <span className={`item-type-badge type-${task.item_type}`}>
              {task.item_type}
            </span>
          </div>
          {task.item_type === 'task' && (
            <div className="task-info-item">
              <span className={`task-status-badge status-${task.task_status}`}>
                {task.task_status === 'in_progress' ? 'In Progress' : task.task_status === 'todo' ? 'To Do' : task.task_status === 'review' ? 'Review' : 'Done'}
              </span>
            </div>
          )}
          {task.start_date && (
            <div className="task-info-item">
              <i className="dx-icon-event" />
              <span>{task.start_date}</span>
            </div>
          )}
          {task.end_date && (
            <div className="task-info-item">
              <span>~ {task.end_date}</span>
            </div>
          )}
        </div>
        <div className="task-detail-progress">
          <div className="task-detail-progress-bar">
            <div
              className="task-detail-progress-fill"
              style={{ width: `${task.percent_complete}%` }}
            />
          </div>
          <span className="task-detail-progress-text">{task.percent_complete}%</span>
        </div>
      </div>

      <div className="checklist-section">
        <div className="checklist-header">
          <h4>Checklist</h4>
          <span className="checklist-progress-text">
            {completedCount} of {totalCount} completed
          </span>
        </div>

        {totalCount > 0 && (
          <div className="checklist-progress-bar">
            <div
              className="checklist-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {checklistLoading ? (
          <div className="checklist-loading">Loading checklist...</div>
        ) : (
          <div className="checklist-items">
            {checklistItems.map((item) => (
              <div key={item.id} className="checklist-item">
                <CheckBox
                  value={item.is_completed}
                  onValueChanged={() => toggleItem(item)}
                />
                <span className={`checklist-item-text ${item.is_completed ? 'completed' : ''}`}>
                  {item.name}
                </span>
                <Button
                  icon="trash"
                  stylingMode="text"
                  hint="Delete"
                  className="checklist-delete-btn"
                  onClick={() => deleteItem(item.id)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="checklist-add-row">
          <TextBox
            value={newItemText}
            onValueChanged={(e) => setNewItemText(e.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a checklist item..."
            stylingMode="outlined"
          />
          <Button
            icon="add"
            stylingMode="outlined"
            onClick={handleAddChecklistItem}
            disabled={!newItemText.trim()}
            hint="Add item"
          />
        </div>
      </div>
    </div>
  );
}
