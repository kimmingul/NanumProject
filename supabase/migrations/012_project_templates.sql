-- =============================================
-- 012_project_templates.sql
-- Clone project from template RPC
-- Run in Supabase SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION clone_project_from_template(
  p_template_id uuid,
  p_name text,
  p_start_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template    projects%ROWTYPE;
  v_new_project_id uuid;
  v_tenant_id   uuid;
  v_user_id     uuid;
  v_item_map    jsonb := '{}';
  v_old_id      uuid;
  v_new_id      uuid;
  v_item        record;
  v_dep         record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1) Fetch template
  SELECT * INTO v_template FROM projects WHERE id = p_template_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  v_tenant_id := v_template.tenant_id;

  -- 2) Create new project
  INSERT INTO projects (
    tenant_id, name, description, status, default_view,
    start_date, end_date, work_days,
    has_hours_enabled, lock_milestone_dates,
    allow_scheduling_on_holidays, in_resource_management,
    settings, is_template, created_by
  ) VALUES (
    v_tenant_id, p_name, v_template.description, 'active', v_template.default_view,
    p_start_date, NULL, v_template.work_days,
    v_template.has_hours_enabled, v_template.lock_milestone_dates,
    v_template.allow_scheduling_on_holidays, v_template.in_resource_management,
    v_template.settings, false, v_user_id
  ) RETURNING id INTO v_new_project_id;

  -- 3) Add creator as admin member
  INSERT INTO project_members (tenant_id, project_id, user_id, permission, status)
  VALUES (v_tenant_id, v_new_project_id, v_user_id, 'admin', 'accepted');

  -- 4) Copy items (first pass — create with temp parent_id)
  FOR v_item IN
    SELECT * FROM project_items
    WHERE project_id = p_template_id AND is_active = true
    ORDER BY sort_order
  LOOP
    v_new_id := gen_random_uuid();
    v_item_map := v_item_map || jsonb_build_object(v_item.id::text, v_new_id::text);

    INSERT INTO project_items (
      id, tenant_id, project_id, parent_id, item_type, name, description,
      wbs, sort_order, color, start_date, end_date, days,
      percent_complete, estimated_hours, is_estimated_hours_enabled,
      is_critical, is_milestone, is_time_tracking_enabled,
      task_status, custom_fields, created_by
    ) VALUES (
      v_new_id, v_tenant_id, v_new_project_id, v_item.parent_id,
      v_item.item_type, v_item.name, v_item.description,
      v_item.wbs, v_item.sort_order, v_item.color,
      v_item.start_date, v_item.end_date, v_item.days,
      0, v_item.estimated_hours, v_item.is_estimated_hours_enabled,
      v_item.is_critical, v_item.is_milestone, v_item.is_time_tracking_enabled,
      'todo', v_item.custom_fields, v_user_id
    );
  END LOOP;

  -- 5) Fix parent_id references
  UPDATE project_items
  SET parent_id = (v_item_map ->> parent_id::text)::uuid
  WHERE project_id = v_new_project_id
    AND parent_id IS NOT NULL
    AND v_item_map ? parent_id::text;

  -- 6) Copy dependencies
  FOR v_dep IN
    SELECT * FROM task_dependencies
    WHERE project_id = p_template_id
      AND (v_item_map ? predecessor_id::text)
      AND (v_item_map ? successor_id::text)
  LOOP
    INSERT INTO task_dependencies (
      tenant_id, project_id, predecessor_id, successor_id,
      dependency_type, lag_days
    ) VALUES (
      v_tenant_id, v_new_project_id,
      (v_item_map ->> v_dep.predecessor_id::text)::uuid,
      (v_item_map ->> v_dep.successor_id::text)::uuid,
      v_dep.dependency_type, v_dep.lag_days
    );
  END LOOP;

  RETURN v_new_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION clone_project_from_template(uuid, text, date) TO authenticated;
