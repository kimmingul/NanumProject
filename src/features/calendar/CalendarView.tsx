import { type ReactNode, useMemo, useState } from 'react';
import Scheduler, { View, Resource } from 'devextreme-react/scheduler';
import { useProjectItems } from '@/hooks/useProjectItems';
import TaskDetailPopup from '@/features/tasks/TaskDetailPopup';
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

  const handleAppointmentClick = (e: { appointmentData?: CalendarAppointment }) => {
    if (e.appointmentData) {
      setSelectedItemId(e.appointmentData.id);
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
    const startStr = apt.startDate.toLocaleDateString();
    const endDate = new Date(apt.endDate);
    endDate.setDate(endDate.getDate() - 1); // undo the +1 adjustment
    const endStr = endDate.toLocaleDateString();
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
        height={650}
        startDayHour={0}
        endDayHour={24}
        editing={false}
        showAllDayPanel={false}
        onAppointmentClick={handleAppointmentClick}
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

      <TaskDetailPopup
        visible={selectedItemId !== null}
        projectId={projectId}
        itemId={selectedItemId}
        onHiding={() => setSelectedItemId(null)}
        onTaskUpdated={refetch}
      />
    </div>
  );
}
