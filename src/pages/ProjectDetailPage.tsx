import { type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
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
  { id: 'gantt', icon: 'chart', label: 'Gantt Chart' },
  { id: 'grid', icon: 'detailslayout', label: 'Grid' },
  { id: 'board', icon: 'contentlayout', label: 'Board' },
  { id: 'calendar', icon: 'event', label: 'Calendar' },
  { id: 'comments', icon: 'comment', label: 'Comments' },
  { id: 'files', icon: 'doc', label: 'Files' },
  { id: 'time', icon: 'clock', label: 'Time' },
  { id: 'activity', icon: 'fieldchooser', label: 'Activity' },
  { id: 'settings', icon: 'preferences', label: 'Settings' },
];

export default function ProjectDetailPage(): ReactNode {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const navigate = useNavigate();
  const { project, loading, refetch } = useProject(projectId);

  const activeTab = tab || 'gantt';
  const handleTabClick = (tabId: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/${tabId}`);
    }
  };

  if (loading) {
    return (
      <div className="project-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-error">
        <i className="dx-icon-warning"></i>
        <h3>Project not found</h3>
        <p>The requested project does not exist or you don't have access.</p>
        <Button text="Back to Projects" icon="back" stylingMode="outlined" onClick={() => navigate('/projects')} />
      </div>
    );
  }

  return (
    <div className="project-workspace">
      <div className="workspace-toolbar">
        <div className="workspace-toolbar-left">
          {project.is_starred && <i className="dx-icon-favorites project-star"></i>}
          <span className="workspace-project-name">{project.name}</span>
          <span className={`project-status-badge status-${project.status}`}>
            {statusLabels[project.status] || project.status}
          </span>
        </div>
        <div className="workspace-tab-buttons">
          {projectTabs.map((t) => (
            <Button
              key={t.id}
              icon={t.icon}
              stylingMode="text"
              hint={t.label}
              className={`workspace-tab-btn tab-${t.id} ${t.id === activeTab ? 'active' : ''}`}
              onClick={() => handleTabClick(t.id)}
            />
          ))}
        </div>
      </div>

      <div className="workspace-content">
        {activeTab === 'gantt' && projectId && <GanttView projectId={projectId} />}
        {activeTab === 'grid' && projectId && <TasksView projectId={projectId} />}
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
  );
}
