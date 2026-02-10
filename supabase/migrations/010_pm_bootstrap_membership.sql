-- =============================================
-- NanumProject PM Module - Bootstrap Membership
-- Purpose: Avoid RLS deadlock by auto-adding creator as project admin
-- =============================================

-- When a user creates a project, they must immediately become a member (admin)
-- otherwise RLS prevents them from SELECTing the project and from inserting into project_members.

-- Ensure created_by is set (best-effort)
CREATE OR REPLACE FUNCTION public.set_project_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_project_created_by() IS 'Sets projects.created_by to auth.uid() when not provided.';

-- After the project exists (FK-safe), add creator as admin member
CREATE OR REPLACE FUNCTION public.add_creator_as_project_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (
      tenant_id,
      project_id,
      user_id,
      permission,
      status,
      is_active
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.created_by,
      'admin',
      'active',
      true
    )
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.add_creator_as_project_admin() IS 'Auto-adds the creating user as an admin member for new projects to avoid RLS bootstrap deadlock.';

-- Triggers
DROP TRIGGER IF EXISTS on_projects_before_insert_set_created_by ON public.projects;
CREATE TRIGGER on_projects_before_insert_set_created_by
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_created_by();

DROP TRIGGER IF EXISTS on_projects_after_insert_add_membership ON public.projects;
CREATE TRIGGER on_projects_after_insert_add_membership
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_project_admin();

-- Optional backfill: add membership for existing projects where created_by is known.
INSERT INTO public.project_members (tenant_id, project_id, user_id, permission, status, is_active)
SELECT p.tenant_id, p.id, p.created_by, 'admin'::member_permission, 'active'::member_status, true
FROM public.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p.id AND pm.user_id = p.created_by
  );
