import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs } from 'devextreme-react';
import { useAuth } from '@/hooks';
import { supabase } from '@/lib/supabase';
import './DashboardPage.css';

const tabs = [
  { id: 'overview', text: 'Overview', icon: 'home' },
  { id: 'users', text: 'Users', icon: 'group' },
  { id: 'settings', text: 'Settings', icon: 'preferences' },
];

interface DashboardStats {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  teamMembers: number;
}

export default function DashboardPage(): ReactNode {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!profile?.tenant_id) return;
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
          // Fetch actual user_ids to count unique members
          supabase
            .from('project_members')
            .select('user_id')
            .eq('is_active', true),
        ]);

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
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [profile?.tenant_id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleTabClick = (e: { itemData?: { id: string } }) => {
    if (e.itemData) {
      navigate(`/dashboard/${e.itemData.id}`);
    }
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>NanumProject</h1>
            <p className="tenant-name">{profile?.tenant_name || 'Dashboard'}</p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{profile?.full_name || 'User'}</div>
                <div className="user-role">{profile?.role || 'user'}</div>
              </div>
            </div>
            <button onClick={handleSignOut} className="sign-out-btn">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="dashboard-tabs">
          <Tabs
            dataSource={tabs}
            selectedIndex={0}
            onItemClick={handleTabClick}
            showNavButtons={true}
          />
        </div>

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
                <button className="action-btn" onClick={() => navigate('/projects')}>
                  <i className="dx-icon-folder"></i>
                  View Projects
                </button>
                <button className="action-btn" onClick={() => navigate('/dashboard/users')}>
                  <i className="dx-icon-group"></i>
                  Manage Users
                </button>
                <button className="action-btn" onClick={() => navigate('/dashboard/settings')}>
                  <i className="dx-icon-preferences"></i>
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
