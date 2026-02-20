import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/types';
import './NotificationBell.css';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcons: Record<string, string> = {
  assignment: 'user',
  comment_mention: 'comment',
  status_change: 'todo',
  due_date: 'clock',
};

export function NotificationBell(): ReactNode {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleNotificationClick = useCallback((n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    setOpen(false);
    if (n.project_id && n.target_type === 'project_item' && n.target_id) {
      navigate(`/tasks/${n.project_id}`);
    } else if (n.project_id) {
      navigate(`/tasks/${n.project_id}`);
    }
  }, [markAsRead, navigate]);

  return (
    <div className="notification-bell-wrapper" ref={ref}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        <i className="dx-icon-bell" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={() => markAllAsRead()}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.is_read ? '' : 'unread'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={`notification-item-icon type-${n.type}`}>
                    <i className={`dx-icon-${typeIcons[n.type] || 'info'}`} />
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-title">{n.title}</div>
                    {n.message && <div className="notification-item-message">{n.message}</div>}
                    <div className="notification-item-time">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
