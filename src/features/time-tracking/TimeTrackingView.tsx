import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid, Column, Summary, TotalItem } from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import { Popup } from 'devextreme-react/popup';
import { SelectBox } from 'devextreme-react/select-box';
import { DateBox } from 'devextreme-react/date-box';
import { NumberBox } from 'devextreme-react/number-box';
import { TextArea } from 'devextreme-react/text-area';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjectItems } from '@/hooks/useProjectItems';
import { useAuthStore } from '@/lib/auth-store';
import { DEFAULT_GRID_SETTINGS } from '@/lib/view-config-store';
import './TimeTrackingView.css';

export interface TimeActions {
  logTime: () => void;
}

interface TimeTrackingViewProps {
  projectId: string;
  actionsRef?: React.MutableRefObject<TimeActions | undefined>;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return '0:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export default function TimeTrackingView({ projectId, actionsRef }: TimeTrackingViewProps): ReactNode {
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [logPopupVisible, setLogPopupVisible] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    start_time: new Date().toISOString(),
    duration_minutes: 60,
    note: '',
  });

  const profile = useAuthStore((s) => s.profile);

  // Expose logTime action to parent via ref
  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        logTime: () => setLogPopupVisible(true),
      };
    }
    return () => {
      if (actionsRef) actionsRef.current = undefined;
    };
  }, [actionsRef]);

  const { entries, loading, error, addEntry, deleteEntry } = useTimeEntries(projectId, {
    ...(userFilter ? { userId: userFilter } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  });
  const { items, resources } = useProjectItems(projectId);

  // Task options for SelectBox (only tasks, not groups)
  const taskOptions = useMemo(
    () => items.filter((i) => i.item_type === 'task').map((i) => ({ id: i.id, name: i.name })),
    [items],
  );

  // Member options for user filter
  const memberOptions = useMemo(
    () => [{ id: '', text: 'All Members' }, ...resources.map((r) => ({ id: r.id, text: r.text }))],
    [resources],
  );

  const handleLogTime = useCallback(async () => {
    if (!formData.item_id || !formData.duration_minutes) return;
    try {
      await addEntry({
        item_id: formData.item_id,
        start_time: formData.start_time,
        duration_minutes: formData.duration_minutes,
        ...(formData.note ? { note: formData.note } : {}),
      });
      setLogPopupVisible(false);
      setFormData({
        item_id: '',
        start_time: new Date().toISOString(),
        duration_minutes: 60,
        note: '',
      });
    } catch (err) {
      console.error('Failed to log time:', err);
    }
  }, [formData, addEntry]);

  if (loading && entries.length === 0) {
    return (
      <div className="time-tracking-loading">
        <div className="loading-spinner" />
        <p>Loading time entries...</p>
      </div>
    );
  }

  return (
    <div className="time-tracking-view">
      <div className="time-tracking-toolbar">
        <span className="time-filter-label">Member:</span>
        <SelectBox
          dataSource={memberOptions}
          displayExpr="text"
          valueExpr="id"
          value={userFilter || ''}
          onValueChanged={(e) => setUserFilter(e.value || undefined)}
          width={180}
          stylingMode="outlined"
        />
        <span className="time-filter-label">From:</span>
        <DateBox
          type="date"
          value={dateFrom ?? null}
          onValueChanged={(e) => setDateFrom(e.value ? new Date(e.value).toISOString().split('T')[0] : undefined)}
          width={150}
          stylingMode="outlined"
          showClearButton={true}
        />
        <span className="time-filter-label">To:</span>
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
        <div className="time-tracking-error">
          <i className="dx-icon-warning" />
          <span>{error}</span>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="time-tracking-empty">
          <i className="dx-icon-clock" />
          <h3>No time entries yet</h3>
          <p>Click "Log Time" to record your first entry.</p>
        </div>
      ) : (
        <DataGrid
          dataSource={entries}
          keyExpr="id"
          showBorders={true}
          showRowLines={DEFAULT_GRID_SETTINGS.showRowLines ?? true}
          showColumnLines={DEFAULT_GRID_SETTINGS.showColumnLines ?? false}
          rowAlternationEnabled={DEFAULT_GRID_SETTINGS.rowAlternationEnabled ?? true}
          hoverStateEnabled={true}
          columnAutoWidth={true}
          wordWrapEnabled={DEFAULT_GRID_SETTINGS.wordWrapEnabled ?? false}
        >
          <Column dataField="task_name" caption="Task" minWidth={200} />
          <Column dataField="user_name" caption="User" width={140} />
          <Column
            dataField="entry_type"
            caption="Type"
            width={90}
            cellRender={(data: { value: string }) => (
              <span className={`entry-type-badge type-${data.value}`}>
                {data.value}
              </span>
            )}
          />
          <Column
            dataField="start_time"
            caption="Start"
            dataType="datetime"
            width={160}
            format="yyyy-MM-dd HH:mm"
          />
          <Column
            dataField="end_time"
            caption="End"
            dataType="datetime"
            width={160}
            format="yyyy-MM-dd HH:mm"
          />
          <Column
            dataField="duration_minutes"
            caption="Duration"
            width={90}
            cellRender={(data: { value: number | null }) => (
              <span className="duration-cell">{formatDuration(data.value)}</span>
            )}
          />
          <Column dataField="note" caption="Note" minWidth={150} />
          <Column
            caption=""
            width={60}
            cellRender={(data: { data: { id: string; user_id: string } }) => {
              const isOwner = data.data.user_id === profile?.user_id;
              if (!isOwner) return null;
              return (
                <Button
                  icon="trash"
                  stylingMode="text"
                  hint="Delete"
                  onClick={() => deleteEntry(data.data.id)}
                />
              );
            }}
          />
          <Summary>
            <TotalItem
              column="duration_minutes"
              summaryType="sum"
              customizeText={(data: { value: string | number | Date; valueText: string }) =>
                `Total: ${formatDuration(typeof data.value === 'number' ? data.value : 0)}`
              }
            />
          </Summary>
        </DataGrid>
      )}

      {/* Log Time Popup */}
      <Popup
        visible={logPopupVisible}
        onHiding={() => setLogPopupVisible(false)}
        title="Log Time"
        width={450}
        height="auto"
        showCloseButton={true}
      >
        <div className="log-time-form">
          <div className="log-time-field">
            <label>Task *</label>
            <SelectBox
              dataSource={taskOptions}
              displayExpr="name"
              valueExpr="id"
              value={formData.item_id}
              onValueChanged={(e) => setFormData((prev) => ({ ...prev, item_id: e.value }))}
              searchEnabled={true}
              stylingMode="outlined"
              placeholder="Select a task..."
            />
          </div>
          <div className="log-time-field">
            <label>Date & Time</label>
            <DateBox
              type="datetime"
              value={formData.start_time}
              onValueChanged={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  start_time: e.value ? new Date(e.value).toISOString() : new Date().toISOString(),
                }))
              }
              stylingMode="outlined"
            />
          </div>
          <div className="log-time-field">
            <label>Duration (minutes) *</label>
            <NumberBox
              value={formData.duration_minutes}
              onValueChanged={(e) => setFormData((prev) => ({ ...prev, duration_minutes: e.value ?? 0 }))}
              min={1}
              max={1440}
              stylingMode="outlined"
              showSpinButtons={true}
            />
          </div>
          <div className="log-time-field">
            <label>Note</label>
            <TextArea
              value={formData.note}
              onValueChanged={(e) => setFormData((prev) => ({ ...prev, note: e.value }))}
              height={80}
              stylingMode="outlined"
              placeholder="What did you work on?"
            />
          </div>
          <div className="log-time-actions">
            <Button
              text="Cancel"
              stylingMode="outlined"
              onClick={() => setLogPopupVisible(false)}
            />
            <Button
              text="Log Time"
              type="default"
              stylingMode="contained"
              onClick={handleLogTime}
              disabled={!formData.item_id || !formData.duration_minutes}
            />
          </div>
        </div>
      </Popup>
    </div>
  );
}
