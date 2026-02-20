import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePMStore } from '@/lib/pm-store';
import { useGlobalSearch, type SearchResultItem } from '@/hooks/useGlobalSearch';
import './GlobalSearch.css';

function highlightMatch(text: string, query: string): ReactNode {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="search-highlight">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps): ReactNode {
  const navigate = useNavigate();
  const { query, setQuery, results, loading, flatResults, activeIndex, setActiveIndex, reset } =
    useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);
  const setRightPanelOpen = usePMStore((s) => s.setRightPanelOpen);

  // Focus input on open & lock body scroll
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const navigateToResult = useCallback((item: SearchResultItem) => {
    onClose();
    reset();
    if (item.type === 'project') {
      navigate(`/tasks/${item.id}`);
    } else if (item.type === 'item') {
      navigate(`/tasks/${item.projectId}`);
      setSelectedTaskId(item.id);
      setRightPanelOpen(true);
    } else if (item.type === 'user') {
      navigate(`/users/${item.id}`);
    }
  }, [navigate, onClose, reset, setSelectedTaskId, setRightPanelOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      reset();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(flatResults.length > 0 ? (activeIndex + 1) % flatResults.length : 0);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(
        flatResults.length > 0 ? (activeIndex - 1 + flatResults.length) % flatResults.length : 0,
      );
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[activeIndex]) {
        navigateToResult(flatResults[activeIndex]);
      }
      return;
    }
  }, [activeIndex, flatResults, navigateToResult, onClose, reset, setActiveIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('.global-search-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
      reset();
    }
  }, [onClose, reset]);

  if (!open) return null;

  const getIconClass = (item: SearchResultItem): string => {
    if (item.type === 'project') return 'project';
    if (item.type === 'user') return 'user';
    return `item-${item.itemType || 'task'}`;
  };

  let flatIndex = -1;

  const renderGroup = (label: string, items: SearchResultItem[]): ReactNode => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="global-search-group-label">{label}</div>
        {items.map((item) => {
          flatIndex++;
          const idx = flatIndex;
          return (
            <div
              key={item.id}
              className={`global-search-item ${idx === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => navigateToResult(item)}
            >
              <div className={`global-search-item-icon ${getIconClass(item)}`}>
                <i className={`dx-icon-${item.icon}`} />
              </div>
              <div className="global-search-item-text">
                <div className="global-search-item-name">{highlightMatch(item.name, query)}</div>
                {item.secondary && (
                  <div className="global-search-item-secondary">{highlightMatch(item.secondary, query)}</div>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  const hasResults = flatResults.length > 0;
  const hasQuery = query.length >= 2;

  return createPortal(
    <div className="global-search-backdrop" onClick={handleBackdropClick}>
      <div className="global-search-dialog" onKeyDown={handleKeyDown}>
        <div className="global-search-input-wrapper">
          <i className="dx-icon-search" />
          <input
            ref={inputRef}
            className="global-search-input"
            type="text"
            placeholder="Search projects, tasks, and users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <div className="global-search-spinner" />}
        </div>

        <div className="global-search-results" ref={listRef}>
          {hasQuery && !loading && !hasResults && (
            <div className="global-search-empty">No results found</div>
          )}
          {!hasQuery && !hasResults && (
            <div className="global-search-empty">Type to search...</div>
          )}
          {renderGroup('Projects', results.projects)}
          {renderGroup('Tasks', results.items)}
          {renderGroup('Users', results.users)}
        </div>

        <div className="global-search-footer">
          <div className="global-search-footer-hint">
            <kbd>↑</kbd><kbd>↓</kbd> Navigate
          </div>
          <div className="global-search-footer-hint">
            <kbd>↵</kbd> Open
          </div>
          <div className="global-search-footer-hint">
            <kbd>esc</kbd> Close
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
