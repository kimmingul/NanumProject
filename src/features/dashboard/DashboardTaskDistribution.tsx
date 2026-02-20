import { type ReactNode } from 'react';
import Chart, { Series, ArgumentAxis, ValueAxis, Size, Tooltip } from 'devextreme-react/chart';
import { useEnumOptions } from '@/hooks/useEnumOptions';
import type { TaskStatusCount } from '@/hooks/useDashboardData';

interface Props {
  data: TaskStatusCount[];
  loading: boolean;
}

export default function DashboardTaskDistribution({ data, loading }: Props): ReactNode {
  const { values, labels, colors } = useEnumOptions('task_status');

  // Ensure all statuses present and in order
  const chartData = values.map((status) => ({
    status: labels[status] || status,
    count: data.find((d) => d.task_status === status)?.count || 0,
    color: colors[status] || '#94a3b8',
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
