import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardTaskItem } from '@/hooks/useDashboardData';

interface Props {
  items: DashboardTaskItem[];
  loading: boolean;
}

function daysOverdue(endDate: string): number {
  const todayMs = new Date(new Date().toISOString().split('T')[0]).getTime();
  const endMs = new Date(endDate).getTime();
  return Math.ceil((todayMs - endMs) / (1000 * 60 * 60 * 24));
}

export default function DashboardAtRisk({ items, loading }: Props): ReactNode {
  const navigate = useNavigate();

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Overdue Items</h3>
        <span className="dashboard-card-badge badge-danger">{loading ? '...' : items.length}</span>
      </div>
      <div className="dashboard-card-body dashboard-card-body-flush">
        {loading ? (
          <div className="dashboard-skeleton-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-skeleton-row" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="dashboard-empty">
            <i className="dx-icon-like" />
            <p>No overdue items</p>
          </div>
        ) : (
          <div className="at-risk-list">
            {items.map((item) => {
              const days = item.end_date ? daysOverdue(item.end_date) : 0;
              return (
                <div
                  key={item.id}
                  className="at-risk-item"
                  onClick={() => navigate(`/tasks/${item.project_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${item.project_id}`)}
                >
                  <span className="at-risk-dot" />
                  <div className="at-risk-info">
                    <span className="at-risk-name">{item.name}</span>
                    <span className="at-risk-project">{item.project_name}</span>
                  </div>
                  <span className="at-risk-days">{days}d</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
