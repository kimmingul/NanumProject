import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Popup } from 'devextreme-react/popup';
import { CheckBox } from 'devextreme-react/check-box';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';
import { supabase } from '@/lib/supabase';
import { useChecklist } from '@/hooks/useChecklist';
import type { ProjectItem } from '@/types';
import './TaskDetailPopup.css';

interface TaskDetailPopupProps {
  visible: boolean;
  projectId: string;
  itemId: string | null;
  onHiding: () => void;
  onTaskUpdated?: () => void;
}

export default function TaskDetailPopup({
  visible,
  projectId,
  itemId,
  onHiding,
  onTaskUpdated,
}: TaskDetailPopupProps): ReactNode {
  const [task, setTask] = useState<ProjectItem | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const { items: checklistItems, loading: checklistLoading, addItem, deleteItem, toggleItem } =
    useChecklist(itemId ?? undefined);

  // Fetch task details
  useEffect(() => {
    if (!itemId || !visible) {
      setTask(null);
      return;
    }

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
        setTask(data as ProjectItem);
      } catch (err) {
        console.error('Failed to load task:', err);
      } finally {
        setTaskLoading(false);
      }
    };

    fetchTask();
  }, [itemId, projectId, visible]);

  const handleAddChecklistItem = useCallback(async () => {
    if (!newItemText.trim()) return;
    try {
      await addItem(newItemText.trim());
      setNewItemText('');
      onTaskUpdated?.();
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  }, [newItemText, addItem, onTaskUpdated]);

  const handleKeyDown = (e: { event?: { key: string } }) => {
    if (e.event?.key === 'Enter') {
      handleAddChecklistItem();
    }
  };

  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Popup
      visible={visible}
      onHiding={onHiding}
      title={task?.name || 'Task Details'}
      width={560}
      height="auto"
      maxHeight="80vh"
      showCloseButton={true}
    >
      <div className="task-detail-content">
        {taskLoading ? (
          <div className="checklist-loading">Loading task details...</div>
        ) : task ? (
          <>
            {/* Task Info */}
            <div className="task-info-section">
              <div className="task-info-row">
                <div className="task-info-item">
                  <i className="dx-icon-info" />
                  <span className={`item-type-badge type-${task.item_type}`}>
                    {task.item_type}
                  </span>
                </div>
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

            {/* Checklist */}
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
                      <button
                        className="checklist-delete-btn"
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                      >
                        <i className="dx-icon-trash" />
                      </button>
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
          </>
        ) : (
          <div className="checklist-loading">Task not found.</div>
        )}
      </div>
    </Popup>
  );
}
