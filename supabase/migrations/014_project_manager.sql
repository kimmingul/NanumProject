-- 014_project_manager.sql
-- Add manager_id to projects table
-- Run in Supabase SQL Editor

-- Add manager_id column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id);
COMMENT ON COLUMN projects.manager_id IS 'Project manager user ID';

-- Backfill: set first admin member as manager for existing projects
UPDATE projects p
SET manager_id = sub.user_id
FROM (
  SELECT DISTINCT ON (project_id) project_id, user_id
  FROM project_members
  WHERE permission = 'admin' AND status = 'accepted' AND is_active = true
  ORDER BY project_id, created_at ASC
) sub
WHERE p.id = sub.project_id AND p.manager_id IS NULL;
