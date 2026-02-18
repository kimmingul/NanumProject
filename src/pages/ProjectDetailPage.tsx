import { type ReactNode, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs } from 'devextreme-react';
import { PMLayout } from '@/components/PMLayout';
import { useProject } from '@/hooks';
import type { Project } from '@/types';
import './ProjectDetailPage.css';

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  complete: 'Complete',
  archived: 'Archived',
};

const projectTabs = [
  { id: 'gantt', text: 'Gantt Chart', icon: 'chart' },
  { id: 'tasks', text: 'Tasks', icon: 'detailslayout' },
  { id: 'comments', text: 'Comments', icon: 'comment' },
  { id: 'files', text: 'Files', icon: 'doc' },
  { id: 'settings', text: 'Settings', icon: 'preferences' },
];

export default function ProjectDetailPage(): ReactNode {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const navigate = useNavigate();
  const { project, loading } = useProject(projectId);

  const activeTab = tab || 'gantt';
  const selectedIndex = useMemo(
    () => Math.max(0, projectTabs.findIndex((t) => t.id === activeTab)),
    [activeTab],
  );

  const handleTabClick = (e: { itemData?: { id: string } }) => {
    if (e.itemData && projectId) {
      navigate(`/projects/${projectId}/${e.itemData.id}`);
    }
  };

  if (loading) {
    return (
      <PMLayout breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: 'Loading...' }]}>
        <div className="project-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading project...</p>
        </div>
      </PMLayout>
    );
  }

  if (!project) {
    return (
      <PMLayout breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: 'Not Found' }]}>
        <div className="project-detail-error">
          <i className="dx-icon-warning"></i>
          <h3>Project not found</h3>
          <p>The requested project does not exist or you don't have access.</p>
          <button className="back-btn" onClick={() => navigate('/projects')}>
            Back to Projects
          </button>
        </div>
      </PMLayout>
    );
  }

  return (
    <PMLayout
      breadcrumbs={[
        { label: 'Projects', path: '/projects' },
        { label: project.name },
      ]}
    >
      <div className="project-detail-page">
        <div className="project-detail-header">
          <div className="project-title-row">
            <h2>
              {project.is_starred && <i className="dx-icon-favorites project-star"></i>}
              {project.name}
            </h2>
            <span className={`project-status-badge status-${project.status}`}>
              {statusLabels[project.status] || project.status}
            </span>
          </div>
          {(project.start_date || project.end_date) && (
            <div className="project-dates">
              {project.start_date && <span>{project.start_date}</span>}
              {project.start_date && project.end_date && <span className="date-sep">~</span>}
              {project.end_date && <span>{project.end_date}</span>}
            </div>
          )}
        </div>

        <div className="project-tabs-container">
          <Tabs
            dataSource={projectTabs}
            selectedIndex={selectedIndex}
            onItemClick={handleTabClick}
            showNavButtons={true}
          />
        </div>

        <div className="project-tab-content">
          {activeTab === 'gantt' && <GanttTabPlaceholder project={project} />}
          {activeTab === 'tasks' && <TasksTabPlaceholder project={project} />}
          {activeTab === 'comments' && <CommentsTabPlaceholder />}
          {activeTab === 'files' && <FilesTabPlaceholder />}
          {activeTab === 'settings' && <SettingsTabPlaceholder project={project} />}
        </div>
      </div>
    </PMLayout>
  );
}

function GanttTabPlaceholder({ project }: { project: Project }): ReactNode {
  return (
    <div className="tab-placeholder">
      <div className="placeholder-icon">
        <i className="dx-icon-chart"></i>
      </div>
      <h3>Gantt Chart</h3>
      <p>Interactive Gantt chart view for "{project.name}" will be available in the next update.</p>
      <p className="placeholder-hint">This will show tasks, groups, and dependencies in a timeline view.</p>
    </div>
  );
}

function TasksTabPlaceholder({ project }: { project: Project }): ReactNode {
  return (
    <div className="tab-placeholder">
      <div className="placeholder-icon">
        <i className="dx-icon-detailslayout"></i>
      </div>
      <h3>Tasks</h3>
      <p>Task list and board views for "{project.name}" will be available soon.</p>
      <p className="placeholder-hint">You'll be able to view, create, and manage tasks here.</p>
    </div>
  );
}

function CommentsTabPlaceholder(): ReactNode {
  return (
    <div className="tab-placeholder">
      <div className="placeholder-icon">
        <i className="dx-icon-comment"></i>
      </div>
      <h3>Comments</h3>
      <p>Project-level comments and discussions coming soon.</p>
    </div>
  );
}

function FilesTabPlaceholder(): ReactNode {
  return (
    <div className="tab-placeholder">
      <div className="placeholder-icon">
        <i className="dx-icon-doc"></i>
      </div>
      <h3>Files & Documents</h3>
      <p>Document management with version history coming soon.</p>
    </div>
  );
}

function SettingsTabPlaceholder({ project }: { project: Project }): ReactNode {
  return (
    <div className="tab-placeholder">
      <div className="placeholder-icon">
        <i className="dx-icon-preferences"></i>
      </div>
      <h3>Project Settings</h3>
      <p>Configure "{project.name}" settings, members, and permissions.</p>
    </div>
  );
}
