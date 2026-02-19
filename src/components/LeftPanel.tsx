import { type ReactNode } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { useProjects } from '@/hooks';

const mainNavLinks = [
  { path: '/dashboard', label: 'Overview', icon: 'dx-icon-home' },
  { path: '/users', label: 'Users', icon: 'dx-icon-group' },
  { path: '/audit', label: 'Audit Log', icon: 'dx-icon-fieldchooser' },
  { path: '/settings', label: 'Settings', icon: 'dx-icon-preferences' },
];

const statusDotColors: Record<string, string> = {
  active: '#22c55e',
  on_hold: '#f59e0b',
  complete: '#3b82f6',
  archived: '#94a3b8',
};

function MainNav(): ReactNode {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="left-panel-section">
      <div className="left-panel-section-title">Navigation</div>
      <nav className="left-panel-nav">
        {mainNavLinks.map((link) => (
          <Button
            key={link.path}
            icon={link.icon.replace('dx-icon-', '')}
            text={link.label}
            stylingMode="text"
            className={`left-panel-nav-item ${location.pathname === link.path ? 'active' : ''}`}
            onClick={() => navigate(link.path)}
          />
        ))}
      </nav>
    </div>
  );
}

function ProjectTree(): ReactNode {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects, loading } = useProjects();

  return (
    <div className="left-panel-section">
      <div className="left-panel-section-title">Projects</div>
      <div className="left-panel-project-list">
        {loading ? (
          <div className="left-panel-loading">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="left-panel-empty">No projects</div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className={`left-panel-project-item ${p.id === projectId ? 'active' : ''}`}
              onClick={() => navigate(`/projects/${p.id}`)}
              role="button"
              tabIndex={0}
              title={p.name}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.id}`)}
            >
              <span
                className="left-panel-status-dot"
                style={{ backgroundColor: statusDotColors[p.status] || '#94a3b8' }}
              />
              <span className="left-panel-project-name">{p.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function LeftPanel(): ReactNode {
  const location = useLocation();
  const isProjectDetail = /^\/projects\/[^/]+/.test(location.pathname);

  return (
    <aside className="ide-left-panel">
      {isProjectDetail ? <ProjectTree /> : <MainNav />}
    </aside>
  );
}
