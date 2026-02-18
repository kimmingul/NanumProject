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
