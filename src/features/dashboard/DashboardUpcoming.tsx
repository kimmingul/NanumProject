import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardTaskItem } from '@/hooks/useDashboardData';

interface Props {
  items: DashboardTaskItem[];
  loading: boolean;
}

interface DateGroup {
  date: string;
  label: string;
  items: DashboardTaskItem[];
}

function groupByDate(items: DashboardTaskItem[]): DateGroup[] {
  const groups = new Map<string, DashboardTaskItem[]>();
  for (const item of items) {
    const key = item.end_date || 'No date';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return Array.from(groups.entries()).map(([date, groupItems]) => ({
    date,
    label:
      date === 'No date'
        ? 'No date'
        : new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          }),
    items: groupItems,
  }));
}

export default function DashboardUpcoming({ items, loading }: Props): ReactNode {
  const navigate = useNavigate();
  const groups = groupByDate(items);

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Upcoming Deadlines</h3>
      </div>
      <div className="dashboard-card-body dashboard-card-body-flush">
        {loading ? (
          <div className="dashboard-skeleton-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-skeleton-row" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="dashboard-empty">
            <i className="dx-icon-event" />
            <p>No deadlines in the next 2 weeks</p>
          </div>
        ) : (
          <div className="upcoming-list">
            {groups.map((group) => (
              <div key={group.date} className="upcoming-group">
                <div className="upcoming-date-header">{group.label}</div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="upcoming-item"
                    onClick={() => navigate(`/tasks/${item.project_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${item.project_id}`)}
                  >
                    <span
                      className={`upcoming-dot ${item.item_type === 'milestone' ? 'upcoming-dot-milestone' : 'upcoming-dot-task'}`}
                    />
                    <div className="upcoming-item-info">
                      <span className="upcoming-item-name">{item.name}</span>
                      <span className="upcoming-item-project">{item.project_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
