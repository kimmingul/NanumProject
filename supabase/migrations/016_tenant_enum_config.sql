-- =============================================
-- 016_tenant_enum_config.sql
-- Tenant-level enum configuration (dynamic labels, colors, custom values)
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Create tenant_enum_config table
CREATE TABLE IF NOT EXISTS public.tenant_enum_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, category)
);

-- 2. Enable RLS
ALTER TABLE public.tenant_enum_config ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user in same tenant
CREATE POLICY "tenant_enum_config_select" ON public.tenant_enum_config
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- INSERT: admin only
CREATE POLICY "tenant_enum_config_insert" ON public.tenant_enum_config
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- UPDATE: admin only
CREATE POLICY "tenant_enum_config_update" ON public.tenant_enum_config
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_current_user_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- DELETE: admin only
CREATE POLICY "tenant_enum_config_delete" ON public.tenant_enum_config
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_current_user_admin());

-- 3. Convert project_items.task_status from ENUM to TEXT
-- PostgreSQL doesn't allow direct ALTER TYPE on ENUM columns easily,
-- so we use the add-column/copy/drop/rename pattern.
DO $$
BEGIN
  -- Check if task_status is still an enum type (not yet migrated)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_items'
      AND column_name = 'task_status'
      AND udt_name = 'task_status'
  ) THEN
    ALTER TABLE public.project_items ADD COLUMN task_status_text TEXT;
    UPDATE public.project_items SET task_status_text = task_status::TEXT;
    ALTER TABLE public.project_items DROP COLUMN task_status;
    ALTER TABLE public.project_items RENAME COLUMN task_status_text TO task_status;
    ALTER TABLE public.project_items ALTER COLUMN task_status SET NOT NULL;
    ALTER TABLE public.project_items ALTER COLUMN task_status SET DEFAULT 'todo';
  END IF;
END $$;

-- 4. Convert projects.status from ENUM to TEXT (same pattern)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'status'
      AND udt_name = 'project_status'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN status_text TEXT;
    UPDATE public.projects SET status_text = status::TEXT;
    ALTER TABLE public.projects DROP COLUMN status;
    ALTER TABLE public.projects RENAME COLUMN status_text TO status;
    ALTER TABLE public.projects ALTER COLUMN status SET NOT NULL;
    ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'active';
  END IF;
END $$;

-- 5. Seed default enum configs for all existing tenants
INSERT INTO public.tenant_enum_config (tenant_id, category, options)
SELECT t.id, c.category, c.options
FROM public.tenants t
CROSS JOIN (VALUES
  ('task_status', '[
    {"value":"todo","label":"To Do","color":"#94a3b8","icon":null,"sort_order":0,"is_system":true},
    {"value":"in_progress","label":"In Progress","color":"#3b82f6","icon":null,"sort_order":1,"is_system":true},
    {"value":"review","label":"Review","color":"#f59e0b","icon":null,"sort_order":2,"is_system":true},
    {"value":"done","label":"Done","color":"#22c55e","icon":null,"sort_order":3,"is_system":true}
  ]'::jsonb),
  ('project_status', '[
    {"value":"active","label":"Active","color":"#22c55e","icon":null,"sort_order":0,"is_system":true},
    {"value":"on_hold","label":"On Hold","color":"#f59e0b","icon":null,"sort_order":1,"is_system":true},
    {"value":"complete","label":"Complete","color":"#3b82f6","icon":null,"sort_order":2,"is_system":true},
    {"value":"archived","label":"Archived","color":"#94a3b8","icon":null,"sort_order":3,"is_system":true}
  ]'::jsonb),
  ('user_role', '[
    {"value":"admin","label":"Admin","color":"#ef4444","icon":null,"sort_order":0,"is_system":true},
    {"value":"manager","label":"Manager","color":"#8b5cf6","icon":null,"sort_order":1,"is_system":true},
    {"value":"member","label":"Member","color":"#3b82f6","icon":null,"sort_order":2,"is_system":true},
    {"value":"viewer","label":"Viewer","color":"#94a3b8","icon":null,"sort_order":3,"is_system":true}
  ]'::jsonb),
  ('member_permission', '[
    {"value":"admin","label":"Admin","color":"#ef4444","icon":null,"sort_order":0,"is_system":true},
    {"value":"edit","label":"Editor","color":"#3b82f6","icon":null,"sort_order":1,"is_system":true},
    {"value":"own_progress","label":"Own Progress","color":"#f59e0b","icon":null,"sort_order":2,"is_system":true},
    {"value":"view","label":"Viewer","color":"#94a3b8","icon":null,"sort_order":3,"is_system":true}
  ]'::jsonb),
  ('department', '[
    {"value":"clinical_ops","label":"Clinical Operations","color":null,"icon":null,"sort_order":0,"is_system":false},
    {"value":"data_mgmt","label":"Data Management","color":null,"icon":null,"sort_order":1,"is_system":false},
    {"value":"biostatistics","label":"Biostatistics","color":null,"icon":null,"sort_order":2,"is_system":false},
    {"value":"regulatory","label":"Regulatory Affairs","color":null,"icon":null,"sort_order":3,"is_system":false},
    {"value":"medical_writing","label":"Medical Writing","color":null,"icon":null,"sort_order":4,"is_system":false},
    {"value":"qa","label":"Quality Assurance","color":null,"icon":null,"sort_order":5,"is_system":false},
    {"value":"pharmacovigilance","label":"Pharmacovigilance","color":null,"icon":null,"sort_order":6,"is_system":false},
    {"value":"project_mgmt","label":"Project Management","color":null,"icon":null,"sort_order":7,"is_system":false}
  ]'::jsonb),
  ('item_type', '[
    {"value":"group","label":"Group","color":"#64748b","icon":"folder","sort_order":0,"is_system":true},
    {"value":"task","label":"Task","color":"#3b82f6","icon":"detailslayout","sort_order":1,"is_system":true},
    {"value":"milestone","label":"Milestone","color":"#f59e0b","icon":"event","sort_order":2,"is_system":true}
  ]'::jsonb),
  ('link_type', '[
    {"value":"blocks","label":"Blocks","color":null,"icon":null,"sort_order":0,"is_system":true},
    {"value":"related_to","label":"Related To","color":null,"icon":null,"sort_order":1,"is_system":true},
    {"value":"duplicates","label":"Duplicates","color":null,"icon":null,"sort_order":2,"is_system":true}
  ]'::jsonb)
) AS c(category, options)
ON CONFLICT (tenant_id, category) DO NOTHING;

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_enum_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tenant_enum_config_updated_at ON public.tenant_enum_config;
CREATE TRIGGER set_tenant_enum_config_updated_at
  BEFORE UPDATE ON public.tenant_enum_config
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_enum_config_updated_at();
