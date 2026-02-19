import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { usePMStore } from '@/lib/pm-store';
import { IDEHeader } from './IDEHeader';
import { NavRail } from './NavRail';
import { ContextSidebar, hasSidebarContent } from './ContextSidebar';
import { RightPanel } from './RightPanel';
import { ResizeHandle } from './ResizeHandle';
import './IDELayout.css';

interface IDELayoutProps {
  children: ReactNode;
}

export function IDELayout({ children }: IDELayoutProps): ReactNode {
  const leftPanelOpen = usePMStore((s) => s.leftPanelOpen);
  const rightPanelOpen = usePMStore((s) => s.rightPanelOpen);
  const leftPanelWidth = usePMStore((s) => s.leftPanelWidth);
  const rightPanelWidth = usePMStore((s) => s.rightPanelWidth);
  const setLeftPanelWidth = usePMStore((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = usePMStore((s) => s.setRightPanelWidth);
  const toggleLeftPanel = usePMStore((s) => s.toggleLeftPanel);

  const location = useLocation();
  const hasSidebar = hasSidebarContent(location.pathname);
  const sidebarVisible = leftPanelOpen && hasSidebar;

  const sidebarW = sidebarVisible ? leftPanelWidth : (hasSidebar ? 40 : 0);
  const rightW = rightPanelOpen ? rightPanelWidth : 0;

  const gridTemplateColumns = [
    `${sidebarW}px`,
    sidebarVisible ? '4px' : '0px',
    '1fr',
    rightPanelOpen ? '4px' : '0px',
    `${rightW}px`,
  ].join(' ');

  return (
    <div className="ide-layout">
      <IDEHeader />
      <div className="ide-body">
        <NavRail />
        <div className="ide-main-area" style={{ gridTemplateColumns }}>
          {sidebarVisible && <ContextSidebar />}
          {!sidebarVisible && hasSidebar && (
            <div className="sidebar-collapsed-toggle">
              <Button
                icon="menu"
                stylingMode="text"
                hint="Toggle sidebar"
                className="sidebar-header-btn"
                onClick={toggleLeftPanel}
              />
            </div>
          )}
          {sidebarVisible && (
            <ResizeHandle
              position="left"
              onResize={setLeftPanelWidth}
              currentWidth={leftPanelWidth}
              minWidth={160}
              maxWidth={400}
            />
          )}
          <main className="ide-center" style={{ gridColumn: 3 }}>{children}</main>
          {rightPanelOpen && (
            <ResizeHandle
              position="right"
              onResize={setRightPanelWidth}
              currentWidth={rightPanelWidth}
              minWidth={260}
              maxWidth={500}
            />
          )}
          {rightPanelOpen && <RightPanel />}
        </div>
      </div>
    </div>
  );
}
