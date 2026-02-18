import { type ReactNode } from 'react';
import { usePMStore } from '@/lib/pm-store';
import { IDEHeader } from './IDEHeader';
import { LeftPanel } from './LeftPanel';
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

  const leftW = leftPanelOpen ? leftPanelWidth : 0;
  const rightW = rightPanelOpen ? rightPanelWidth : 0;

  const gridTemplateColumns = [
    `${leftW}px`,
    leftPanelOpen ? '4px' : '0px',
    '1fr',
    rightPanelOpen ? '4px' : '0px',
    `${rightW}px`,
  ].join(' ');

  return (
    <div className="ide-layout">
      <IDEHeader />
      <div className="ide-body" style={{ gridTemplateColumns }}>
        {leftPanelOpen && <LeftPanel />}
        {leftPanelOpen && (
          <ResizeHandle
            position="left"
            onResize={setLeftPanelWidth}
            currentWidth={leftPanelWidth}
            minWidth={160}
            maxWidth={400}
          />
        )}
        <main className="ide-center">{children}</main>
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
  );
}
