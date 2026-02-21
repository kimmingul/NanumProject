-- =============================================
-- 017_tenant_view_config.sql
-- Tenant-level view column configuration
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Create tenant_view_config table
CREATE TABLE IF NOT EXISTS public.tenant_view_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  view_key TEXT NOT NULL,  -- 'tasks_view' | 'my_tasks' | 'gantt' | 'board'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, view_key)
);

-- 2. Enable RLS
ALTER TABLE public.tenant_view_config ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user in same tenant
CREATE POLICY "tenant_view_config_select" ON public.tenant_view_config
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- INSERT: admin only
CREATE POLICY "tenant_view_config_insert" ON public.tenant_view_config
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- UPDATE: admin only
CREATE POLICY "tenant_view_config_update" ON public.tenant_view_config
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- DELETE: admin only
CREATE POLICY "tenant_view_config_delete" ON public.tenant_view_config
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- 3. Updated_at trigger (reuse existing function from 016)
DROP TRIGGER IF EXISTS set_tenant_view_config_updated_at ON public.tenant_view_config;
CREATE TRIGGER set_tenant_view_config_updated_at
  BEFORE UPDATE ON public.tenant_view_config
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_enum_config_updated_at();

-- 4. Seed default view configs for all existing tenants
INSERT INTO public.tenant_view_config (tenant_id, view_key, config)
SELECT t.id, v.view_key, v.config
FROM public.tenants t
CROSS JOIN (VALUES
  ('tasks_view', '{
    "columns": [
      {"dataField": "name", "visible": true, "width": 300, "visibleIndex": 0, "caption": "Task Name"},
      {"dataField": "item_type", "visible": true, "width": 100, "visibleIndex": 1, "caption": "Type"},
      {"dataField": "start_date", "visible": true, "width": 110, "visibleIndex": 2, "caption": "Start"},
      {"dataField": "end_date", "visible": true, "width": 110, "visibleIndex": 3, "caption": "End"},
      {"dataField": "percent_complete", "visible": true, "width": 100, "visibleIndex": 4, "caption": "Progress"},
      {"dataField": "task_status", "visible": true, "width": 120, "visibleIndex": 5, "caption": "Status"},
      {"dataField": "assignee_ids", "visible": true, "width": 200, "visibleIndex": 6, "caption": "Assignees"},
      {"dataField": "wbs", "visible": true, "width": 70, "visibleIndex": 7, "caption": "WBS"}
    ]
  }'::jsonb),
  ('my_tasks', '{
    "columns": [
      {"dataField": "name", "visible": true, "width": 250, "visibleIndex": 0, "caption": "Task Name"},
      {"dataField": "project_name", "visible": true, "width": 180, "visibleIndex": 1, "caption": "Project"},
      {"dataField": "task_status", "visible": true, "width": 120, "visibleIndex": 2, "caption": "Status"},
      {"dataField": "percent_complete", "visible": true, "width": 120, "visibleIndex": 3, "caption": "Progress"},
      {"dataField": "end_date", "visible": true, "width": 130, "visibleIndex": 4, "caption": "Due Date"},
      {"dataField": "start_date", "visible": false, "width": 120, "visibleIndex": 5, "caption": "Start Date"}
    ]
  }'::jsonb),
  ('gantt', '{
    "columns": [
      {"dataField": "title", "visible": true, "width": 280, "visibleIndex": 0, "caption": "Task Name"},
      {"dataField": "start", "visible": true, "width": 90, "visibleIndex": 1, "caption": "Start"},
      {"dataField": "end", "visible": true, "width": 90, "visibleIndex": 2, "caption": "End"},
      {"dataField": "progress", "visible": true, "width": 50, "visibleIndex": 3, "caption": "%"},
      {"dataField": "assignees", "visible": true, "width": 90, "visibleIndex": 4, "caption": "Assigned"}
    ],
    "taskListWidth": 600
  }'::jsonb),
  ('board', '{
    "cardFields": {
      "name": true,
      "assignees": true,
      "dueDate": true,
      "progress": true
    }
  }'::jsonb)
) AS v(view_key, config)
ON CONFLICT (tenant_id, view_key) DO NOTHING;
