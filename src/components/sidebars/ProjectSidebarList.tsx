import { type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '@/hooks';

const statusDotColors: Record<string, string> = {
  active: '#22c55e',
  on_hold: '#f59e0b',
  complete: '#3b82f6',
  archived: '#94a3b8',
};

export function ProjectSidebarList(): ReactNode {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects, loading } = useProjects({ status: 'active' });

  if (loading) {
    return <div className="sidebar-loading">Loading...</div>;
  }

  if (projects.length === 0) {
    return <div className="sidebar-empty">No projects</div>;
  }

  return (
    <div className="sidebar-list">
      {projects.map((p) => (
        <div
          key={p.id}
          className={`sidebar-list-item ${p.id === projectId ? 'active' : ''}`}
          onClick={() => navigate(`/projects/${p.id}`)}
          role="button"
          tabIndex={0}
          title={p.name}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.id}`)}
        >
          <span
            className="sidebar-status-dot"
            style={{ backgroundColor: statusDotColors[p.status] || '#94a3b8' }}
          />
          <span className="sidebar-item-name">{p.name}</span>
        </div>
      ))}
    </div>
  );
}
