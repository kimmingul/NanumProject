# NanumProject Database Schema

Supabase (PostgreSQL) 기반 멀티테넌트 프로젝트 관리 서비스.

## Migration 파일

| 파일 | 내용 |
|------|------|
| `001_auth.sql` | Auth 모듈: 테이블 + RLS + 트리거 + 함수 |
| `002_pm.sql` | PM 모듈: Enum + 테이블 + RLS + 트리거 |
| `003_seed.sql` | 초기 데이터 (기본 Tenant) |
| `004_add_task_status.sql` | task_status enum + project_items 컬럼 추가 |
| `005_avatars_bucket.sql` | avatars Storage 버킷 (public) + RLS 정책 |
| `006_update_roles.sql` | Role 체계 변경: admin/manager/member/viewer |
| `007_create_tenant_user.sql` | handle_new_user 수정 + create_tenant_user RPC |
| `008_fix_missing_functions.sql` | deactivate_user, reactivate_user, revoke_user_sessions 함수 생성 |
| `009_item_links.sql` | item_links 테이블, link_type enum, hierarchy trigger, comment count RPC |

> 실행 순서: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009

---

## 테이블 구조

### Auth 모듈 (5개)

```
tenants            멀티테넌트 조직 정보
profiles           사용자 프로필 (auth.users 확장)
applications       OAuth2/OIDC 앱
audit_logs         감사 로그 (immutable)
sessions           활성 세션 관리
```

### PM 모듈 (12개)

```
projects           프로젝트 메타데이터
project_members    프로젝트-사용자 매핑 (권한 관리)
project_items      ★ 통합 아이템 (그룹/태스크/마일스톤)
task_assignees     아이템-담당자 할당
task_dependencies  아이템 간 의존성 (Gantt 화살표)
item_links         아이템 간 의미적 링크 (blocks/related_to/duplicates)
comments           코멘트 (다형성: project/item 대상)
documents          문서 메타데이터
document_versions  문서 버전 히스토리
time_entries       시간 추적
checklist_items    체크리스트
activity_log       활동 로그 (immutable)
```

---

## 핵심 설계: project_items

DevExtreme Gantt에 최적화된 **단일 계층 테이블**.

```sql
project_items
├── item_type: 'group' | 'task' | 'milestone'
├── parent_id: 자기참조 FK (트리 구조)
└── project_id: 프로젝트 소속
```

### DevExtreme Gantt 매핑

| DB 컬럼 | Gantt 속성 | 설명 |
|---------|-----------|------|
| `id` | `id` | 고유 키 |
| `parent_id` | `parentId` | 부모 아이템 (NULL=최상위) |
| `name` | `title` | 아이템 이름 |
| `start_date` | `start` | 시작일 |
| `end_date` | `end` | 종료일 |
| `percent_complete` | `progress` | 진행률 (0-100) |
| `task_status` | - | 태스크 상태 (todo/in_progress/review/done) |
| `color` | `color` | 바 색상 |

---

## 테이블 관계도

```
tenants ─────────────────────────────────────────────┐
   │                                                  │
   ├── profiles ← auth.users                          │
   ├── applications                                   │
   ├── audit_logs                                     │
   └── sessions                                       │
                                                      │
projects ←──── tenant_id ────────────────────────────┘
   │
   ├── project_members ──→ auth.users
   │
   ├── project_items (self-ref: parent_id)
   │       │
   │       ├── task_assignees ──→ auth.users
   │       ├── task_dependencies (predecessor_id, successor_id)
   │       ├── item_links (source_id, target_id, link_type)
   │       ├── time_entries ──→ auth.users
   │       └── checklist_items
   │
   ├── comments (target_type: 'project' | 'item')
   │
   └── documents
           └── document_versions
```

---

## 공통 필드 규칙

### is_active (소프트 삭제)

대부분의 테이블에 `is_active BOOLEAN DEFAULT true` 필드 존재.

- `true`: 정상 데이터 (기본값)
- `false`: 소프트 삭제됨 → UI에서 표시하지 않음

> `is_active`는 레코드의 **존재 여부**를 나타냄. 프로젝트의 **상태**(active/complete/archived)는 `status` 필드로 관리.

---

## Enum 타입

| Enum | 값 | 용도 |
|------|---|------|
| `project_status` | active, on_hold, complete, archived | 프로젝트 상태 |
| `member_permission` | admin, edit, own_progress, view | 권한 계층 |
| `member_status` | pending, accepted, declined | 초대 상태 |
| `item_type` | group, task, milestone | 아이템 구분 |
| `task_status` | todo, in_progress, review, done | 태스크 상태 |
| `dependency_type` | fs, ss, ff, sf | Gantt 의존성 |
| `comment_target` | project, item | 다형성 대상 |
| `time_entry_type` | punched, manual | 시간 기록 방식 |
| `view_type` | gantt, board, list, calendar | 기본 뷰 |
| `link_type` | blocks, related_to, duplicates | 아이템 의미적 링크 |

---

## RLS 보안 체계

모든 테이블에 Row Level Security 적용. 멀티테넌트 격리 + 프로젝트 기반 접근 제어.

### 권한 계층

```
테넌트 역할 (profiles.role)
  admin > manager > member > viewer

테넌트 admin (profiles.role = 'admin')
  └── 모든 프로젝트에 대해 전체 접근 (project_members 등록 불필요)

프로젝트 권한 (project_members.permission)
  admin > edit > own_progress > view
```

### 접근 규칙

| 대상 | SELECT | INSERT/UPDATE/DELETE |
|------|--------|---------------------|
| projects | 멤버 **또는 테넌트 admin** | 프로젝트 admin 또는 테넌트 admin |
| project_members | 멤버 **또는 테넌트 admin** | 프로젝트 admin 또는 테넌트 admin |
| project_items | 멤버 **또는 테넌트 admin** | edit 이상 또는 테넌트 admin |
| task_assignees | 멤버 **또는 테넌트 admin** | edit 이상 또는 테넌트 admin |
| task_dependencies | 멤버 | edit 이상 |
| item_links | 멤버 또는 admin | edit 이상 또는 admin |
| comments | 멤버 | 작성자 (삭제: 작성자 또는 admin) |
| documents | 멤버 | 업로더 또는 admin |
| document_versions | 멤버 (documents JOIN) | 멤버 |
| time_entries | 멤버 | 본인만 |
| checklist_items | 멤버 (project_items JOIN) | 멤버 |
| activity_log | 멤버 또는 admin | 시스템만 (immutable) |

> **테넌트 admin**: `profiles.role = 'admin'`인 사용자는 project_members에 등록되지 않아도 테넌트 내 모든 프로젝트 데이터를 조회/수정할 수 있음.

### 헬퍼 함수

```sql
get_current_tenant_id()                    -- 현재 사용자의 tenant_id
is_current_user_admin()                    -- admin 역할 확인
has_role(TEXT)                             -- 특정 역할 확인
is_project_member(UUID)                    -- 프로젝트 멤버 확인
has_project_permission(UUID, permission)   -- 프로젝트 권한 확인
```

---

## 트리거

### updated_at 자동 갱신
projects, project_members, project_items, task_assignees, comments, documents, time_entries, checklist_items

### 감사 로그 자동 생성
tenants, applications, projects, project_members, project_items

### Hierarchy 검증
- `validate_milestone_hierarchy` → milestone에 자식 추가 방지, 자식 있는 item → milestone 변환 방지

### Auth 전용
- `on_auth_user_created` → 프로필 자동 생성
- `on_auth_user_login` → last_login_at 갱신
- `cleanup_sessions_on_insert` → 만료 세션 정리
- `validate_profile_email_trigger` → 이메일 동기화 검증
- `generate_application_credentials` → client_id/secret 자동 생성

---

## 비즈니스 함수 (Auth)

| 함수 | 설명 | 권한 |
|------|------|------|
| `get_user_profile(UUID)` | 프로필 + 테넌트 정보 | authenticated |
| `get_tenant_stats(UUID)` | 테넌트 통계 | authenticated |
| `search_users(TEXT, INT, INT)` | 사용자 검색 | authenticated |
| `get_audit_logs(...)` | 감사 로그 조회 | admin |
| `revoke_user_sessions(UUID)` | 세션 전체 해제 | 본인 또는 admin |
| `update_user_role(UUID, TEXT)` | 역할 변경 | admin |
| `deactivate_user(UUID)` | 계정 비활성화 | admin |
| `reactivate_user(UUID)` | 계정 재활성화 | admin |
| `get_active_sessions_count(UUID)` | 활성 세션 수 | authenticated |
| `rotate_application_secret(UUID)` | 앱 시크릿 갱신 | admin/developer |
| `create_tenant_user(TEXT, TEXT, TEXT)` | 테넌트 내 사용자 생성 (auth.users + identities + profiles) | admin |
| `get_item_comment_counts(UUID)` | 프로젝트 전체 item별 댓글 수 배치 조회 | authenticated |

---

## Storage 버킷

| 버킷 | Public | 경로 패턴 | 용도 |
|------|--------|-----------|------|
| `documents` | No | `{tenant_id}/{project_id}/{timestamp}_{filename}` | 프로젝트 문서 |
| `avatars` | Yes | `{tenant_id}/{user_id}.{ext}` | 사용자 아바타 (upsert) |

### avatars RLS
- **읽기**: 공개 (public bucket)
- **업로드/수정/삭제**: 같은 tenant 사용자만 (folder = tenant_id 체크)
