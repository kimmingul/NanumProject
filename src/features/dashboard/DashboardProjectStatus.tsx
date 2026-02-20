import { type ReactNode } from 'react';
import PieChart, { Series, Legend, Tooltip, Size } from 'devextreme-react/pie-chart';
import { useEnumOptions } from '@/hooks/useEnumOptions';
import type { ProjectStatusCount } from '@/hooks/useDashboardData';

interface Props {
  data: ProjectStatusCount[];
  loading: boolean;
}

export default function DashboardProjectStatus({ data, loading }: Props): ReactNode {
  const { values, labels, colors } = useEnumOptions('project_status');
  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Ensure all statuses are present for consistent chart
  const chartData = values.map((status) => ({
    status: labels[status] || status,
    count: data.find((d) => d.status === status)?.count || 0,
    rawStatus: status,
  }));

  const palette = values.map((v) => colors[v] || '#94a3b8');

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Project Status</h3>
      </div>
      <div className="dashboard-card-body dashboard-card-body-chart">
        {loading ? (
          <div className="dashboard-chart-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <div className="project-status-chart">
            <PieChart
              dataSource={chartData}
              type="doughnut"
              innerRadius={0.65}
              customizePoint={(arg: { argument: string }) => ({
                color: colors[chartData.find((d) => d.status === arg.argument)?.rawStatus || ''] || '#94a3b8',
              })}
              palette={palette}
            >
              <Size height={200} />
              <Series argumentField="status" valueField="count" />
              <Legend
                visible={true}
                orientation="horizontal"
                horizontalAlignment="center"
                verticalAlignment="bottom"
                itemTextPosition="right"
                font={{ size: 12 }}
              />
              <Tooltip
                enabled={true}
                customizeTooltip={(arg: { argumentText?: string; valueText?: string; percent?: number }) => ({
                  text: `${arg.argumentText || ''}: ${arg.valueText || ''} (${Math.round((arg.percent ?? 0) * 100)}%)`,
                })}
              />
            </PieChart>
            <div className="project-status-center">
              <span className="project-status-total">{total}</span>
              <span className="project-status-label">Projects</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
