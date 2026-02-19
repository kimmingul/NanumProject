import { type ReactNode } from 'react';
import type { DashboardKPI } from '@/hooks/useDashboardData';

interface Props {
  kpi: DashboardKPI;
  loading: boolean;
}

export default function DashboardKPIRow({ kpi, loading }: Props): ReactNode {
  const v = (n: number) => (loading ? '...' : n.toLocaleString());

  return (
    <div className="dashboard-kpi-row">
      {/* Overdue Tasks */}
      <div className={`kpi-card ${!loading && kpi.overdueTasks > 0 ? 'kpi-card-danger' : ''}`}>
        <div className="kpi-icon kpi-icon-overdue">
          <i className="dx-icon-warning" />
        </div>
        <div className="kpi-body">
          <div className="kpi-value">{v(kpi.overdueTasks)}</div>
          <div className="kpi-label">Overdue Tasks</div>
        </div>
      </div>

      {/* In Progress */}
      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-progress">
          <i className="dx-icon-runner" />
        </div>
        <div className="kpi-body">
          <div className="kpi-value">{v(kpi.inProgressTasks)}</div>
          <div className="kpi-label">In Progress</div>
          {!loading && kpi.myInProgress > 0 && (
            <div className="kpi-sub">{kpi.myInProgress} assigned to me</div>
          )}
        </div>
      </div>

      {/* Due This Week */}
      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-due">
          <i className="dx-icon-clock" />
        </div>
        <div className="kpi-body">
          <div className="kpi-value">{v(kpi.dueThisWeek)}</div>
          <div className="kpi-label">Due This Week</div>
          {!loading && kpi.myDueThisWeek > 0 && (
            <div className="kpi-sub">{kpi.myDueThisWeek} assigned to me</div>
          )}
        </div>
      </div>

      {/* Completion Rate */}
      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-rate">
          <i className="dx-icon-chart" />
        </div>
        <div className="kpi-body">
          <div className="kpi-value">{loading ? '...' : `${kpi.completionRate}%`}</div>
          <div className="kpi-label">Completion Rate</div>
          {!loading && (
            <div className="kpi-mini-progress">
              <div className="kpi-mini-progress-track">
                <div
                  className="kpi-mini-progress-fill"
                  style={{ width: `${kpi.completionRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
