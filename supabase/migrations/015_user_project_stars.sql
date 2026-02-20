-- 015_user_project_stars.sql
-- Per-user project stars (replaces shared projects.is_starred column)
-- Run in Supabase SQL Editor

-- 1. Create user_project_stars table
CREATE TABLE IF NOT EXISTS public.user_project_stars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- 2. RLS policies: users can only manage their own stars
ALTER TABLE public.user_project_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_project_stars_select"
  ON public.user_project_stars FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_project_stars_insert"
  ON public.user_project_stars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_project_stars_delete"
  ON public.user_project_stars FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Migrate existing starred projects (optional: preserve current stars for all members)
-- This copies the current shared star state to the project creator's personal stars
INSERT INTO public.user_project_stars (tenant_id, user_id, project_id)
SELECT p.tenant_id, p.created_by, p.id
FROM public.projects p
WHERE p.is_starred = true AND p.created_by IS NOT NULL
ON CONFLICT (user_id, project_id) DO NOTHING;

-- 4. Remove shared is_starred column from projects
ALTER TABLE public.projects DROP COLUMN IF EXISTS is_starred;
