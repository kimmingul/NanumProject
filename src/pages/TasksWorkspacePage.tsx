import { type ReactNode, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { useProject, useProjectCrud, useEnumOptions } from '@/hooks';
import { usePreferencesStore } from '@/lib/preferences-store';
import { ScrollArrowOverlay } from '@/components/ScrollArrowOverlay';
import GanttView, { type GanttActions } from '@/features/gantt/GanttView';
import TasksView from '@/features/tasks/TasksView';
import BoardView, { type BoardActions } from '@/features/board/BoardView';
import CalendarView from '@/features/calendar/CalendarView';
import CommentsView from '@/features/comments/CommentsView';
import FilesView, { type FileActions } from '@/features/files/FilesView';
import ActivityView from '@/features/activity/ActivityView';
import TimeTrackingView, { type TimeActions } from '@/features/time-tracking/TimeTrackingView';
import ProjectSettingsView from '@/features/settings/ProjectSettingsView';
import './ProjectDetailPage.css';

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

const LAST_PROJECT_KEY = 'nanum-last-project-id';

export default function TasksWorkspacePage(): ReactNode {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const navigate = useNavigate();
  const { labels: statusLabels } = useEnumOptions('project_status');
  const { project, loading, refetch } = useProject(projectId);
  const { toggleStar } = useProjectCrud();

  // Redirect to last project or show empty state
  useEffect(() => {
    if (!projectId) {
      const lastId = localStorage.getItem(LAST_PROJECT_KEY);
      if (lastId) navigate(`/tasks/${lastId}`, { replace: true });
    } else {
      localStorage.setItem(LAST_PROJECT_KEY, projectId);
    }
  }, [projectId, navigate]);

  const addRowRef = useRef<(() => void) | undefined>(undefined);
  const ganttActionsRef = useRef<GanttActions | undefined>(undefined);
  const boardActionsRef = useRef<BoardActions | undefined>(undefined);
  const fileActionsRef = useRef<FileActions | undefined>(undefined);
  const timeActionsRef = useRef<TimeActions | undefined>(undefined);
  const workspaceContentRef = useRef<HTMLDivElement>(null);

  const defaultView = usePreferencesStore((s) => s.preferences.defaultView);
  const activeTab = tab || defaultView;
  const handleTabClick = (tabId: string) => {
    if (projectId) {
      navigate(`/tasks/${projectId}/${tabId}`);
    }
  };

  // No project selected — empty state
  if (!projectId) {
    return (
      <div className="project-detail-error">
        <i className="dx-icon-selectall" style={{ fontSize: 48, opacity: 0.3 }}></i>
        <h3>Select a project</h3>
        <p>Choose a project from the sidebar to view its tasks and workspace.</p>
      </div>
    );
  }

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
          <i
            className={`dx-icon-favorites project-star${project.is_starred ? ' starred' : ''}`}
            onClick={() => toggleStar(project.id).then(() => refetch())}
          />
          <span className="workspace-project-name">{project.name}</span>
          <span className={`project-status-badge status-${project.status}`}>
            {statusLabels[project.status] || project.status}
          </span>
        </div>
        <div className="workspace-tab-buttons">
          {activeTab === 'gantt' && (
            <>
              <Button
                icon="plus"
                stylingMode="text"
                hint="Add Task"
                className="workspace-tab-btn workspace-action-btn"
                onClick={() => ganttActionsRef.current?.addTask()}
              />
              <Button
                icon="trash"
                stylingMode="text"
                hint="Delete Task"
                className="workspace-tab-btn workspace-action-btn"
                onClick={() => ganttActionsRef.current?.deleteTask()}
              />
              <span className="workspace-toolbar-divider" />
            </>
          )}
          {activeTab === 'grid' && (
            <>
              <Button
                icon="plus"
                stylingMode="text"
                hint="Add Task"
                className="workspace-tab-btn workspace-action-btn"
                onClick={() => addRowRef.current?.()}
              />
              <span className="workspace-toolbar-divider" />
            </>
          )}
          {activeTab === 'board' && (
            <>
              <Button
                icon="plus"
                stylingMode="text"
                hint="Add Task"
                className="workspace-tab-btn workspace-action-btn"
                onClick={() => boardActionsRef.current?.addTask()}
              />
              <span className="workspace-toolbar-divider" />
            </>
          )}
          {activeTab === 'files' && (
            <>
              <Button
                icon="upload"
                stylingMode="text"
                hint="Upload File"
                className="workspace-tab-btn workspace-action-btn"
                onClick={() => fileActionsRef.current?.upload()}
              />
              <span className="workspace-toolbar-divider" />
            </>
          )}
          {activeTab === 'time' && (
            <>
              <Button
                icon="clock"
                stylingMode="text"
                hint="Log Time"
                className="workspace-tab-btn workspace-action-btn"
                onClick={() => timeActionsRef.current?.logTime()}
              />
              <span className="workspace-toolbar-divider" />
            </>
          )}
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

      <div className="workspace-content-wrapper">
        <ScrollArrowOverlay scrollRef={workspaceContentRef} direction="vertical" contentKey={activeTab} />
        <div className="workspace-content" ref={workspaceContentRef}>
          {activeTab === 'gantt' && projectId && <GanttView projectId={projectId} actionsRef={ganttActionsRef} />}
          {activeTab === 'grid' && projectId && <TasksView projectId={projectId} addRowRef={addRowRef} />}
          {activeTab === 'board' && projectId && <BoardView projectId={projectId} actionsRef={boardActionsRef} />}
          {activeTab === 'calendar' && projectId && <CalendarView projectId={projectId} />}
          {activeTab === 'comments' && projectId && <CommentsView projectId={projectId} />}
          {activeTab === 'files' && projectId && <FilesView projectId={projectId} actionsRef={fileActionsRef} />}
          {activeTab === 'time' && projectId && <TimeTrackingView projectId={projectId} actionsRef={timeActionsRef} />}
          {activeTab === 'activity' && projectId && <ActivityView projectId={projectId} />}
          {activeTab === 'settings' && (
            <ProjectSettingsView project={project} onProjectUpdated={() => refetch()} />
          )}
        </div>
      </div>
    </div>
  );
}
