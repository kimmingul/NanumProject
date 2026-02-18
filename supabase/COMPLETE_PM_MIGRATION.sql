-- =============================================
-- NanumProject PM Module - Complete Migration
-- Run this AFTER COMPLETE_MIGRATION.sql (auth module)
-- Execute in Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: ENUM Types (006_pm_enums.sql)
-- =============================================

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'complete', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE member_permission AS ENUM ('admin', 'edit', 'own_progress', 'view');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('group', 'task', 'milestone');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE dependency_type AS ENUM ('fs', 'ss', 'ff', 'sf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE comment_target AS ENUM ('project', 'item');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE time_entry_type AS ENUM ('punched', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE view_type AS ENUM ('gantt', 'board', 'list', 'calendar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- STEP 2: Tables (007_pm_schema.sql)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER UNIQUE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'active',
    default_view view_type DEFAULT 'gantt',
    start_date DATE,
    end_date DATE,
    work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    is_template BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    has_hours_enabled BOOLEAN DEFAULT false,
    lock_milestone_dates BOOLEAN DEFAULT false,
    allow_scheduling_on_holidays BOOLEAN DEFAULT false,
    in_resource_management BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT projects_name_check CHECK (char_length(name) >= 1),
    CONSTRAINT projects_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_tg_id ON public.projects(tg_id) WHERE tg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_dates ON public.projects(start_date, end_date);

-- project_members
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission member_permission NOT NULL DEFAULT 'view',
    status member_status NOT NULL DEFAULT 'pending',
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT project_members_unique UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON public.project_members(tenant_id);

-- project_items (unified: groups, tasks, milestones)
CREATE TABLE IF NOT EXISTS public.project_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.project_items(id) ON DELETE CASCADE,
    item_type item_type NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    wbs VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    color VARCHAR(20),
    start_date DATE,
    end_date DATE,
    days INTEGER,
    percent_complete INTEGER DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
    estimated_hours DECIMAL(10,2) DEFAULT 0,
    actual_hours DECIMAL(10,2) DEFAULT 0,
    is_estimated_hours_enabled BOOLEAN DEFAULT false,
    is_critical BOOLEAN,
    slack INTEGER,
    is_milestone BOOLEAN DEFAULT false,
    is_time_tracking_enabled BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT project_items_name_check CHECK (char_length(name) >= 1),
    CONSTRAINT project_items_no_self_parent CHECK (parent_id != id),
    CONSTRAINT project_items_milestone_consistency CHECK (
        (item_type = 'milestone' AND is_milestone = true)
        OR (item_type != 'milestone' AND is_milestone = false)
    )
);

CREATE INDEX IF NOT EXISTS idx_project_items_tenant ON public.project_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_items_project ON public.project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_parent ON public.project_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_items_tg_id ON public.project_items(tg_id) WHERE tg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_items_dates ON public.project_items(project_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_project_items_sort ON public.project_items(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_items_type ON public.project_items(project_id, item_type);

-- task_assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    item_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    hours_per_day DECIMAL(5,2) DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0,
    raci_role VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT task_assignees_unique UNIQUE(item_id, user_id),
    CONSTRAINT task_assignees_raci CHECK (raci_role IS NULL OR raci_role IN ('R','A','C','I'))
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_item ON public.task_assignees(item_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_project ON public.task_assignees(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_tenant ON public.task_assignees(tenant_id);

-- task_dependencies
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
    dependency_type dependency_type NOT NULL DEFAULT 'fs',
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT task_deps_no_self CHECK (predecessor_id != successor_id),
    CONSTRAINT task_deps_unique UNIQUE(predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_predecessor ON public.task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_successor ON public.task_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_tenant ON public.task_dependencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_project ON public.task_dependencies(project_id);

-- comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    target_type comment_target NOT NULL,
    target_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    pinned_at TIMESTAMPTZ,
    mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    notified_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT comments_message_check CHECK (char_length(message) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON public.comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_tenant ON public.comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_tg_id ON public.comments(tg_id) WHERE tg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(project_id, created_at DESC);

-- documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    target_type comment_target NOT NULL,
    target_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
    current_version_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_target ON public.documents(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tg_id ON public.documents(tg_id) WHERE tg_id IS NOT NULL;

-- document_versions
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(255),
    storage_path TEXT NOT NULL,
    file_hash VARCHAR(64),
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT doc_versions_unique UNIQUE(document_id, version_number),
    CONSTRAINT doc_versions_size CHECK (file_size IS NULL OR file_size >= 0)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_tenant ON public.document_versions(tenant_id);

ALTER TABLE public.documents
    ADD CONSTRAINT documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id)
    ON DELETE SET NULL;

-- time_entries
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_type time_entry_type NOT NULL DEFAULT 'manual',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    note TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT time_entries_valid CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_item ON public.time_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_dates ON public.time_entries(start_time, end_time);

-- checklist_items
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tg_id INTEGER,
    item_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT checklist_name_check CHECK (char_length(name) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_checklist_item ON public.checklist_items(item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tenant ON public.checklist_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sort ON public.checklist_items(item_id, sort_order);

-- activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_project ON public.activity_log(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON public.activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_target ON public.activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON public.activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_log(created_at DESC);

-- =============================================
-- STEP 3: RLS Helper Functions (008_pm_rls.sql)
-- =============================================

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
            permission = 'admin'
            OR (p_required IN ('edit', 'own_progress', 'view') AND permission = 'edit')
            OR (p_required IN ('own_progress', 'view') AND permission = 'own_progress')
            OR (p_required = 'view' AND permission = 'view')
        )
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_permission(UUID, member_permission) TO authenticated;

-- =============================================
-- STEP 4: Enable RLS
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
-- STEP 5: RLS Policies
-- 테넌트 admin (profiles.role = 'admin')은
-- project_members 등록 없이도 모든 프로젝트 데이터 접근 가능
-- =============================================

-- projects (admin은 테넌트 내 모든 프로젝트 접근 가능)
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.is_project_member(id) OR public.is_current_user_admin()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(id, 'admin') OR public.is_current_user_admin()))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(id, 'admin') OR public.is_current_user_admin()));

-- project_members (admin은 테넌트 내 모든 멤버 접근 가능)
CREATE POLICY "project_members_select" ON public.project_members FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.is_project_member(project_id) OR public.is_current_user_admin()));
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'admin') OR public.is_current_user_admin()));
CREATE POLICY "project_members_update" ON public.project_members FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'admin') OR public.is_current_user_admin()))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "project_members_delete" ON public.project_members FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'admin') OR public.is_current_user_admin()));

-- project_items (admin은 테넌트 내 모든 아이템 접근 가능)
CREATE POLICY "project_items_select" ON public.project_items FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.is_project_member(project_id) OR public.is_current_user_admin()));
CREATE POLICY "project_items_insert" ON public.project_items FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'edit') OR public.is_current_user_admin()));
CREATE POLICY "project_items_update" ON public.project_items FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'edit') OR public.is_current_user_admin()))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "project_items_delete" ON public.project_items FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'edit') OR public.is_current_user_admin()));

-- task_assignees (admin은 테넌트 내 모든 담당자 접근 가능)
CREATE POLICY "task_assignees_select" ON public.task_assignees FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.is_project_member(project_id) OR public.is_current_user_admin()));
CREATE POLICY "task_assignees_insert" ON public.task_assignees FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'edit') OR public.is_current_user_admin()));
CREATE POLICY "task_assignees_update" ON public.task_assignees FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'edit') OR public.is_current_user_admin()))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "task_assignees_delete" ON public.task_assignees FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (public.has_project_permission(project_id, 'edit') OR public.is_current_user_admin()));

-- task_dependencies
CREATE POLICY "Members can view dependencies" ON public.task_dependencies FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_project_member(project_id));
CREATE POLICY "Editors can create dependencies" ON public.task_dependencies FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.has_project_permission(project_id, 'edit'));
CREATE POLICY "Editors can update dependencies" ON public.task_dependencies FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.has_project_permission(project_id, 'edit'))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Editors can delete dependencies" ON public.task_dependencies FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.has_project_permission(project_id, 'edit'));

-- comments
CREATE POLICY "Members can view comments" ON public.comments FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_project_member(project_id));
CREATE POLICY "Members can create comments" ON public.comments FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_project_member(project_id));
CREATE POLICY "Authors can update own comments" ON public.comments FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND created_by = auth.uid())
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Authors can delete own comments" ON public.comments FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin')));

-- documents
CREATE POLICY "Members can view documents" ON public.documents FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_project_member(project_id));
CREATE POLICY "Members can upload documents" ON public.documents FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_project_member(project_id));
CREATE POLICY "Uploaders can update own documents" ON public.documents FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin')))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin')));

-- document_versions (프로젝트 멤버 확인: documents JOIN)
CREATE POLICY "Members can view document versions" ON public.document_versions FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_versions.document_id AND public.is_project_member(d.project_id)));
CREATE POLICY "Members can create document versions" ON public.document_versions FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_versions.document_id AND public.is_project_member(d.project_id)));

-- time_entries
CREATE POLICY "Members can view time entries" ON public.time_entries FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_project_member(project_id));
CREATE POLICY "Users can create own time entries" ON public.time_entries FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid());
CREATE POLICY "Users can update own time entries" ON public.time_entries FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid())
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Users can delete own time entries" ON public.time_entries FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid());

-- checklist_items (프로젝트 멤버 확인: project_items JOIN)
CREATE POLICY "Members can view checklists" ON public.checklist_items FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND EXISTS (SELECT 1 FROM public.project_items pi WHERE pi.id = checklist_items.item_id AND public.is_project_member(pi.project_id)));
CREATE POLICY "Members can create checklist items" ON public.checklist_items FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND EXISTS (SELECT 1 FROM public.project_items pi WHERE pi.id = checklist_items.item_id AND public.is_project_member(pi.project_id)));
CREATE POLICY "Members can update checklist items" ON public.checklist_items FOR UPDATE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND EXISTS (SELECT 1 FROM public.project_items pi WHERE pi.id = checklist_items.item_id AND public.is_project_member(pi.project_id)))
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Members can delete checklist items" ON public.checklist_items FOR DELETE TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND EXISTS (SELECT 1 FROM public.project_items pi WHERE pi.id = checklist_items.item_id AND public.is_project_member(pi.project_id)));

-- activity_log (immutable)
CREATE POLICY "Members can view project activity" ON public.activity_log FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND (
        (project_id IS NOT NULL AND public.is_project_member(project_id))
        OR (project_id IS NULL AND public.is_current_user_admin())
    ));
CREATE POLICY "System can insert activity logs" ON public.activity_log FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Prevent activity log updates" ON public.activity_log FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Prevent activity log deletes" ON public.activity_log FOR DELETE TO authenticated USING (false);

-- =============================================
-- STEP 6: Grant Permissions
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

-- =============================================
-- STEP 7: Triggers (009_pm_triggers.sql)
-- =============================================

-- Audit log function for PM tables
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata)
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at triggers
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_items_updated_at
    BEFORE UPDATE ON public.project_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_assignees_updated_at
    BEFORE UPDATE ON public.task_assignees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
    BEFORE UPDATE ON public.checklist_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_projects_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_project_members_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_project_items_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.project_items
    FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- =============================================
-- STEP 8: Helper view for PM data status
-- =============================================

CREATE OR REPLACE VIEW public.pm_data_status AS
SELECT 'projects' AS table_name, COUNT(*) AS record_count FROM public.projects
UNION ALL
SELECT 'project_members', COUNT(*) FROM public.project_members
UNION ALL
SELECT 'project_items', COUNT(*) FROM public.project_items
UNION ALL
SELECT 'task_assignees', COUNT(*) FROM public.task_assignees
UNION ALL
SELECT 'task_dependencies', COUNT(*) FROM public.task_dependencies
UNION ALL
SELECT 'comments', COUNT(*) FROM public.comments
UNION ALL
SELECT 'time_entries', COUNT(*) FROM public.time_entries;

GRANT SELECT ON public.pm_data_status TO authenticated;

SELECT 'PM Module migration completed successfully!' AS status;
SELECT * FROM public.pm_data_status;
