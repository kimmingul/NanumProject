import { type ReactNode, useMemo, useState } from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import { DateBox } from 'devextreme-react/date-box';
import { useActivityLog } from '@/hooks/useActivityLog';
import './ActivityView.css';

interface ActivityViewProps {
  projectId: string;
}

const actionTypes = [
  { id: '', text: 'All Actions' },
  { id: 'created', text: 'Created' },
  { id: 'updated', text: 'Updated' },
  { id: 'deleted', text: 'Deleted' },
  { id: 'completed', text: 'Completed' },
  { id: 'assigned', text: 'Assigned' },
  { id: 'commented', text: 'Commented' },
];

const actionBadgeClass: Record<string, string> = {
  created: 'action-created',
  updated: 'action-updated',
  deleted: 'action-deleted',
  completed: 'action-completed',
};

function formatActionDescription(
  actorName: string | null,
  action: string,
  targetType: string,
  details: Record<string, unknown>,
): string {
  const actor = actorName || 'Someone';
  const target = (details?.name as string) || targetType;
  return `${actor} ${action} ${target}`;
}

export default function ActivityView({ projectId }: ActivityViewProps): ReactNode {
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const { logs, loading, error } = useActivityLog(projectId, {
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  });

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups = new Map<string, typeof logs>();
    for (const log of logs) {
      const dateKey = new Date(log.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(log);
    }
    return groups;
  }, [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="activity-loading">
        <div className="loading-spinner" />
        <p>Loading activity log...</p>
      </div>
    );
  }

  return (
    <div className="activity-view">
      <div className="activity-toolbar">
        <span className="activity-filter-label">Filter:</span>
        <SelectBox
          dataSource={actionTypes}
          displayExpr="text"
          valueExpr="id"
          value={actionFilter}
          onValueChanged={(e) => setActionFilter(e.value)}
          width={160}
          stylingMode="outlined"
        />
        <span className="activity-filter-label">From:</span>
        <DateBox
          type="date"
          value={dateFrom ?? null}
          onValueChanged={(e) => setDateFrom(e.value ? new Date(e.value).toISOString().split('T')[0] : undefined)}
          width={150}
          stylingMode="outlined"
          showClearButton={true}
        />
        <span className="activity-filter-label">To:</span>
        <DateBox
          type="date"
          value={dateTo ?? null}
          onValueChanged={(e) => setDateTo(e.value ? new Date(e.value).toISOString().split('T')[0] : undefined)}
          width={150}
          stylingMode="outlined"
          showClearButton={true}
        />
      </div>

      {error && (
        <div className="activity-error">
          <i className="dx-icon-warning" />
          <span>{error}</span>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="activity-empty">
          <i className="dx-icon-clock" />
          <h3>No activity yet</h3>
          <p>Activity will appear here as changes are made.</p>
        </div>
      ) : (
        Array.from(groupedLogs.entries()).map(([dateKey, dateLogs]) => (
          <div key={dateKey} className="activity-date-group">
            <div className="activity-date-header">{dateKey}</div>
            {dateLogs.map((log) => (
              <div key={log.id} className="activity-item">
                <div className="activity-avatar">
                  {(log.actor_name || '?')[0].toUpperCase()}
                </div>
                <div className="activity-content">
                  <div className="activity-description">
                    {formatActionDescription(
                      log.actor_name,
                      log.action,
                      log.target_type,
                      log.details,
                    )}
                    <span className={`activity-action-badge ${actionBadgeClass[log.action] || 'action-default'}`}>
                      {log.action}
                    </span>
                  </div>
                  <div className="activity-time">
                    {new Date(log.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
