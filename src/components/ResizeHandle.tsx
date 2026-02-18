import { useCallback, useEffect, useRef } from 'react';

interface ResizeHandleProps {
  position: 'left' | 'right';
  onResize: (width: number) => void;
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
}

export function ResizeHandle({ position, onResize, currentWidth, minWidth, maxWidth }: ResizeHandleProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = currentWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [currentWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = position === 'left'
        ? startWidth.current + delta
        : startWidth.current - delta;
      onResize(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position, onResize, minWidth, maxWidth]);

  return (
    <div
      className="ide-resize-handle"
      onMouseDown={handleMouseDown}
    />
  );
}
