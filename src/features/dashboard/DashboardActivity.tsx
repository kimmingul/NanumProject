import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActivityItem } from '@/hooks/useDashboardData';

interface Props {
  activities: ActivityItem[];
  loading: boolean;
}

const ACTION_VERBS: Record<string, string> = {
  create: 'created',
  insert: 'created',
  update: 'updated',
  delete: 'deleted',
  complete: 'completed',
  assign: 'assigned',
  comment: 'commented on',
  status_change: 'changed status of',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardActivity({ activities, loading }: Props): ReactNode {
  const navigate = useNavigate();

  const handleClick = (activity: ActivityItem) => {
    if (activity.project_id) {
      navigate(`/tasks/${activity.project_id}`);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Recent Activity</h3>
      </div>
      <div className="dashboard-card-body dashboard-card-body-flush">
        {loading ? (
          <div className="dashboard-skeleton-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="dashboard-skeleton-row dashboard-skeleton-row-avatar" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="dashboard-empty">
            <i className="dx-icon-clock" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((activity) => {
              const verb = ACTION_VERBS[activity.action] || activity.action;
              const targetName =
                (activity.details?.name as string) ||
                (activity.details?.item_name as string) ||
                activity.target_type;

              return (
                <div
                  key={activity.id}
                  className="activity-item"
                  onClick={() => handleClick(activity)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick(activity)}
                >
                  <div className="activity-avatar">
                    {activity.actor_avatar ? (
                      <img src={activity.actor_avatar} alt="" className="activity-avatar-img" />
                    ) : (
                      getInitials(activity.actor_name)
                    )}
                  </div>
                  <div className="activity-text">
                    <span className="activity-actor">{activity.actor_name || 'Unknown'}</span>
                    {' '}{verb}{' '}
                    <span className="activity-target">&ldquo;{targetName}&rdquo;</span>
                    {activity.project_name && (
                      <>
                        {' '}in{' '}
                        <span className="activity-project">{activity.project_name}</span>
                      </>
                    )}
                  </div>
                  <span className="activity-time">{relativeTime(activity.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
