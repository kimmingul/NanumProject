import { useEffect, useRef } from 'react';

export function useAutoRefresh(
  refetchFn: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true,
): void {
  const refetchRef = useRef(refetchFn);
  refetchRef.current = refetchFn;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const tick = () => {
      if (!document.hidden) {
        refetchRef.current();
      }
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
