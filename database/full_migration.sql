-- =============================================
-- NanumProject PM Module - ENUM Types
-- Purpose: Define all enum types for project management tables
-- =============================================

-- 프로젝트 상태
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'complete', 'archived');

-- 프로젝트 멤버 권한 (계층: admin > edit > own_progress > view)
CREATE TYPE member_permission AS ENUM ('admin', 'edit', 'own_progress', 'view');

-- 프로젝트 멤버 초대 상태
CREATE TYPE member_status AS ENUM ('pending', 'accepted', 'declined');

-- 프로젝트 아이템 타입 (group=그룹/서브그룹, task=작업, milestone=이정표)
CREATE TYPE item_type AS ENUM ('group', 'task', 'milestone');

-- 태스크 의존성 타입 (간트차트)
-- fs=Finish-to-Start, ss=Start-to-Start, ff=Finish-to-Finish, sf=Start-to-Finish
CREATE TYPE dependency_type AS ENUM ('fs', 'ss', 'ff', 'sf');

-- 코멘트/문서 대상 타입 (다형성 관계)
CREATE TYPE comment_target AS ENUM ('project', 'item');

-- 시간 기록 타입
CREATE TYPE time_entry_type AS ENUM ('punched', 'manual');

-- 기본 뷰 타입
CREATE TYPE view_type AS ENUM ('gantt', 'board', 'list', 'calendar');
-- =============================================
-- NanumProject PM Module - Table Schema
-- Purpose: Create all project management tables with indexes and comments
-- Dependencies: 001_enums.sql, NanumAuth (tenants, auth.users)
-- =============================================

-- Enable UUID extension (idempotent, already enabled by NanumAuth)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: projects
-- Purpose: Project metadata and settings
-- =============================================
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

COMMENT ON TABLE public.projects IS '프로젝트 관리 - 프로젝트 메타데이터';
COMMENT ON COLUMN public.projects.tg_id IS 'TeamGantt 원본 ID (마이그레이션 추적용, 신규 데이터는 NULL)';
COMMENT ON COLUMN public.projects.work_days IS '근무 요일 배열 (1=월요일 ~ 7=일요일)';
COMMENT ON COLUMN public.projects.settings IS 'JSONB: 기타 프로젝트별 설정 (통화, 캘린더 시작일 등)';

-- =============================================
-- TABLE: project_members
-- Purpose: User-project associations with permission levels
-- =============================================
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

COMMENT ON TABLE public.project_members IS '프로젝트-사용자 매핑 (접근 권한 관리)';
COMMENT ON COLUMN public.project_members.color IS '간트차트에서 사용자에게 할당된 색상';
COMMENT ON COLUMN public.project_members.permission IS '권한 계층: admin > edit > own_progress > view';

-- =============================================
-- TABLE: project_items
-- Purpose: Unified hierarchical project items (groups, tasks, milestones)
--          parentId 기반 단일 플랫 트리 (DevExtreme Gantt 호환)
-- =============================================
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

    -- task/milestone 전용 (group은 NULL)
    estimated_hours DECIMAL(10,2) DEFAULT 0,
    actual_hours DECIMAL(10,2) DEFAULT 0,
    is_critical BOOLEAN,
    slack INTEGER,

    is_time_tracking_enabled BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    custom_fields JSONB DEFAULT '{}'::jsonb,

    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT project_items_name_check CHECK (char_length(name) >= 1),
    CONSTRAINT project_items_no_self_parent CHECK (parent_id != id)
);

CREATE INDEX IF NOT EXISTS idx_project_items_tenant ON public.project_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_items_project ON public.project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_parent ON public.project_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_items_tg_id ON public.project_items(tg_id) WHERE tg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_items_dates ON public.project_items(project_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_project_items_sort ON public.project_items(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_items_type ON public.project_items(project_id, item_type);

COMMENT ON TABLE public.project_items IS '프로젝트 아이템 통합 테이블 (그룹/태스크/마일스톤, parentId 기반 트리 구조)';
COMMENT ON COLUMN public.project_items.tg_id IS 'TeamGantt 원본 ID (마이그레이션 추적용, 신규 데이터는 NULL)';
COMMENT ON COLUMN public.project_items.parent_id IS 'NULL이면 최상위 아이템, 값이 있으면 하위 아이템 (자기참조, 깊이 제한 없음)';
COMMENT ON COLUMN public.project_items.item_type IS 'group=그룹/서브그룹, task=작업, milestone=이정표';
COMMENT ON COLUMN public.project_items.wbs IS 'Work Breakdown Structure 코드 (예: 1, 1.1, 2.3)';
COMMENT ON COLUMN public.project_items.days IS '작업 기간 (근무일 기준)';
COMMENT ON COLUMN public.project_items.slack IS '크리티컬 패스 분석 시 여유 시간 (일 단위)';
COMMENT ON COLUMN public.project_items.custom_fields IS 'JSONB: 사용자 정의 필드 (확장성)';

-- =============================================
-- TABLE: task_assignees
-- Purpose: Item-user assignments (resource allocation)
-- =============================================
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

COMMENT ON TABLE public.task_assignees IS '아이템-담당자 매핑 (리소스 할당)';
COMMENT ON COLUMN public.task_assignees.raci_role IS 'RACI 역할: R=Responsible, A=Accountable, C=Consulted, I=Informed';
COMMENT ON COLUMN public.task_assignees.hours_per_day IS '일일 할당 시간 (리소스 관리용)';
COMMENT ON COLUMN public.task_assignees.item_id IS 'project_items 참조 (기존 task_id에서 변경)';

-- =============================================
-- TABLE: task_dependencies
-- Purpose: Item relationship links (Gantt chart arrows)
-- =============================================
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

COMMENT ON TABLE public.task_dependencies IS '아이템 간 의존성 관계 (간트차트 화살표)';
COMMENT ON COLUMN public.task_dependencies.project_id IS 'RLS 보안 강화용 프로젝트 참조';
COMMENT ON COLUMN public.task_dependencies.dependency_type IS 'fs=Finish-to-Start, ss=Start-to-Start, ff=Finish-to-Finish, sf=Start-to-Finish';
COMMENT ON COLUMN public.task_dependencies.lag_days IS '양수=지연(lag), 음수=리드(lead)';

-- =============================================
-- TABLE: comments
-- Purpose: Comments on projects/items (polymorphic)
-- =============================================
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

COMMENT ON TABLE public.comments IS '프로젝트/아이템에 대한 코멘트 (다형성 관계)';
COMMENT ON COLUMN public.comments.target_id IS 'target_type에 따라 projects 또는 project_items의 id 참조';
COMMENT ON COLUMN public.comments.mentioned_user_ids IS '@멘션된 사용자 UUID 배열';
COMMENT ON COLUMN public.comments.notified_user_ids IS '이메일 알림을 받은 사용자 UUID 배열';

-- =============================================
-- TABLE: documents
-- Purpose: Document/attachment metadata (versioned)
-- =============================================
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

COMMENT ON TABLE public.documents IS '문서/첨부파일 메타데이터 (버전 관리 지원)';
COMMENT ON COLUMN public.documents.current_version_id IS '최신 버전 참조 (document_versions.id)';
COMMENT ON COLUMN public.documents.comment_id IS '코멘트에 첨부된 경우 해당 코멘트 참조';
COMMENT ON COLUMN public.documents.target_id IS 'target_type에 따라 projects 또는 project_items의 id 참조';

-- =============================================
-- TABLE: document_versions
-- Purpose: Document version history (Supabase Storage integration)
-- =============================================
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

-- 순환참조 해결: documents.current_version_id FK 추가
ALTER TABLE public.documents
    ADD CONSTRAINT documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id)
    ON DELETE SET NULL;

COMMENT ON TABLE public.document_versions IS '문서 버전 히스토리 (Supabase Storage 연동)';
COMMENT ON COLUMN public.document_versions.storage_path IS 'Supabase Storage 버킷 내 파일 경로';
COMMENT ON COLUMN public.document_versions.file_hash IS 'SHA-256 해시 (무결성 검증용)';

-- =============================================
-- TABLE: time_entries
-- Purpose: Time tracking records
-- =============================================
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

    CONSTRAINT time_entries_valid CHECK (
        end_time IS NULL OR end_time >= start_time
    )
);

CREATE INDEX IF NOT EXISTS idx_time_entries_item ON public.time_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_dates ON public.time_entries(start_time, end_time);

COMMENT ON TABLE public.time_entries IS '작업 시간 추적 기록';
COMMENT ON COLUMN public.time_entries.entry_type IS 'punched=타이머 기록, manual=수동 입력';
COMMENT ON COLUMN public.time_entries.end_time IS 'NULL이면 현재 진행 중인 시간 기록';
COMMENT ON COLUMN public.time_entries.duration_minutes IS '계산된 시간(분) 또는 수동 입력값';
COMMENT ON COLUMN public.time_entries.item_id IS 'project_items 참조 (기존 task_id에서 변경)';

-- =============================================
-- TABLE: checklist_items
-- Purpose: Item checklist items
-- =============================================
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

COMMENT ON TABLE public.checklist_items IS '아이템 체크리스트 항목';
COMMENT ON COLUMN public.checklist_items.item_id IS 'project_items 참조 (기존 task_id에서 변경)';

-- =============================================
-- TABLE: activity_log
-- Purpose: Application-level activity log (separate from NanumAuth audit_logs)
-- =============================================
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

COMMENT ON TABLE public.activity_log IS '프로젝트 활동 로그 (앱 수준, NanumAuth audit_logs와 별도)';
COMMENT ON COLUMN public.activity_log.target_type IS 'project, item, comment, document 등';
COMMENT ON COLUMN public.activity_log.action IS 'created, updated, completed, assigned, commented 등';
COMMENT ON COLUMN public.activity_log.details IS 'JSONB: 변경 상세 (이전값, 새값 등)';
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
-- =============================================
-- NanumProject PM Module - Triggers
-- Purpose: Automate timestamp updates and audit logging
-- Dependencies: 003_rls.sql, NanumAuth triggers (update_updated_at_column, create_audit_log)
-- =============================================

-- =============================================
-- updated_at 자동 갱신 트리거
-- NanumAuth의 update_updated_at_column() 함수를 재사용
-- =============================================

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_items_updated_at
    BEFORE UPDATE ON public.project_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_assignees_updated_at
    BEFORE UPDATE ON public.task_assignees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
    BEFORE UPDATE ON public.checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- activity_log와 task_dependencies는 immutable이므로 updated_at 트리거 불필요

-- =============================================
-- 감사 로깅 트리거 (주요 테이블만)
-- NanumAuth의 create_audit_log() 함수를 재사용
-- =============================================

CREATE TRIGGER audit_projects_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_project_members_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- =============================================
-- 트리거 문서화
-- =============================================
COMMENT ON TRIGGER update_projects_updated_at ON public.projects IS 'projects 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_project_members_updated_at ON public.project_members IS 'project_members 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_project_items_updated_at ON public.project_items IS 'project_items 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_task_assignees_updated_at ON public.task_assignees IS 'task_assignees 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_comments_updated_at ON public.comments IS 'comments 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_documents_updated_at ON public.documents IS 'documents 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_time_entries_updated_at ON public.time_entries IS 'time_entries 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER update_checklist_items_updated_at ON public.checklist_items IS 'checklist_items 수정 시 updated_at 자동 갱신';
COMMENT ON TRIGGER audit_projects_changes ON public.projects IS '프로젝트 변경 시 감사 로그 자동 생성';
COMMENT ON TRIGGER audit_project_members_changes ON public.project_members IS '멤버 변경 시 감사 로그 자동 생성';
