import { type ReactNode } from 'react';
import type { ProjectItem } from '@/types';

interface InfoTabProps {
  task: ProjectItem;
}

export default function InfoTab({ task }: InfoTabProps): ReactNode {
  return (
    <div className="tab-info">
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
        </div>
        <div className="task-info-row" style={{ marginTop: 8 }}>
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
          {task.days != null && task.days > 0 && (
            <div className="task-info-item">
              <span>{task.days}d</span>
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
        {task.description && (
          <div className="task-description" style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {task.description}
          </div>
        )}
      </div>
    </div>
  );
}
