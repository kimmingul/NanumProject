# DATABASE-GUIDE.md — 데이터베이스 설계 가이드

> NanumProject의 Supabase (PostgreSQL) 데이터베이스 설계 원칙, 마이그레이션 이력, 테이블/함수/트리거 상세 레퍼런스.

---

## 1. 설계 원칙

### 1.1 멀티테넌시 (Multi-tenancy)

모든 비즈니스 테이블에 `tenant_id UUID NOT NULL REFERENCES tenants(id)` 컬럼이 존재한다.
RLS 정책에서 `get_current_tenant_id()` 헬퍼로 현재 사용자의 테넌트를 자동 격리한다.

```sql
-- 전형적인 RLS USING 절
USING (tenant_id = public.get_current_tenant_id())
```

하나의 PostgreSQL 데이터베이스 안에서 **행 수준 보안(RLS)** 으로 테넌트를 격리하는 Shared-schema 방식을 사용한다.

### 1.2 소프트 삭제 (Soft Delete)

대부분의 테이블에 `is_active BOOLEAN DEFAULT true` 필드가 존재한다.

| 필드 | 의미 |
|------|------|
| `is_active = true` | 정상 데이터 (기본값) |
| `is_active = false` | 소프트 삭제됨 — UI에서 미표시 |

> **주의**: `is_active`(레코드 존재 여부)와 `projects.status`(프로젝트 상태: active/on_hold/complete/archived)는 독립적인 개념이다.

### 1.3 JSONB 활용

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `tenants` | `settings` | 브랜딩, 기능 플래그, 보안 정책 |
| `profiles` | `metadata` | 사용자 확장 메타데이터 |
| `profiles` | `preferences` | UI 설정 (theme, density, dateFormat, timezone 등) |
| `project_items` | `custom_fields` | 유연한 확장 필드 |
| `activity_log` | `details` | 활동 상세 정보 |
| `audit_logs` | `metadata` | 변경 전/후 스냅샷 (old/new) |

### 1.4 감사 추적 (Audit Trail)

두 가지 감사 메커니즘이 병행된다:

- **`audit_logs`** — Auth 모듈 테이블 변경 자동 기록 (tenants, applications, projects, project_members, project_items)
- **`activity_log`** — PM 모듈 활동 로그 (프로젝트 단위, 수동 삽입)

두 테이블 모두 immutable (UPDATE/DELETE 정책이 `USING (false)`로 차단).

### 1.5 UUID 기본 키

모든 테이블의 PK는 `UUID DEFAULT uuid_generate_v4()` 또는 `gen_random_uuid()`를 사용한다.
`tg_id INTEGER` 컬럼은 외부 시스템(TeamGantt 등) 연동용 레거시 ID이다.

---

## 2. 마이그레이션 관리

모든 마이그레이션 파일은 `supabase/migrations/` 디렉토리에 위치하며, **Supabase SQL Editor**에서 순서대로 실행한다.

| # | 파일명 | 설명 |
|---|--------|------|
| 001 | `001_auth.sql` | Auth 모듈 전체: tenants, profiles, applications, audit_logs, sessions + RLS + 트리거 + 비즈니스 함수 |
| 002 | `002_pm.sql` | PM 모듈 전체: 8개 Enum + 12개 테이블 + RLS + 트리거 + 헬퍼 함수 |
| 003 | `003_seed.sql` | 초기 데이터 (Default Tenant, Demo Hospital) + seed_data_status 뷰 |
| 004 | `004_add_task_status.sql` | `task_status` enum 생성 + project_items 컬럼 추가 + custom_fields 데이터 마이그레이션 |
| 005 | `005_avatars_bucket.sql` | avatars Storage 버킷 (public) + RLS 정책 4개 |
| 006 | `006_update_roles.sql` | Role 체계 변경: admin/user/developer → admin/manager/member/viewer + 함수 갱신 |
| 007 | `007_create_tenant_user.sql` | handle_new_user 트리거 수정 ('user' → 'member') + create_tenant_user RPC |
| 008 | `008_fix_missing_functions.sql` | deactivate_user, reactivate_user, revoke_user_sessions 재생성 (누락 방지) |
| 009 | `009_item_links.sql` | item_links 테이블 + link_type enum + milestone hierarchy 트리거 + get_item_comment_counts RPC |
| 010 | `010_profile_extended_fields.sql` | profiles 확장 (phone, department, position, address 등) + get_user_profile 재생성 |
| 011 | `011_notifications.sql` | notifications 테이블 + notification_type enum + RPC 2개 + 알림 트리거 2개 |
| 012 | `012_project_templates.sql` | clone_project_from_template RPC (아이템/의존성 포함 프로젝트 복제) |
| 013 | `013_user_preferences.sql` | profiles.preferences JSONB 컬럼 추가 |
| 014 | `014_project_manager.sql` | projects.manager_id 컬럼 추가 + 기존 데이터 backfill |

> **실행 순서**: 반드시 001 → 002 → ... → 014 순서로 실행해야 한다. 각 파일 상단 주석의 선행 조건을 확인할 것.

---

## 3. 핵심 테이블 설계

### 3.1 project_items — 통합 아이템 테이블

DevExtreme Gantt에 최적화된 **단일 계층 테이블**로, 그룹/태스크/마일스톤을 하나의 테이블에서 관리한다.

```
project_items
├── item_type: 'group' | 'task' | 'milestone'
├── parent_id: 자기참조 FK (트리 구조, NULL = 최상위)
├── project_id: 프로젝트 소속
├── task_status: 'todo' | 'in_progress' | 'review' | 'done'
└── sort_order: 형제 노드 간 정렬 순서
```

**DevExtreme Gantt 매핑**:

| DB 컬럼 | Gantt 속성 | 설명 |
|---------|-----------|------|
| `id` | `id` | 고유 키 |
| `parent_id` | `parentId` | 부모 아이템 |
| `name` | `title` | 아이템 이름 |
| `start_date` | `start` | 시작일 |
| `end_date` | `end` | 종료일 |
| `percent_complete` | `progress` | 진행률 (0-100) |
| `color` | `color` | 바 색상 |

**무결성 제약조건**:
- `project_items_no_self_parent`: `parent_id != id` (자기 자신을 부모로 지정 불가)
- `project_items_milestone_consistency`: milestone 타입일 때만 `is_milestone = true`
- `validate_milestone_hierarchy` 트리거: milestone에 자식 추가 방지, 자식 있는 item의 milestone 변환 방지

### 3.2 comments — 다형성 대상 (Polymorphic Target)

```sql
target_type comment_target NOT NULL,  -- 'project' | 'item'
target_id   UUID NOT NULL,            -- project.id 또는 project_item.id
```

하나의 comments 테이블로 프로젝트 수준 코멘트와 아이템 수준 코멘트를 모두 관리한다.
`mentioned_user_ids UUID[]` 배열로 @멘션된 사용자를 추적하며, 트리거를 통해 알림이 자동 생성된다.

### 3.3 notifications — 트리거 기반 자동 생성

```sql
type notification_type NOT NULL  -- 'assignment' | 'comment_mention' | 'status_change' | 'due_date'
```

알림은 두 개의 AFTER INSERT 트리거에 의해 자동 생성된다:

| 트리거 | 이벤트 | 알림 타입 |
|--------|--------|-----------|
| `trg_notify_on_assignment` | task_assignees INSERT | `assignment` |
| `trg_notify_on_comment_mention` | comments INSERT (mentioned_user_ids 비어있지 않을 때) | `comment_mention` |

> 자기 자신에게는 알림을 보내지 않는다 (self-assignment, self-mention 제외).

### 3.4 documents + document_versions — 버전 관리

```
documents (메타데이터)
  ├── current_version_id → document_versions.id
  └── document_versions (파일 히스토리)
        ├── version_number (document_id별 UNIQUE)
        ├── storage_path (Supabase Storage 경로)
        └── file_hash (중복 방지)
```

---

## 4. RPC 함수 목록

> **파라미터 규칙**: SQL 파라미터는 `p_` 접두사를 사용한다. TypeScript RPC 호출 시 **SQL과 동일한 이름**을 사용해야 한다 (PostgREST 이름 기반 매칭).

### Auth 모듈 함수

| 함수 | 시그니처 | 권한 | 설명 |
|------|----------|------|------|
| `get_user_profile` | `(p_user_id UUID DEFAULT NULL)` | authenticated | 프로필 + 테넌트 정보 (확장 필드 포함) |
| `get_tenant_stats` | `(p_tenant_id UUID)` | authenticated | 테넌트 통계 (역할별 사용자 수) |
| `search_users` | `(p_search_term TEXT, p_limit INT, p_offset INT)` | authenticated | 이메일/이름 검색 |
| `get_audit_logs` | `(p_action TEXT, p_resource_type TEXT, p_user_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ, p_limit INT, p_offset INT)` | admin | 감사 로그 조회 |
| `update_user_role` | `(p_user_id UUID, p_new_role TEXT)` | admin | 역할 변경 (admin/manager/member/viewer) |
| `create_tenant_user` | `(p_email TEXT, p_full_name TEXT, p_role TEXT)` | admin | 테넌트 내 사용자 생성 (auth.users + identities + profiles) |
| `deactivate_user` | `(p_user_id UUID)` | admin | 계정 비활성화 + 세션 해제 |
| `reactivate_user` | `(p_user_id UUID)` | admin | 계정 재활성화 |
| `revoke_user_sessions` | `(p_user_id UUID)` | 본인 또는 admin | 세션 전체 해제 |
| `get_active_sessions_count` | `(p_user_id UUID DEFAULT NULL)` | authenticated | 활성 세션 수 |
| `rotate_application_secret` | `(p_application_id UUID)` | admin/developer | OAuth 앱 시크릿 갱신 |

### PM 모듈 함수

| 함수 | 시그니처 | 권한 | 설명 |
|------|----------|------|------|
| `is_project_member` | `(p_project_id UUID)` | authenticated | 프로젝트 멤버 여부 확인 (RLS 헬퍼) |
| `has_project_permission` | `(p_project_id UUID, p_required member_permission)` | authenticated | 프로젝트 권한 확인 (RLS 헬퍼) |
| `get_item_comment_counts` | `(p_project_id UUID)` | authenticated | 프로젝트 전체 item별 댓글 수 배치 조회 (N+1 방지) |
| `clone_project_from_template` | `(p_template_id UUID, p_name TEXT, p_start_date DATE)` | authenticated | 템플릿에서 프로젝트 복제 (아이템 + 의존성 + parent_id 매핑) |

### Notification 함수

| 함수 | 시그니처 | 권한 | 설명 |
|------|----------|------|------|
| `mark_notification_read` | `(p_notification_id UUID)` | authenticated | 단일 알림 읽음 처리 |
| `mark_all_notifications_read` | `()` | authenticated | 전체 알림 읽음 처리 |

---

## 5. 트리거 목록

### updated_at 자동 갱신

`update_updated_at_column()` 함수를 공유하며, BEFORE UPDATE 시 `NEW.updated_at = NOW()`를 설정한다.

| 트리거 | 테이블 |
|--------|--------|
| `update_tenants_updated_at` | tenants |
| `update_profiles_updated_at` | profiles |
| `update_applications_updated_at` | applications |
| `update_projects_updated_at` | projects |
| `update_project_members_updated_at` | project_members |
| `update_project_items_updated_at` | project_items |
| `update_task_assignees_updated_at` | task_assignees |
| `update_comments_updated_at` | comments |
| `update_documents_updated_at` | documents |
| `update_time_entries_updated_at` | time_entries |
| `update_checklist_items_updated_at` | checklist_items |

### 감사 로그 자동 생성

`create_audit_log()` 함수를 공유하며, AFTER INSERT/UPDATE/DELETE 시 audit_logs에 변경 내역을 기록한다.

| 트리거 | 테이블 |
|--------|--------|
| `audit_tenants_changes` | tenants |
| `audit_applications_changes` | applications |
| `audit_projects_changes` | projects |
| `audit_project_members_changes` | project_members |
| `audit_project_items_changes` | project_items |

### Auth 트리거

| 트리거 | 테이블 | 설명 |
|--------|--------|------|
| `on_auth_user_created` | auth.users (AFTER INSERT) | 프로필 자동 생성 (handle_new_user) |
| `on_auth_user_login` | auth.users (AFTER UPDATE) | last_login_at 갱신 |
| `validate_profile_email_trigger` | profiles (BEFORE INSERT/UPDATE) | auth.users 이메일과 동기화 검증 |
| `generate_application_credentials` | applications (BEFORE INSERT) | client_id/secret 자동 생성 |
| `cleanup_sessions_on_insert` | sessions (AFTER INSERT, FOR EACH STATEMENT) | 만료 세션 자동 정리 |

### 계층 구조 검증

| 트리거 | 테이블 | 설명 |
|--------|--------|------|
| `trg_validate_milestone_hierarchy` | project_items (BEFORE INSERT/UPDATE) | milestone에 자식 추가 방지 + 자식 있는 item의 milestone 변환 방지 |

### 알림 트리거

| 트리거 | 테이블 | 설명 |
|--------|--------|------|
| `trg_notify_on_assignment` | task_assignees (AFTER INSERT) | 태스크 할당 시 알림 생성 (self-assignment 제외) |
| `trg_notify_on_comment_mention` | comments (AFTER INSERT) | @멘션 시 알림 생성 (self-mention 제외) |

---

## 6. Enum 타입

| Enum | 값 | 용도 | 정의 위치 |
|------|----|------|-----------|
| `project_status` | active, on_hold, complete, archived | 프로젝트 상태 | 002 |
| `member_permission` | admin, edit, own_progress, view | 프로젝트 권한 계층 | 002 |
| `member_status` | pending, accepted, declined | 프로젝트 초대 상태 | 002 |
| `item_type` | group, task, milestone | 아이템 구분 | 002 |
| `dependency_type` | fs, ss, ff, sf | Gantt 의존성 유형 | 002 |
| `comment_target` | project, item | 코멘트 다형성 대상 | 002 |
| `time_entry_type` | punched, manual | 시간 기록 방식 | 002 |
| `view_type` | gantt, board, list, calendar | 기본 뷰 타입 | 002 |
| `task_status` | todo, in_progress, review, done | 태스크 상태 | 004 |
| `link_type` | blocks, related_to, duplicates | 아이템 의미적 링크 | 009 |
| `notification_type` | assignment, comment_mention, status_change, due_date | 알림 유형 | 011 |

---

## 7. 알려진 불일치

### task_dependencies.project_id 컬럼 누락

| 항목 | 상태 |
|------|------|
| SQL 정의 (`002_pm.sql`) | `project_id UUID NOT NULL REFERENCES projects(id)` — 정의됨 |
| 실제 배포 DB | `project_id` 컬럼 **없음** |
| RLS 영향 | `project_id` 참조하는 4개 정책이 적용되지 않음 |

**해결 SQL** (Supabase SQL Editor에서 실행):

```sql
ALTER TABLE public.task_dependencies
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

UPDATE public.task_dependencies td
SET project_id = pi.project_id
FROM public.project_items pi
WHERE td.predecessor_id = pi.id;

ALTER TABLE public.task_dependencies
  ALTER COLUMN project_id SET NOT NULL;
```

---

## 8. Storage 버킷

| 버킷 | Public | 경로 패턴 | 용도 |
|------|--------|-----------|------|
| `avatars` | Yes | `{tenant_id}/{user_id}.{ext}` | 사용자 아바타 (upsert) |
| `documents` | No | `{tenant_id}/{project_id}/{timestamp}_{filename}` | 프로젝트 문서 |

### avatars 버킷 RLS

| 정책 | 동작 | 조건 |
|------|------|------|
| `avatars_public_read` | SELECT | 모든 사용자 (public bucket) |
| `avatars_tenant_upload` | INSERT | 같은 tenant 사용자 (folder = tenant_id 체크) |
| `avatars_tenant_update` | UPDATE | 같은 tenant 사용자 |
| `avatars_tenant_delete` | DELETE | 같은 tenant 사용자 |

Storage RLS는 `storage.foldername(name)[1]`으로 첫 번째 폴더명을 추출하여 사용자의 `tenant_id`와 비교한다:

```sql
(storage.foldername(name))[1] = (
  SELECT tenant_id::text FROM public.profiles
  WHERE user_id = auth.uid()
)
```

---

## 9. 참조

- **상세 스키마 문서**: [`supabase/DATABASE.md`](../supabase/DATABASE.md) — 테이블 관계도, 접근 규칙 매트릭스, 헬퍼 함수 목록
- **보안 모델**: [`docs/SECURITY-MODEL.md`](./SECURITY-MODEL.md) — 인증 흐름, RLS 정책 매트릭스, 역할 체계
- **아키텍처 개요**: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — 시스템 전체 구조
