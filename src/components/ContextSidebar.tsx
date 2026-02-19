import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { usePMStore } from '@/lib/pm-store';
import { ProjectSidebarList } from './sidebars/ProjectSidebarList';
import { UserSidebarList } from './sidebars/UserSidebarList';
import { AuditSidebarList } from './sidebars/AuditSidebarList';
import { SettingsSidebarList } from './sidebars/SettingsSidebarList';
import './ContextSidebar.css';

function getSidebarContent(pathname: string): ReactNode | null {
  if (pathname.startsWith('/projects')) return <ProjectSidebarList />;
  if (pathname.startsWith('/users')) return <UserSidebarList />;
  if (pathname.startsWith('/audit')) return <AuditSidebarList />;
  if (pathname.startsWith('/settings')) return <SettingsSidebarList />;
  return null;
}

function getSectionTitle(pathname: string): string | null {
  if (pathname.startsWith('/projects')) return 'PROJECTS';
  if (pathname.startsWith('/users')) return 'USERS';
  if (pathname.startsWith('/audit')) return 'AUDIT LOG';
  if (pathname.startsWith('/settings')) return 'SETTINGS';
  return null;
}

export function ContextSidebar(): ReactNode {
  const location = useLocation();
  const toggleLeftPanel = usePMStore((s) => s.toggleLeftPanel);
  const content = getSidebarContent(location.pathname);
  const sectionTitle = getSectionTitle(location.pathname);

  if (!content) return null;

  return (
    <aside className="context-sidebar">
      <div className="context-sidebar-header">
        <Button
          icon="menu"
          stylingMode="text"
          hint="Toggle sidebar"
          className="sidebar-header-btn"
          onClick={toggleLeftPanel}
        />
        {sectionTitle && (
          <span className="sidebar-header-title">{sectionTitle}</span>
        )}
      </div>
      <div className="context-sidebar-body">
        {content}
      </div>
    </aside>
  );
}

/** Check if current route has sidebar content (used by IDELayout to auto-hide) */
export function hasSidebarContent(pathname: string): boolean {
  return getSidebarContent(pathname) !== null;
}
