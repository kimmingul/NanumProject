import { type ReactNode, useCallback, useMemo } from 'react';
import Scheduler, { View, Resource } from 'devextreme-react/scheduler';
import type { AppointmentClickEvent } from 'devextreme/ui/scheduler';
import { useProjectItems } from '@/hooks/useProjectItems';
import { useAuthStore } from '@/lib/auth-store';
import { usePMStore } from '@/lib/pm-store';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/formatDate';
import type { ProjectItem } from '@/types';
import './CalendarView.css';

interface CalendarViewProps {
  projectId: string;
}

interface CalendarAppointment {
  id: string;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  description: string;
  itemType: string;
  percentComplete: number;
  originalItem: ProjectItem;
}

const ITEM_TYPE_COLORS: { id: string; text: string; color: string }[] = [
  { id: 'group', text: 'Group', color: '#3b82f6' },
  { id: 'task', text: 'Task', color: '#22c55e' },
  { id: 'milestone', text: 'Milestone', color: '#f59e0b' },
];

function toDate(dateStr: string): Date {
  // dateStr is "YYYY-MM-DD", parse as local date
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarView({ projectId }: CalendarViewProps): ReactNode {
  const { items, loading, error, refetch } = useProjectItems(projectId);
  const profile = useAuthStore((s) => s.profile);
  const setSelectedTaskId = usePMStore((s) => s.setSelectedTaskId);

  const appointments = useMemo<CalendarAppointment[]>(() => {
    return items
      .filter((item) => item.start_date)
      .map((item) => {
        const start = toDate(item.start_date!);
        const end = item.end_date ? toDate(item.end_date) : start;
        // For all-day events, end date should be the next day (exclusive)
        const endAdjusted = new Date(end);
        endAdjusted.setDate(endAdjusted.getDate() + 1);
        return {
          id: item.id,
          text: item.name,
          startDate: start,
          endDate: endAdjusted,
          allDay: true,
          description: item.description || '',
          itemType: item.item_type,
          percentComplete: item.percent_complete,
          originalItem: item,
        };
      });
  }, [items]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAppointmentUpdated = useCallback(async (e: any) => {
    const apt = e.appointmentData as CalendarAppointment | undefined;
    if (!apt?.id) return;
    try {
      const startDate = apt.startDate instanceof Date ? apt.startDate : new Date(apt.startDate);
      const endDate = apt.endDate instanceof Date ? apt.endDate : new Date(apt.endDate);
      // Undo the +1 day adjustment for endDate
      endDate.setDate(endDate.getDate() - 1);

      await supabase
        .from('project_items')
        .update({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        })
        .eq('id', apt.id);
      await refetch();
    } catch (err) {
      console.error('Calendar: Failed to update:', err);
    }
  }, [refetch]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAppointmentAdding = useCallback(async (e: any) => {
    e.cancel = true; // prevent default add behavior
    if (!profile?.tenant_id) return;
    try {
      const startDate = e.appointmentData.startDate instanceof Date
        ? e.appointmentData.startDate
        : new Date(e.appointmentData.startDate);
      const endDate = e.appointmentData.endDate instanceof Date
        ? e.appointmentData.endDate
        : new Date(e.appointmentData.endDate);
      // Undo the +1 day adjustment
      endDate.setDate(endDate.getDate() - 1);

      await supabase.from('project_items').insert({
        tenant_id: profile.tenant_id,
        project_id: projectId,
        item_type: 'task',
        name: e.appointmentData.text || 'New Task',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        created_by: profile.user_id,
      });
      await refetch();
    } catch (err) {
      console.error('Calendar: Failed to add task:', err);
    }
  }, [projectId, profile, refetch]);

  const handleAppointmentClick = (e: AppointmentClickEvent) => {
    const apt = e.appointmentData as CalendarAppointment | undefined;
    if (apt) {
      setSelectedTaskId(apt.id);
    }
  };

  const appointmentTemplate = (data: CalendarAppointment) => {
    return (
      <div className={`calendar-appointment-${data.itemType}`} style={{ padding: '2px 4px' }}>
        <span>{data.text}</span>
      </div>
    );
  };

  const tooltipTemplate = (data: { appointmentData: CalendarAppointment }) => {
    const apt = data.appointmentData;
    const startStr = formatDate(apt.startDate);
    const endDate = new Date(apt.endDate);
    endDate.setDate(endDate.getDate() - 1); // undo the +1 adjustment
    const endStr = formatDate(endDate);
    return (
      <div className="calendar-tooltip">
        <div className="calendar-tooltip-name">{apt.text}</div>
        <span className={`calendar-tooltip-type type-${apt.itemType}`}>
          {apt.itemType}
        </span>
        <div className="calendar-tooltip-dates">
          {startStr === endStr ? startStr : `${startStr} ~ ${endStr}`}
        </div>
        {apt.percentComplete > 0 && (
          <div className="calendar-tooltip-progress">
            <span className="calendar-tooltip-progress-bar">
              <span
                className="calendar-tooltip-progress-fill"
                style={{ width: `${apt.percentComplete}%` }}
              />
            </span>
            <span>{apt.percentComplete}%</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="loading-spinner" />
        <p>Loading calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calendar-error">
        <i className="dx-icon-warning" />
        <p>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="calendar-empty">
        <i className="dx-icon-event" />
        <h3>No items yet</h3>
        <p>Create tasks to see them on the calendar.</p>
      </div>
    );
  }

  return (
    <div className="calendar-view">
      <Scheduler
        dataSource={appointments}
        defaultCurrentView="month"
        height="calc(100vh - 90px)"
        startDayHour={0}
        endDayHour={24}
        editing={{ allowUpdating: true, allowDragging: true, allowResizing: true }}
        showAllDayPanel={false}
        onAppointmentClick={handleAppointmentClick}
        onAppointmentUpdated={handleAppointmentUpdated}
        onAppointmentAdding={handleAppointmentAdding}
        appointmentRender={appointmentTemplate}
        appointmentTooltipRender={tooltipTemplate}
        textExpr="text"
        startDateExpr="startDate"
        endDateExpr="endDate"
        allDayExpr="allDay"
        descriptionExpr="description"
      >
        <Resource
          dataSource={ITEM_TYPE_COLORS}
          fieldExpr="itemType"
          label="Type"
          useColorAsDefault={true}
        />
        <View type="month" />
        <View type="week" />
        <View type="agenda" />
      </Scheduler>
    </div>
  );
}
