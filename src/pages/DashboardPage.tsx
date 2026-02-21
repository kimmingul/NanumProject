import { type ReactNode, useState } from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useProjects } from '@/hooks';
import DashboardGreeting from '@/features/dashboard/DashboardGreeting';
import DashboardKPIRow from '@/features/dashboard/DashboardKPIRow';
import DashboardMyTasks from '@/features/dashboard/DashboardMyTasks';
import DashboardAtRisk from '@/features/dashboard/DashboardAtRisk';
import DashboardProjectStatus from '@/features/dashboard/DashboardProjectStatus';
import DashboardTaskDistribution from '@/features/dashboard/DashboardTaskDistribution';
import DashboardUpcoming from '@/features/dashboard/DashboardUpcoming';
import DashboardActivity from '@/features/dashboard/DashboardActivity';
import './DashboardPage.css';

const periodOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
];

export default function DashboardPage(): ReactNode {
  const [period, setPeriod] = useState<string>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const { projects } = useProjects({ status: 'all', autoFetch: true });
  const data = useDashboardData({
    period: period === 'all' ? undefined : period,
    projectId: filterProjectId || undefined,
  });
  useAutoRefresh(data.refetch, 60_000);

  const projectFilterOptions = [
    { id: '', name: 'All Projects' },
    ...projects.map((p) => ({ id: p.id, name: p.name })),
  ];

  return (
    <div className="dashboard-page">
      {/* Row 0 — Greeting */}
      <DashboardGreeting />

      {/* Filter Bar */}
      <div className="dashboard-filter-bar">
        <SelectBox
          items={periodOptions}
          displayExpr="label"
          valueExpr="value"
          value={period}
          onValueChanged={(e) => setPeriod(e.value)}
          width={160}
          stylingMode="outlined"
        />
        <SelectBox
          items={projectFilterOptions}
          displayExpr="name"
          valueExpr="id"
          value={filterProjectId}
          onValueChanged={(e) => setFilterProjectId(e.value)}
          width={220}
          stylingMode="outlined"
          placeholder="All Projects"
        />
      </div>

      {/* Row 1 — KPI Cards */}
      <DashboardKPIRow kpi={data.kpi} loading={data.loading.kpi} />

      {/* Row 2 — My Tasks (2fr) + Overdue Items (1fr) */}
      <div className="dashboard-row dashboard-row-2">
        <DashboardMyTasks tasks={data.myTasks} totalCount={data.myTasksCount} loading={data.loading.lists} />
        <DashboardAtRisk items={data.overdueItems} loading={data.loading.lists} />
      </div>

      {/* Row 3 — Project Status + Task Distribution + Upcoming */}
      <div className="dashboard-row dashboard-row-3">
        <DashboardProjectStatus data={data.projectStatusCounts} loading={data.loading.charts} />
        <DashboardTaskDistribution data={data.taskStatusCounts} loading={data.loading.charts} />
        <DashboardUpcoming items={data.upcomingItems} loading={data.loading.lists} />
      </div>

      {/* Row 4 — Activity Feed */}
      <DashboardActivity activities={data.activities} loading={data.loading.activity} />
    </div>
  );
}
