import { type ReactNode, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjects, useProjectCrud } from '@/hooks';

export function ProjectSidebarList(): ReactNode {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects, loading, refetch } = useProjects({ status: 'active' });
  const { toggleStar } = useProjectCrud();

  const handleStarClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      toggleStar(id).then(() => refetch());
    },
    [toggleStar, refetch],
  );

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
          onClick={() => navigate(`/tasks/${p.id}`)}
          role="button"
          tabIndex={0}
          title={p.name}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${p.id}`)}
        >
          <i
            className={`dx-icon-favorites sidebar-star${p.is_starred ? ' starred' : ''}`}
            onClick={(e) => handleStarClick(e, p.id)}
          />
          <span className="sidebar-item-name">{p.name}</span>
        </div>
      ))}
    </div>
  );
}
