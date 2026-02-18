import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import './DashboardPage.css';

interface DashboardStats {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  teamMembers: number;
}

export default function DashboardPage(): ReactNode {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!profile?.tenant_id) {
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);

      try {
        const [projectsRes, tasksRes, completedRes, membersRes] = await Promise.all([
          supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('status', 'active'),
          supabase
            .from('project_items')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .in('item_type', ['task', 'milestone']),
          supabase
            .from('project_items')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .in('item_type', ['task', 'milestone'])
            .eq('percent_complete', 100),
          supabase
            .from('project_members')
            .select('user_id')
            .eq('is_active', true),
        ]);

        if (cancelled) return;

        const uniqueMembers = membersRes.data
          ? new Set(membersRes.data.map((m: { user_id: string }) => m.user_id)).size
          : 0;

        setStats({
          activeProjects: projectsRes.count ?? 0,
          totalTasks: tasksRes.count ?? 0,
          completedTasks: completedRes.count ?? 0,
          teamMembers: uniqueMembers,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [profile?.tenant_id]);

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        <div className="overview-section">
          <h2>Welcome back, {profile?.full_name}!</h2>

          <div className="stats-grid">
            <div
              className="stat-card stat-card-clickable"
              onClick={() => navigate('/projects')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/projects')}
            >
              <div className="stat-icon" style={{ backgroundColor: '#e3f2fd' }}>
                <i className="dx-icon-folder" style={{ color: '#1976d2' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{statsLoading ? '...' : stats.activeProjects}</div>
                <div className="stat-label">Active Projects</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f3e5f5' }}>
                <i className="dx-icon-detailslayout" style={{ color: '#7b1fa2' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{statsLoading ? '...' : stats.totalTasks.toLocaleString()}</div>
                <div className="stat-label">Total Tasks</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#e8f5e9' }}>
                <i className="dx-icon-check" style={{ color: '#388e3c' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{statsLoading ? '...' : `${completionRate}%`}</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fff3e0' }}>
                <i className="dx-icon-group" style={{ color: '#f57c00' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{statsLoading ? '...' : stats.teamMembers}</div>
                <div className="stat-label">Team Members</div>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <Button icon="folder" text="View Projects" stylingMode="outlined" onClick={() => navigate('/projects')} />
              <Button icon="group" text="Manage Users" stylingMode="outlined" onClick={() => navigate('/dashboard/users')} />
              <Button icon="preferences" text="Settings" stylingMode="outlined" onClick={() => navigate('/dashboard/settings')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
