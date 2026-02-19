import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

/* -------------------------------------------------- */
/* Types                                               */
/* -------------------------------------------------- */

export interface DashboardKPI {
  overdueTasks: number;
  inProgressTasks: number;
  dueThisWeek: number;
  completionRate: number;
  myInProgress: number;
  myDueThisWeek: number;
}

export interface DashboardTaskItem {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  item_type: string;
  task_status: string;
  percent_complete: number;
  end_date: string | null;
  start_date: string | null;
}

export interface ProjectStatusCount {
  status: string;
  count: number;
}

export interface TaskStatusCount {
  task_status: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  project_id: string | null;
  project_name: string | null;
  target_type: string;
  target_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DashboardData {
  kpi: DashboardKPI;
  myTasks: DashboardTaskItem[];
  overdueItems: DashboardTaskItem[];
  upcomingItems: DashboardTaskItem[];
  projectStatusCounts: ProjectStatusCount[];
  taskStatusCounts: TaskStatusCount[];
  activities: ActivityItem[];
  loading: {
    kpi: boolean;
    lists: boolean;
    charts: boolean;
    activity: boolean;
  };
}

/* -------------------------------------------------- */
/* Helpers                                             */
/* -------------------------------------------------- */

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/* -------------------------------------------------- */
/* Hook                                                */
/* -------------------------------------------------- */

export function useDashboardData(): DashboardData & { refetch: () => void } {
  const profile = useAuthStore((s) => s.profile);
  const userId = profile?.user_id;

  const [kpi, setKpi] = useState<DashboardKPI>({
    overdueTasks: 0,
    inProgressTasks: 0,
    dueThisWeek: 0,
    completionRate: 0,
    myInProgress: 0,
    myDueThisWeek: 0,
  });
  const [myTasks, setMyTasks] = useState<DashboardTaskItem[]>([]);
  const [overdueItems, setOverdueItems] = useState<DashboardTaskItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<DashboardTaskItem[]>([]);
  const [projectStatusCounts, setProjectStatusCounts] = useState<ProjectStatusCount[]>([]);
  const [taskStatusCounts, setTaskStatusCounts] = useState<TaskStatusCount[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [loading, setLoading] = useState({
    kpi: true,
    lists: true,
    charts: true,
    activity: true,
  });

  const fetchAll = useCallback(async () => {
    if (!profile?.tenant_id) return;

    const todayStr = today();
    const weekEndStr = daysFromNow(7);
    const twoWeeksStr = daysFromNow(14);

    setLoading({ kpi: true, lists: true, charts: true, activity: true });

    /* --- KPI queries (parallel) --- */
    const kpiPromise = Promise.all([
      // Overdue tasks
      supabase
        .from('project_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone'])
        .neq('task_status', 'done')
        .lt('end_date', todayStr)
        .not('end_date', 'is', null),
      // In-progress tasks
      supabase
        .from('project_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone'])
        .eq('task_status', 'in_progress'),
      // Due this week
      supabase
        .from('project_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone'])
        .neq('task_status', 'done')
        .gte('end_date', todayStr)
        .lte('end_date', weekEndStr),
      // Total tasks
      supabase
        .from('project_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone']),
      // Completed tasks
      supabase
        .from('project_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone'])
        .eq('task_status', 'done'),
      // My in-progress (assigned to me)
      userId
        ? supabase
            .from('task_assignees')
            .select('item_id, project_items!inner(task_status)')
            .eq('is_active', true)
            .eq('user_id', userId)
            .eq('project_items.task_status' as string, 'in_progress')
        : Promise.resolve({ data: [], error: null }),
      // My due this week
      userId
        ? supabase
            .from('task_assignees')
            .select('item_id, project_items!inner(end_date, task_status)')
            .eq('is_active', true)
            .eq('user_id', userId)
            .neq('project_items.task_status' as string, 'done')
            .gte('project_items.end_date' as string, todayStr)
            .lte('project_items.end_date' as string, weekEndStr)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([overdueRes, inProgRes, dueWeekRes, totalRes, completedRes, myInProgRes, myDueRes]) => {
      const total = totalRes.count ?? 0;
      const completed = completedRes.count ?? 0;
      setKpi({
        overdueTasks: overdueRes.count ?? 0,
        inProgressTasks: inProgRes.count ?? 0,
        dueThisWeek: dueWeekRes.count ?? 0,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        myInProgress: myInProgRes.data?.length ?? 0,
        myDueThisWeek: myDueRes.data?.length ?? 0,
      });
      setLoading((prev) => ({ ...prev, kpi: false }));
    });

    /* --- List queries (parallel) --- */
    const listsPromise = Promise.all([
      // My tasks (assigned to me, not done, limit 8)
      userId
        ? supabase
            .from('task_assignees')
            .select(`
              item_id,
              project_items!inner(
                id, name, project_id, item_type, task_status, percent_complete, end_date, start_date
              )
            `)
            .eq('is_active', true)
            .eq('user_id', userId)
            .neq('project_items.task_status' as string, 'done')
            .order('item_id')
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
      // Overdue items (top 6)
      supabase
        .from('project_items')
        .select('id, name, project_id, item_type, task_status, percent_complete, end_date, start_date')
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone'])
        .neq('task_status', 'done')
        .lt('end_date', todayStr)
        .not('end_date', 'is', null)
        .order('end_date', { ascending: true })
        .limit(6),
      // Upcoming deadlines (next 14 days, limit 10)
      supabase
        .from('project_items')
        .select('id, name, project_id, item_type, task_status, percent_complete, end_date, start_date')
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone'])
        .neq('task_status', 'done')
        .gte('end_date', todayStr)
        .lte('end_date', twoWeeksStr)
        .order('end_date', { ascending: true })
        .limit(10),
    ]).then(async ([myTasksRes, overdueRes, upcomingRes]) => {
      // Collect project IDs for name lookup
      const projectIds = new Set<string>();

      // Process my tasks
      const myTaskItems: DashboardTaskItem[] = [];
      if (myTasksRes.data) {
        for (const row of myTasksRes.data as unknown as Array<{ project_items: Record<string, unknown> }>) {
          const pi = row.project_items as unknown as DashboardTaskItem;
          if (pi) {
            myTaskItems.push({ ...pi, project_name: '' });
            projectIds.add(pi.project_id);
          }
        }
      }

      const overdueData = (overdueRes.data || []).map((item) => {
        projectIds.add(item.project_id);
        return { ...item, project_name: '' } as DashboardTaskItem;
      });

      const upcomingData = (upcomingRes.data || []).map((item) => {
        projectIds.add(item.project_id);
        return { ...item, project_name: '' } as DashboardTaskItem;
      });

      // Fetch project names
      if (projectIds.size > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', Array.from(projectIds));

        const nameMap = new Map<string, string>();
        if (projects) {
          for (const p of projects) nameMap.set(p.id, p.name);
        }

        for (const t of myTaskItems) t.project_name = nameMap.get(t.project_id) || '';
        for (const t of overdueData) t.project_name = nameMap.get(t.project_id) || '';
        for (const t of upcomingData) t.project_name = nameMap.get(t.project_id) || '';
      }

      // Sort my tasks: overdue first, then by end_date
      myTaskItems.sort((a, b) => {
        const aOverdue = a.end_date && a.end_date < todayStr ? 0 : 1;
        const bOverdue = b.end_date && b.end_date < todayStr ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return a.end_date.localeCompare(b.end_date);
      });

      setMyTasks(myTaskItems.slice(0, 8));
      setOverdueItems(overdueData);
      setUpcomingItems(upcomingData);
      setLoading((prev) => ({ ...prev, lists: false }));
    });

    /* --- Chart queries (parallel) --- */
    const chartsPromise = Promise.all([
      // Project status counts
      supabase
        .from('projects')
        .select('status')
        .eq('is_active', true),
      // Task status counts
      supabase
        .from('project_items')
        .select('task_status')
        .eq('is_active', true)
        .in('item_type', ['task', 'milestone']),
    ]).then(([projectsRes, tasksRes]) => {
      // Count project statuses
      const pCounts: Record<string, number> = {};
      if (projectsRes.data) {
        for (const p of projectsRes.data) {
          pCounts[p.status] = (pCounts[p.status] || 0) + 1;
        }
      }
      setProjectStatusCounts(
        Object.entries(pCounts).map(([status, count]) => ({ status, count }))
      );

      // Count task statuses
      const tCounts: Record<string, number> = {};
      if (tasksRes.data) {
        for (const t of tasksRes.data) {
          tCounts[t.task_status] = (tCounts[t.task_status] || 0) + 1;
        }
      }
      setTaskStatusCounts(
        Object.entries(tCounts).map(([task_status, count]) => ({ task_status, count }))
      );
      setLoading((prev) => ({ ...prev, charts: false }));
    });

    /* --- Activity query --- */
    const activityPromise = supabase
      .from('activity_log')
      .select('id, project_id, target_type, target_id, action, actor_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(async ({ data: logs }) => {
        if (!logs || logs.length === 0) {
          setActivities([]);
          setLoading((prev) => ({ ...prev, activity: false }));
          return;
        }

        // Fetch actor profiles
        const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[];
        const projectIdsSet = [...new Set(logs.map((l) => l.project_id).filter(Boolean))] as string[];

        const [profilesRes, projectsRes] = await Promise.all([
          actorIds.length > 0
            ? supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', actorIds)
            : Promise.resolve({ data: [] }),
          projectIdsSet.length > 0
            ? supabase.from('projects').select('id, name').in('id', projectIdsSet)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
        if (profilesRes.data) {
          for (const p of profilesRes.data) profileMap.set(p.user_id, p);
        }
        const projMap = new Map<string, string>();
        if (projectsRes.data) {
          for (const p of projectsRes.data) projMap.set(p.id, p.name);
        }

        setActivities(
          logs.map((log) => {
            const actor = profileMap.get(log.actor_id || '');
            return {
              id: log.id,
              project_id: log.project_id,
              project_name: log.project_id ? projMap.get(log.project_id) || null : null,
              target_type: log.target_type,
              target_id: log.target_id,
              action: log.action,
              actor_id: log.actor_id,
              actor_name: actor?.full_name || null,
              actor_avatar: actor?.avatar_url || null,
              details: (log.details as Record<string, unknown>) || {},
              created_at: log.created_at,
            };
          })
        );
        setLoading((prev) => ({ ...prev, activity: false }));
      });

    await Promise.all([kpiPromise, listsPromise, chartsPromise, activityPromise]).catch((err) => {
      console.error('Dashboard data fetch error:', err);
      setLoading({ kpi: false, lists: false, charts: false, activity: false });
    });
  }, [profile?.tenant_id, userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    kpi,
    myTasks,
    overdueItems,
    upcomingItems,
    projectStatusCounts,
    taskStatusCounts,
    activities,
    loading,
    refetch: fetchAll,
  };
}
