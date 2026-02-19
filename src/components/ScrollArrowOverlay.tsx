import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import './ScrollArrowOverlay.css';

interface ScrollArrowOverlayProps {
  /** Ref to the scrollable container element */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Scroll direction */
  direction?: 'vertical' | 'horizontal';
  /** Extra dependency to re-check scroll state (e.g. content key) */
  contentKey?: unknown;
}

/**
 * Renders floating arrow buttons + gradient fades over a scrollable container.
 * The parent element must have `position: relative` and `overflow: hidden`.
 */
export function ScrollArrowOverlay({
  scrollRef,
  direction = 'vertical',
  contentKey,
}: ScrollArrowOverlayProps): ReactNode {
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  const animFrameRef = useRef(0);

  const updateScrollState = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (direction === 'vertical') {
        setCanScrollStart(el.scrollTop > 0);
        setCanScrollEnd(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
      } else {
        setCanScrollStart(el.scrollLeft > 0);
        setCanScrollEnd(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
      }
    });
  }, [scrollRef, direction]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObs = new ResizeObserver(updateScrollState);
    resizeObs.observe(el);
    const mutationObs = new MutationObserver(updateScrollState);
    mutationObs.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      el.removeEventListener('scroll', updateScrollState);
      resizeObs.disconnect();
      mutationObs.disconnect();
    };
  }, [scrollRef, updateScrollState, contentKey]);

  const scrollPage = useCallback(
    (dir: 'start' | 'end') => {
      const el = scrollRef.current;
      if (!el) return;
      if (direction === 'vertical') {
        const amount = el.clientHeight * 0.8;
        el.scrollBy({ top: dir === 'end' ? amount : -amount, behavior: 'smooth' });
      } else {
        const amount = el.clientWidth * 0.8;
        el.scrollBy({ left: dir === 'end' ? amount : -amount, behavior: 'smooth' });
      }
    },
    [scrollRef, direction],
  );

  const isVert = direction === 'vertical';
  const cls = isVert ? 'scroll-overlay-v' : 'scroll-overlay-h';

  return (
    <>
      {canScrollStart && (
        <>
          <div className={`scroll-overlay-fade ${cls}-fade-start`} />
          <button
            className={`scroll-overlay-arrow ${cls}-arrow-start`}
            onClick={() => scrollPage('start')}
            aria-label={isVert ? 'Scroll up' : 'Scroll left'}
          >
            <i className={isVert ? 'dx-icon-chevronup' : 'dx-icon-chevronleft'} />
          </button>
        </>
      )}
      {canScrollEnd && (
        <>
          <div className={`scroll-overlay-fade ${cls}-fade-end`} />
          <button
            className={`scroll-overlay-arrow ${cls}-arrow-end`}
            onClick={() => scrollPage('end')}
            aria-label={isVert ? 'Scroll down' : 'Scroll right'}
          >
            <i className={isVert ? 'dx-icon-chevrondown' : 'dx-icon-chevronright'} />
          </button>
        </>
      )}
    </>
  );
}
