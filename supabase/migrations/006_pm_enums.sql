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

-- 그룹 타입 (그룹 vs 서브그룹, 최대 2레벨 계층)
CREATE TYPE group_type AS ENUM ('group', 'subgroup');

-- 태스크 의존성 타입 (간트차트)
-- fs=Finish-to-Start, ss=Start-to-Start, ff=Finish-to-Finish, sf=Start-to-Finish
CREATE TYPE dependency_type AS ENUM ('fs', 'ss', 'ff', 'sf');

-- 코멘트/문서 대상 타입 (다형성 관계)
CREATE TYPE comment_target AS ENUM ('project', 'group', 'task');

-- 시간 기록 타입
CREATE TYPE time_entry_type AS ENUM ('punched', 'manual');

-- 기본 뷰 타입
CREATE TYPE view_type AS ENUM ('gantt', 'board', 'list', 'calendar');
