import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { usePMStore } from '@/lib/pm-store';
import { ProjectSidebarList } from './sidebars/ProjectSidebarList';
import { UserSidebarList } from './sidebars/UserSidebarList';
import { AuditSidebarList } from './sidebars/AuditSidebarList';
import { SettingsSidebarList } from './sidebars/SettingsSidebarList';
import './ContextSidebar.css';

function getSidebarContent(pathname: string): ReactNode | null {
  if (pathname.startsWith('/tasks')) return <ProjectSidebarList />;
  if (pathname.startsWith('/users')) return <UserSidebarList />;
  if (pathname.startsWith('/audit')) return <AuditSidebarList />;
  if (pathname.startsWith('/settings')) return <SettingsSidebarList />;
  return null;
}

function getSectionTitle(pathname: string): string | null {
  if (pathname.startsWith('/tasks')) return 'TASKS';
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

  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObs = new ResizeObserver(updateScrollState);
    resizeObs.observe(el);
    // MutationObserver detects async content changes (e.g. project list load)
    const mutationObs = new MutationObserver(updateScrollState);
    mutationObs.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      resizeObs.disconnect();
      mutationObs.disconnect();
    };
  }, [updateScrollState, content]);

  const scrollPage = useCallback((direction: 'up' | 'down') => {
    const el = bodyRef.current;
    if (!el) return;
    const amount = el.clientHeight * 0.8;
    el.scrollBy({ top: direction === 'down' ? amount : -amount, behavior: 'smooth' });
  }, []);

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
      <div className="context-sidebar-body-wrapper">
        {canScrollUp && (
          <>
            <div className="sidebar-scroll-fade sidebar-scroll-fade-top" />
            <button
              className="sidebar-scroll-arrow sidebar-scroll-arrow-top"
              onClick={() => scrollPage('up')}
              aria-label="Scroll up"
            >
              <i className="dx-icon-chevronup" />
            </button>
          </>
        )}
        <div className="context-sidebar-body" ref={bodyRef}>
          {content}
        </div>
        {canScrollDown && (
          <>
            <div className="sidebar-scroll-fade sidebar-scroll-fade-bottom" />
            <button
              className="sidebar-scroll-arrow sidebar-scroll-arrow-bottom"
              onClick={() => scrollPage('down')}
              aria-label="Scroll down"
            >
              <i className="dx-icon-chevrondown" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

/** Check if current route has sidebar content (used by IDELayout to auto-hide) */
export function hasSidebarContent(pathname: string): boolean {
  return getSidebarContent(pathname) !== null;
}
