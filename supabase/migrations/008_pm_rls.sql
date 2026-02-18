-- =============================================
-- NanumProject PM Module - Row Level Security
-- Purpose: Enforce project-based access control
-- Dependencies: 002_schema.sql, NanumAuth RLS helpers
-- =============================================

-- =============================================
-- HELPER FUNCTIONS for PM Module
-- =============================================

-- Check if current user is a member of a specific project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND is_active = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user has at least the required permission level on a project
-- Permission hierarchy: admin > edit > own_progress > view
CREATE OR REPLACE FUNCTION public.has_project_permission(
    p_project_id UUID,
    p_required member_permission
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND is_active = true
        AND (
            -- admin can do everything
            permission = 'admin'
            -- edit can do edit, own_progress, view
            OR (p_required IN ('edit', 'own_progress', 'view') AND permission = 'edit')
            -- own_progress can do own_progress, view
            OR (p_required IN ('own_progress', 'view') AND permission = 'own_progress')
            -- view can only view
            OR (p_required = 'view' AND permission = 'view')
        )
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_permission(UUID, member_permission) TO authenticated;

COMMENT ON FUNCTION public.is_project_member(UUID) IS '현재 사용자가 특정 프로젝트의 활성 멤버인지 확인';
COMMENT ON FUNCTION public.has_project_permission(UUID, member_permission) IS '현재 사용자가 특정 프로젝트에서 요구 권한 이상을 가지고 있는지 확인';

-- =============================================
-- Enable RLS on all PM tables
-- =============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: projects
-- =============================================

CREATE POLICY "Members can view their projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(id)
    );

CREATE POLICY "Authenticated users can create projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Project admins can update projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(id, 'admin')
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Project admins can delete projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(id, 'admin')
    );

-- =============================================
-- RLS POLICIES: project_members
-- =============================================

CREATE POLICY "Members can view project members"
    ON public.project_members
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Project admins can add members"
    ON public.project_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'admin')
    );

CREATE POLICY "Project admins can update members"
    ON public.project_members
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'admin')
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Project admins can remove members"
    ON public.project_members
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'admin')
    );

-- =============================================
-- RLS POLICIES: project_items
-- =============================================

CREATE POLICY "Members can view project items"
    ON public.project_items
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Editors can create project items"
    ON public.project_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    );

CREATE POLICY "Editors can update project items"
    ON public.project_items
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Editors can delete project items"
    ON public.project_items
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    );

-- =============================================
-- RLS POLICIES: task_assignees
-- =============================================

CREATE POLICY "Members can view assignees"
    ON public.task_assignees
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Editors can create assignees"
    ON public.task_assignees
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    );

CREATE POLICY "Editors can update assignees"
    ON public.task_assignees
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Editors can delete assignees"
    ON public.task_assignees
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    );

-- =============================================
-- RLS POLICIES: task_dependencies
-- (보안 강화: tenant_id만 체크하던 것 → project_id + is_project_member 추가)
-- =============================================

CREATE POLICY "Members can view dependencies"
    ON public.task_dependencies
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Editors can create dependencies"
    ON public.task_dependencies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    );

CREATE POLICY "Editors can update dependencies"
    ON public.task_dependencies
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Editors can delete dependencies"
    ON public.task_dependencies
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.has_project_permission(project_id, 'edit')
    );

-- =============================================
-- RLS POLICIES: comments
-- =============================================

CREATE POLICY "Members can view comments"
    ON public.comments
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Members can create comments"
    ON public.comments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Authors can update own comments"
    ON public.comments
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND created_by = auth.uid()
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Authors can delete own comments"
    ON public.comments
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin'))
    );

-- =============================================
-- RLS POLICIES: documents
-- =============================================

CREATE POLICY "Members can view documents"
    ON public.documents
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Members can upload documents"
    ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Uploaders can update own documents"
    ON public.documents
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin'))
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Admins can delete documents"
    ON public.documents
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin'))
    );

-- =============================================
-- RLS POLICIES: document_versions
-- =============================================

CREATE POLICY "Members can view document versions"
    ON public.document_versions
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Members can create document versions"
    ON public.document_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- =============================================
-- RLS POLICIES: time_entries
-- =============================================

CREATE POLICY "Members can view time entries"
    ON public.time_entries
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND public.is_project_member(project_id)
    );

CREATE POLICY "Users can create own time entries"
    ON public.time_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own time entries"
    ON public.time_entries
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND user_id = auth.uid()
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can delete own time entries"
    ON public.time_entries
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND user_id = auth.uid()
    );

-- =============================================
-- RLS POLICIES: checklist_items
-- =============================================

CREATE POLICY "Members can view checklists"
    ON public.checklist_items
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Members can create checklist items"
    ON public.checklist_items
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Members can update checklist items"
    ON public.checklist_items
    FOR UPDATE
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Members can delete checklist items"
    ON public.checklist_items
    FOR DELETE
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

-- =============================================
-- RLS POLICIES: activity_log
-- =============================================

CREATE POLICY "Members can view project activity"
    ON public.activity_log
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_current_tenant_id()
        AND (
            (project_id IS NOT NULL AND public.is_project_member(project_id))
            OR (project_id IS NULL AND public.is_current_user_admin())
        )
    );

CREATE POLICY "System can insert activity logs"
    ON public.activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Prevent updates and deletes on activity logs (immutable)
CREATE POLICY "Prevent activity log updates"
    ON public.activity_log
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "Prevent activity log deletes"
    ON public.activity_log
    FOR DELETE
    TO authenticated
    USING (false);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
