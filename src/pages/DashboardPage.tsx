import { type ReactNode } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardGreeting from '@/features/dashboard/DashboardGreeting';
import DashboardKPIRow from '@/features/dashboard/DashboardKPIRow';
import DashboardMyTasks from '@/features/dashboard/DashboardMyTasks';
import DashboardAtRisk from '@/features/dashboard/DashboardAtRisk';
import DashboardProjectStatus from '@/features/dashboard/DashboardProjectStatus';
import DashboardTaskDistribution from '@/features/dashboard/DashboardTaskDistribution';
import DashboardUpcoming from '@/features/dashboard/DashboardUpcoming';
import DashboardActivity from '@/features/dashboard/DashboardActivity';
import './DashboardPage.css';

export default function DashboardPage(): ReactNode {
  const data = useDashboardData();

  return (
    <div className="dashboard-page">
      {/* Row 0 — Greeting */}
      <DashboardGreeting />

      {/* Row 1 — KPI Cards */}
      <DashboardKPIRow kpi={data.kpi} loading={data.loading.kpi} />

      {/* Row 2 — My Tasks (2fr) + Overdue Items (1fr) */}
      <div className="dashboard-row dashboard-row-2">
        <DashboardMyTasks tasks={data.myTasks} loading={data.loading.lists} />
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
