import { type ReactNode, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs } from 'devextreme-react';
import { PMLayout } from '@/components/PMLayout';
import { useProject } from '@/hooks';
import GanttView from '@/features/gantt/GanttView';
import TasksView from '@/features/tasks/TasksView';
import BoardView from '@/features/board/BoardView';
import CalendarView from '@/features/calendar/CalendarView';
import CommentsView from '@/features/comments/CommentsView';
import FilesView from '@/features/files/FilesView';
import ActivityView from '@/features/activity/ActivityView';
import TimeTrackingView from '@/features/time-tracking/TimeTrackingView';
import ProjectSettingsView from '@/features/settings/ProjectSettingsView';
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
  { id: 'board', text: 'Board', icon: 'contentlayout' },
  { id: 'calendar', text: 'Calendar', icon: 'event' },
  { id: 'comments', text: 'Comments', icon: 'comment' },
  { id: 'files', text: 'Files', icon: 'doc' },
  { id: 'time', text: 'Time', icon: 'clock' },
  { id: 'activity', text: 'Activity', icon: 'fieldchooser' },
  { id: 'settings', text: 'Settings', icon: 'preferences' },
];

export default function ProjectDetailPage(): ReactNode {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const navigate = useNavigate();
  const { project, loading, refetch } = useProject(projectId);

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
          {activeTab === 'gantt' && projectId && <GanttView projectId={projectId} />}
          {activeTab === 'tasks' && projectId && <TasksView projectId={projectId} />}
          {activeTab === 'board' && projectId && <BoardView projectId={projectId} />}
          {activeTab === 'calendar' && projectId && <CalendarView projectId={projectId} />}
          {activeTab === 'comments' && projectId && <CommentsView projectId={projectId} />}
          {activeTab === 'files' && projectId && <FilesView projectId={projectId} />}
          {activeTab === 'time' && projectId && <TimeTrackingView projectId={projectId} />}
          {activeTab === 'activity' && projectId && <ActivityView projectId={projectId} />}
          {activeTab === 'settings' && (
            <ProjectSettingsView project={project} onProjectUpdated={() => refetch()} />
          )}
        </div>
      </div>
    </PMLayout>
  );
}
