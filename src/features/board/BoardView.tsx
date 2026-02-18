import { type ReactNode, useCallback, useMemo, useState } from 'react';
import Sortable, { type DragEndEvent } from 'devextreme-react/sortable';
import { useProjectItems } from '@/hooks/useProjectItems';
import { supabase } from '@/lib/supabase';
import TaskDetailPopup from '@/features/tasks/TaskDetailPopup';
import type { ProjectItem } from '@/types';
import './BoardView.css';

interface BoardViewProps {
  projectId: string;
}

type BoardStatus = 'todo' | 'in_progress' | 'review' | 'done';

interface BoardColumn {
  id: BoardStatus;
  label: string;
}

const COLUMNS: BoardColumn[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

function getBoardStatus(item: ProjectItem): BoardStatus {
  const status = item.custom_fields?.board_status;
  if (
    status === 'todo' ||
    status === 'in_progress' ||
    status === 'review' ||
    status === 'done'
  ) {
    return status as BoardStatus;
  }
  return 'todo';
}

export default function BoardView({ projectId }: BoardViewProps): ReactNode {
  const { items, resources, assignments, loading, error, refetch } =
    useProjectItems(projectId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Only tasks (no groups / milestones)
  const tasks = useMemo(() => items.filter((i) => i.item_type === 'task'), [items]);

  // Assignee lookup
  const resourceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resources) map.set(r.id, r.text);
    return map;
  }, [resources]);

  const assigneeNameFor = useCallback(
    (itemId: string) => {
      const names = assignments
        .filter((a) => a.item_id === itemId)
        .map((a) => resourceMap.get(a.user_id) || 'Unknown');
      return names.join(', ');
    },
    [assignments, resourceMap],
  );

  // Group tasks by board status
  const grouped = useMemo(() => {
    const map: Record<BoardStatus, ProjectItem[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of tasks) {
      map[getBoardStatus(t)].push(t);
    }
    return map;
  }, [tasks]);

  // Handle drag-end across columns
  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { fromData, toData, fromIndex, toIndex } = e;
      if (fromData === undefined || toData === undefined) return;
      const fromCol = fromData as BoardStatus;
      const toCol = toData as BoardStatus;

      // Find the dragged item
      const sourceItems = grouped[fromCol];
      const draggedItem = sourceItems[fromIndex];
      if (!draggedItem) return;

      // Optimistic: only update DB if column actually changed or reorder
      if (fromCol === toCol && fromIndex === toIndex) return;

      try {
        await supabase
          .from('project_items')
          .update({
            custom_fields: {
              ...draggedItem.custom_fields,
              board_status: toCol,
            },
          })
          .eq('id', draggedItem.id);
        await refetch();
      } catch (err) {
        console.error('Failed to update board status:', err);
      }
    },
    [grouped, refetch],
  );

  if (loading) {
    return (
      <div className="board-loading">
        <div className="loading-spinner" />
        <p>Loading board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-error">
        <i className="dx-icon-warning" />
        <p>{error}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="board-empty">
        <i className="dx-icon-contentlayout" />
        <h3>No tasks yet</h3>
        <p>Create tasks to see them on the board.</p>
      </div>
    );
  }

  return (
    <div className="board-view">
      <div className="board-columns">
        {COLUMNS.map((col) => {
          const colTasks = grouped[col.id];
          return (
            <div key={col.id} className={`board-column board-column-${col.id}`}>
              <div className="board-column-header">
                <h4>{col.label}</h4>
                <span className="board-column-count">{colTasks.length}</span>
              </div>
              <Sortable
                className="board-column-cards"
                group="board"
                data={col.id}
                allowReordering={true}
                onDragEnd={handleDragEnd}
              >
                {colTasks.map((task) => {
                  const assignee = assigneeNameFor(task.id);
                  const dates = [task.start_date, task.end_date]
                    .filter(Boolean)
                    .join(' ~ ');
                  return (
                    <div
                      key={task.id}
                      className="board-card"
                      onClick={() => setSelectedItemId(task.id)}
                    >
                      <div className="board-card-name">{task.name}</div>
                      <div className="board-card-meta">
                        {assignee && (
                          <span className="board-card-assignee">
                            <i className="dx-icon-user" />
                            {assignee}
                          </span>
                        )}
                        {dates && <span className="board-card-dates">{dates}</span>}
                        {task.percent_complete > 0 && (
                          <span className="board-card-progress">
                            <span className="board-card-progress-bar">
                              <span
                                className="board-card-progress-fill"
                                style={{ width: `${task.percent_complete}%` }}
                              />
                            </span>
                            <span className="board-card-progress-text">
                              {task.percent_complete}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Sortable>
            </div>
          );
        })}
      </div>

      <TaskDetailPopup
        visible={selectedItemId !== null}
        projectId={projectId}
        itemId={selectedItemId}
        onHiding={() => setSelectedItemId(null)}
        onTaskUpdated={refetch}
      />
    </div>
  );
}
