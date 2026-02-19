import { type ReactNode } from 'react';
import Chart, { Series, ArgumentAxis, ValueAxis, Size, Tooltip } from 'devextreme-react/chart';
import type { TaskStatusCount } from '@/hooks/useDashboardData';

interface Props {
  data: TaskStatusCount[];
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const STATUS_ORDER = ['todo', 'in_progress', 'review', 'done'];

export default function DashboardTaskDistribution({ data, loading }: Props): ReactNode {
  // Ensure all statuses present and in order
  const chartData = STATUS_ORDER.map((status) => ({
    status: STATUS_LABELS[status],
    count: data.find((d) => d.task_status === status)?.count || 0,
    color: STATUS_COLORS[status],
  }));

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Task Distribution</h3>
      </div>
      <div className="dashboard-card-body dashboard-card-body-chart">
        {loading ? (
          <div className="dashboard-chart-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <Chart
            dataSource={chartData}
            rotated={true}
            customizePoint={(arg: { data: { color: string } }) => ({
              color: arg.data.color,
            })}
          >
            <Size height={200} />
            <Series
              argumentField="status"
              valueField="count"
              type="bar"
              barWidth={20}
              cornerRadius={4}
            />
            <ArgumentAxis visible={false} tick={{ visible: false }} grid={{ visible: false }} />
            <ValueAxis visible={false} tick={{ visible: false }} grid={{ visible: false }} label={{ visible: false }} />
            <Tooltip
              enabled={true}
              customizeTooltip={(arg: { argumentText?: string; valueText?: string }) => ({
                text: `${arg.argumentText || ''}: ${arg.valueText || ''}`,
              })}
            />
          </Chart>
        )}
      </div>
    </div>
  );
}
