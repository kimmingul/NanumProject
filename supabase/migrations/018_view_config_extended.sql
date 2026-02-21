-- =============================================
-- 018_view_config_extended.sql
-- Extended view configuration: projects_list + gridSettings + column options
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add projects_list view config for all existing tenants
INSERT INTO public.tenant_view_config (tenant_id, view_key, config)
SELECT t.id, 'projects_list', '{
  "columns": [
    {"dataField": "name", "caption": "Project Name", "visible": true, "width": 250, "visibleIndex": 0, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "manager_name", "caption": "Manager", "visible": true, "width": 120, "visibleIndex": 1, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": true, "fixed": false},
    {"dataField": "status", "caption": "Status", "visible": true, "width": 100, "visibleIndex": 2, "alignment": "center", "allowSorting": true, "allowFiltering": true, "allowGrouping": true, "fixed": false},
    {"dataField": "progress", "caption": "Progress", "visible": true, "width": 120, "visibleIndex": 3, "alignment": "center", "allowSorting": true, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "task_count", "caption": "Tasks", "visible": true, "width": 80, "visibleIndex": 4, "alignment": "center", "allowSorting": true, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "start_date", "caption": "Start", "visible": true, "width": 100, "visibleIndex": 5, "alignment": "left", "allowSorting": true, "sortOrder": "desc", "sortIndex": 0, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "end_date", "caption": "End", "visible": true, "width": 100, "visibleIndex": 6, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "updated_at", "caption": "Updated", "visible": true, "width": 160, "visibleIndex": 7, "alignment": "left", "allowSorting": true, "allowFiltering": false, "allowGrouping": false, "fixed": false}
  ],
  "gridSettings": {
    "showColumnHeaders": true,
    "showRowLines": true,
    "showColumnLines": false,
    "rowAlternationEnabled": true,
    "columnAutoWidth": false,
    "wordWrapEnabled": false,
    "showGroupPanel": false,
    "showFilterRow": true,
    "showHeaderFilter": true,
    "showSearchPanel": false,
    "rowHeight": "normal"
  }
}'::jsonb
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_view_config tvc
  WHERE tvc.tenant_id = t.id AND tvc.view_key = 'projects_list'
);

-- 2. Update existing tasks_view configs with extended fields and gridSettings
UPDATE public.tenant_view_config
SET config = jsonb_set(
  jsonb_set(
    config,
    '{gridSettings}',
    '{
      "showColumnHeaders": true,
      "showRowLines": true,
      "showColumnLines": false,
      "rowAlternationEnabled": true,
      "columnAutoWidth": false,
      "wordWrapEnabled": false,
      "showGroupPanel": false,
      "showFilterRow": true,
      "showHeaderFilter": true,
      "showSearchPanel": false,
      "rowHeight": "normal"
    }'::jsonb,
    true
  ),
  '{columns}',
  '[
    {"dataField": "name", "caption": "Task Name", "visible": true, "width": 300, "visibleIndex": 0, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "item_type", "caption": "Type", "visible": true, "width": 100, "visibleIndex": 1, "alignment": "center", "allowSorting": true, "allowFiltering": true, "allowGrouping": true, "fixed": false},
    {"dataField": "start_date", "caption": "Start", "visible": true, "width": 110, "visibleIndex": 2, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "end_date", "caption": "End", "visible": true, "width": 110, "visibleIndex": 3, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "percent_complete", "caption": "Progress", "visible": true, "width": 100, "visibleIndex": 4, "alignment": "center", "allowSorting": true, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "task_status", "caption": "Status", "visible": true, "width": 120, "visibleIndex": 5, "alignment": "center", "allowSorting": true, "allowFiltering": true, "allowGrouping": true, "fixed": false},
    {"dataField": "assignee_ids", "caption": "Assignees", "visible": true, "width": 200, "visibleIndex": 6, "alignment": "left", "allowSorting": false, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "wbs", "caption": "WBS", "visible": true, "width": 70, "visibleIndex": 7, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false}
  ]'::jsonb,
  true
)
WHERE view_key = 'tasks_view';

-- 3. Update existing my_tasks configs with extended fields and gridSettings
UPDATE public.tenant_view_config
SET config = jsonb_set(
  jsonb_set(
    config,
    '{gridSettings}',
    '{
      "showColumnHeaders": true,
      "showRowLines": true,
      "showColumnLines": false,
      "rowAlternationEnabled": true,
      "columnAutoWidth": false,
      "wordWrapEnabled": false,
      "showGroupPanel": false,
      "showFilterRow": true,
      "showHeaderFilter": true,
      "showSearchPanel": false,
      "rowHeight": "normal"
    }'::jsonb,
    true
  ),
  '{columns}',
  '[
    {"dataField": "name", "caption": "Task Name", "visible": true, "width": 250, "visibleIndex": 0, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "project_name", "caption": "Project", "visible": true, "width": 180, "visibleIndex": 1, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": true, "fixed": false},
    {"dataField": "task_status", "caption": "Status", "visible": true, "width": 120, "visibleIndex": 2, "alignment": "center", "allowSorting": true, "allowFiltering": true, "allowGrouping": true, "fixed": false},
    {"dataField": "percent_complete", "caption": "Progress", "visible": true, "width": 120, "visibleIndex": 3, "alignment": "center", "allowSorting": true, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "end_date", "caption": "Due Date", "visible": true, "width": 130, "visibleIndex": 4, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false},
    {"dataField": "start_date", "caption": "Start Date", "visible": false, "width": 120, "visibleIndex": 5, "alignment": "left", "allowSorting": true, "allowFiltering": true, "allowGrouping": false, "fixed": false}
  ]'::jsonb,
  true
)
WHERE view_key = 'my_tasks';

-- 4. Update existing gantt configs with extended column fields
UPDATE public.tenant_view_config
SET config = jsonb_set(
  config,
  '{columns}',
  '[
    {"dataField": "title", "caption": "Task Name", "visible": true, "width": 280, "visibleIndex": 0, "alignment": "left", "allowSorting": false, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "start", "caption": "Start", "visible": true, "width": 90, "visibleIndex": 1, "alignment": "left", "allowSorting": false, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "end", "caption": "End", "visible": true, "width": 90, "visibleIndex": 2, "alignment": "left", "allowSorting": false, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "progress", "caption": "%", "visible": true, "width": 50, "visibleIndex": 3, "alignment": "center", "allowSorting": false, "allowFiltering": false, "allowGrouping": false, "fixed": false},
    {"dataField": "assignees", "caption": "Assigned", "visible": true, "width": 90, "visibleIndex": 4, "alignment": "left", "allowSorting": false, "allowFiltering": false, "allowGrouping": false, "fixed": false}
  ]'::jsonb,
  true
)
WHERE view_key = 'gantt';
