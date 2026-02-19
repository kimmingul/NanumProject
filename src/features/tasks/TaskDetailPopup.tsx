import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Popup } from 'devextreme-react/popup';
import { TabPanel, Item } from 'devextreme-react/tab-panel';
import { TextBox } from 'devextreme-react/text-box';
import { TextArea } from 'devextreme-react/text-area';
import { DateBox } from 'devextreme-react/date-box';
import { NumberBox } from 'devextreme-react/number-box';
import { SelectBox } from 'devextreme-react/select-box';
import { supabase, dbUpdate } from '@/lib/supabase';
import { usePMStore } from '@/lib/pm-store';
import { useItemLinks } from '@/hooks/useItemLinks';
import { useItemRelations } from '@/hooks/useItemRelations';
import type { ProjectItem, TaskDependency, ItemType, TaskStatus } from '@/types';
import RelationsTab from './tabs/RelationsTab';
import CommentsTab from './tabs/CommentsTab';
import ChecklistTab from './tabs/ChecklistTab';
import './TaskDetailPopup.css';

interface TaskDetailPopupProps {
  visible: boolean;
  itemId: string | null;
  projectId: string;
  items: ProjectItem[];
  dependencies: TaskDependency[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

const itemTypeOptions = [
  { text: 'Group', value: 'group' },
  { text: 'Task', value: 'task' },
  { text: 'Milestone', value: 'milestone' },
];

const taskStatusOptions = [
  { text: 'To Do', value: 'todo' },
  { text: 'In Progress', value: 'in_progress' },
  { text: 'Review', value: 'review' },
  { text: 'Done', value: 'done' },
];

const formatDate = (d: Date | null): string | null =>
  d ? d.toISOString().split('T')[0] : null;

export default function TaskDetailPopup({
  visible,
  itemId,
  projectId,
  items,
  dependencies,
  onClose,
  onTaskUpdated,
}: TaskDetailPopupProps): ReactNode {
  const [task, setTask] = useState<ProjectItem | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const rightPanelTab = usePMStore((s) => s.rightPanelTab);
  const setRightPanelTab = usePMStore((s) => s.setRightPanelTab);

  const { links: itemLinks, addLink, deleteLink } = useItemLinks(projectId, itemId ?? undefined);
  const relations = useItemRelations(itemId ?? '', items, dependencies, itemLinks);

  // Ref to track current itemId for auto-save (avoid stale closure)
  const itemIdRef = useRef(itemId);
  useEffect(() => { itemIdRef.current = itemId; }, [itemId]);

  // Auto-save a single field to Supabase
  const saveField = useCallback(async (field: string, value: unknown) => {
    const currentId = itemIdRef.current;
    if (!currentId) return;
    try {
      const { error } = await supabase
        .from('project_items')
        .update(dbUpdate({ [field]: value }))
        .eq('id', currentId);
      if (error) throw error;
      onTaskUpdated();
    } catch (err) {
      console.error(`Failed to save ${field}:`, err);
    }
  }, [onTaskUpdated]);

  // Fetch task detail when itemId changes
  useEffect(() => {
    if (!visible || !itemId) {
      setTask(null);
      return;
    }

    let cancelled = false;
    const fetchTask = async () => {
      setTaskLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_items')
          .select('*')
          .eq('id', itemId)
          .eq('project_id', projectId)
          .single();

        if (error) throw error;
        if (!cancelled) setTask(data as ProjectItem);
      } catch (err) {
        console.error('Failed to load task:', err);
      } finally {
        if (!cancelled) setTaskLoading(false);
      }
    };

    fetchTask();
    return () => { cancelled = true; };
  }, [visible, itemId, projectId]);

  // Reset tab when popup opens with new item
  useEffect(() => {
    if (visible) {
      setTabIndex(rightPanelTab);
    }
  }, [visible, itemId, rightPanelTab]);

  // --- Field change handlers (update local state + auto-save) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNameChange = useCallback((e: any) => {
    const v: string = e.value ?? '';
    setTask((prev) => prev ? { ...prev, name: v } as ProjectItem : prev);
    saveField('name', v);
  }, [saveField]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTypeChange = useCallback((e: any) => {
    const v: ItemType = e.value ?? 'task';
    setTask((prev) => prev ? { ...prev, item_type: v } as ProjectItem : prev);
    saveField('item_type', v);
  }, [saveField]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStatusChange = useCallback((e: any) => {
    const v: TaskStatus = e.value ?? 'todo';
    setTask((prev) => prev ? { ...prev, task_status: v } as ProjectItem : prev);
    saveField('task_status', v);
  }, [saveField]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStartChange = useCallback((e: any) => {
    const v: Date | null = e.value ?? null;
    setTask((prev) => prev ? { ...prev, start_date: formatDate(v) } as ProjectItem : prev);
    saveField('start_date', formatDate(v));
  }, [saveField]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEndChange = useCallback((e: any) => {
    const v: Date | null = e.value ?? null;
    setTask((prev) => prev ? { ...prev, end_date: formatDate(v) } as ProjectItem : prev);
    saveField('end_date', formatDate(v));
  }, [saveField]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleProgressChange = useCallback((e: any) => {
    const v: number = e.value ?? 0;
    setTask((prev) => prev ? { ...prev, percent_complete: v } as ProjectItem : prev);
    saveField('percent_complete', v);
  }, [saveField]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDescriptionChange = useCallback((e: any) => {
    const v: string = e.value ?? '';
    setTask((prev) => prev ? { ...prev, description: v || null } as ProjectItem : prev);
    saveField('description', v || null);
  }, [saveField]);

  const handleTabChange = useCallback((index: number) => {
    setTabIndex(index);
    setRightPanelTab(index);
  }, [setRightPanelTab]);

  const popupTitle = task?.name || 'Task Details';

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      title={popupTitle}
      width={720}
      maxHeight="85vh"
      showCloseButton={true}
      hideOnOutsideClick={true}
      className="task-detail-popup"
      dragEnabled={true}
    >
      <div className="task-detail-popup-body">
        {taskLoading ? (
          <div className="checklist-loading">Loading task details...</div>
        ) : !task ? (
          <div className="checklist-loading">Task not found.</div>
        ) : (
          <TabPanel
            selectedIndex={tabIndex}
            onSelectedIndexChange={handleTabChange}
            swipeEnabled={false}
            animationEnabled={false}
            className="task-detail-tabs"
          >
            <Item title="Basic" icon="info">
              <div className="task-edit-form">
                <div className="task-edit-field">
                  <label>Name</label>
                  <TextBox value={task.name} onValueChanged={handleNameChange} />
                </div>
                <div className="task-edit-row">
                  <div className="task-edit-field">
                    <label>Type</label>
                    <SelectBox
                      items={itemTypeOptions}
                      displayExpr="text"
                      valueExpr="value"
                      value={task.item_type}
                      onValueChanged={handleTypeChange}
                    />
                  </div>
                  <div className="task-edit-field">
                    <label>Status</label>
                    <SelectBox
                      items={taskStatusOptions}
                      displayExpr="text"
                      valueExpr="value"
                      value={task.task_status}
                      onValueChanged={handleStatusChange}
                    />
                  </div>
                </div>
                <div className="task-edit-row">
                  <div className="task-edit-field">
                    <label>Start Date</label>
                    <DateBox
                      value={task.start_date ? new Date(task.start_date) : null}
                      onValueChanged={handleStartChange}
                      type="date"
                      displayFormat="yyyy-MM-dd"
                    />
                  </div>
                  <div className="task-edit-field">
                    <label>End Date</label>
                    <DateBox
                      value={task.end_date ? new Date(task.end_date) : null}
                      onValueChanged={handleEndChange}
                      type="date"
                      displayFormat="yyyy-MM-dd"
                    />
                  </div>
                </div>
                <div className="task-edit-field">
                  <label>Progress (%)</label>
                  <NumberBox
                    value={task.percent_complete}
                    onValueChanged={handleProgressChange}
                    min={0}
                    max={100}
                    showSpinButtons={true}
                  />
                </div>
                <div className="task-edit-field">
                  <label>Description</label>
                  <TextArea
                    value={task.description || ''}
                    onValueChanged={handleDescriptionChange}
                    height={80}
                  />
                </div>
              </div>
            </Item>
            <Item title="Comments" icon="comment">
              <CommentsTab projectId={projectId} itemId={itemId!} />
            </Item>
            <Item title="Checklist" icon="checklist">
              <ChecklistTab itemId={itemId!} />
            </Item>
            <Item title="Relations" icon="hierarchy">
              <RelationsTab
                itemId={itemId!}
                parent={relations.parent}
                children={relations.children}
                predecessors={relations.predecessors}
                successors={relations.successors}
                links={relations.links}
                allItems={items}
                onAddLink={addLink}
                onDeleteLink={deleteLink}
              />
            </Item>
          </TabPanel>
        )}
      </div>
    </Popup>
  );
}
