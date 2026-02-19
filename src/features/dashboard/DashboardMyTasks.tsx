import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardTaskItem } from '@/hooks/useDashboardData';

interface Props {
  tasks: DashboardTaskItem[];
  loading: boolean;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDueDate(endDate: string | null): { text: string; className: string } {
  if (!endDate) return { text: 'No date', className: 'due-none' };
  const todayStr = today();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (endDate < todayStr) {
    const diff = Math.ceil(
      (new Date(todayStr).getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return { text: `${diff}d overdue`, className: 'due-overdue' };
  }
  if (endDate === todayStr) return { text: 'Today', className: 'due-today' };
  if (endDate === tomorrowStr) return { text: 'Tomorrow', className: 'due-soon' };

  const d = new Date(endDate + 'T00:00:00');
  return {
    text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'due-normal',
  };
}

function statusColor(endDate: string | null, taskStatus: string): string {
  if (endDate && endDate < today()) return 'strip-overdue';
  if (taskStatus === 'in_progress') return 'strip-progress';
  if (taskStatus === 'review') return 'strip-review';
  return 'strip-todo';
}

export default function DashboardMyTasks({ tasks, loading }: Props): ReactNode {
  const navigate = useNavigate();

  const handleClick = (task: DashboardTaskItem) => {
    navigate(`/tasks/${task.project_id}`);
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">My Tasks</h3>
        <span className="dashboard-card-badge">{loading ? '...' : tasks.length}</span>
      </div>
      <div className="dashboard-card-body dashboard-card-body-flush">
        {loading ? (
          <div className="dashboard-skeleton-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-skeleton-row" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="dashboard-empty">
            <i className="dx-icon-todo" />
            <p>No tasks assigned to you</p>
          </div>
        ) : (
          <div className="my-tasks-list">
            {tasks.map((task) => {
              const due = formatDueDate(task.end_date);
              return (
                <div
                  key={task.id}
                  className="my-task-row"
                  onClick={() => handleClick(task)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick(task)}
                >
                  <span className={`my-task-strip ${statusColor(task.end_date, task.task_status)}`} />
                  <span className="my-task-name">{task.name}</span>
                  <span className="my-task-project">{task.project_name}</span>
                  <span className={`my-task-due ${due.className}`}>{due.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!loading && tasks.length > 0 && (
        <div className="dashboard-card-footer">
          <span
            className="dashboard-card-footer-link"
            onClick={() => navigate('/tasks')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/tasks')}
          >
            View All My Tasks &rarr;
          </span>
        </div>
      )}
    </div>
  );
}
