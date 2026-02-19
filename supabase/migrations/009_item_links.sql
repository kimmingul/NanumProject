-- =============================================
-- 009_item_links.sql
-- Item Links, Hierarchy Validation, Comment Count RPC
-- Run in Supabase SQL Editor
-- =============================================

-- 1. link_type enum
DO $$ BEGIN
  CREATE TYPE public.link_type AS ENUM ('blocks', 'related_to', 'duplicates');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. item_links table
CREATE TABLE IF NOT EXISTS public.item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
  link_type public.link_type NOT NULL DEFAULT 'related_to',
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_links_no_self_link CHECK (source_id <> target_id),
  CONSTRAINT item_links_unique UNIQUE (source_id, target_id, link_type)
);

-- Index for bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_item_links_source ON public.item_links(source_id);
CREATE INDEX IF NOT EXISTS idx_item_links_target ON public.item_links(target_id);
CREATE INDEX IF NOT EXISTS idx_item_links_project ON public.item_links(project_id);

-- 3. RLS for item_links (same pattern as task_dependencies)
ALTER TABLE public.item_links ENABLE ROW LEVEL SECURITY;

-- SELECT: project members or tenant admin
CREATE POLICY item_links_select ON public.item_links
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_current_user_admin()
      OR is_project_member(project_id)
    )
  );

-- INSERT: edit permission or tenant admin
CREATE POLICY item_links_insert ON public.item_links
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND (
      is_current_user_admin()
      OR has_project_permission(project_id, 'edit')
    )
  );

-- DELETE: edit permission or tenant admin
CREATE POLICY item_links_delete ON public.item_links
  FOR DELETE USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_current_user_admin()
      OR has_project_permission(project_id, 'edit')
    )
  );

-- 4. Hierarchy validation trigger: milestone cannot have children
CREATE OR REPLACE FUNCTION validate_milestone_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting/updating a project_item with a parent
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if parent is a milestone
    IF EXISTS (
      SELECT 1 FROM public.project_items
      WHERE id = NEW.parent_id AND item_type = 'milestone' AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Cannot add children to a milestone item';
    END IF;
  END IF;

  -- When changing item_type to milestone, check if it already has children
  IF TG_OP = 'UPDATE' AND NEW.item_type = 'milestone' AND OLD.item_type <> 'milestone' THEN
    IF EXISTS (
      SELECT 1 FROM public.project_items
      WHERE parent_id = NEW.id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Cannot convert to milestone: item has existing children';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_milestone_hierarchy ON public.project_items;
CREATE TRIGGER trg_validate_milestone_hierarchy
  BEFORE INSERT OR UPDATE ON public.project_items
  FOR EACH ROW EXECUTE FUNCTION validate_milestone_hierarchy();

-- 5. Comment count RPC (batch per project, avoids N+1)
CREATE OR REPLACE FUNCTION get_item_comment_counts(p_project_id UUID)
RETURNS TABLE(item_id UUID, comment_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    c.target_id AS item_id,
    COUNT(*) AS comment_count
  FROM public.comments c
  WHERE c.project_id = p_project_id
    AND c.target_type = 'item'
    AND c.is_active = true
  GROUP BY c.target_id;
$$;

GRANT EXECUTE ON FUNCTION get_item_comment_counts(UUID) TO authenticated;
