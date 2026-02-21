# 개발 진행 현황

## 완료된 작업

### Phase 1: 프로젝트 인프라

- TypeScript strict mode 설정 (path alias `@/`)
- Vite 7 빌드 환경
- ESLint + typescript-eslint 린팅
- 환경 변수 설정 (Supabase URL/Key, DevExtreme Key)

### Phase 2: Auth 모듈 DB

- **테이블 5개**: tenants, profiles, applications, audit_logs, sessions
- **RLS**: 테넌트 격리, RBAC (admin/manager/member/viewer)
- **트리거**: updated_at 자동 갱신, 프로필 자동 생성, 세션 정리
- **함수 10+개**: get_user_profile, search_users, update_user_role, get_tenant_stats 등
- **시드 데이터**: 기본 테넌트

### Phase 3: Auth UI

- **로그인** (`LoginPage.tsx`): DevExtreme TextBox, 유효성 검증, Remember me
- **회원가입** (`SignUpPage.tsx`): 이메일 인증 플로우, 비밀번호 확인
- **비밀번호 재설정** (`ResetPasswordPage.tsx`): 이메일 기반 복구
- **대시보드** (`DashboardPage.tsx`): 통계 카드 (프로젝트 수, 태스크 수, 완료율, 멤버 수)
- **사용자 관리** (`UsersPage.tsx`): DataGrid, 역할 배지, 상태 표시
- **인증 훅** (`useAuth.ts`): signIn, signUp, signOut, resetPassword, updatePassword
- **인증 스토어** (`auth-store.ts`): Zustand persistent store
- **Protected Route**: 인증 가드 + 리다이렉트

### Phase 4: PM 모듈 DB

- **Enum 8개**: project_status, member_permission, member_status, item_type, dependency_type, comment_target, time_entry_type, view_type
- **테이블 11개**: projects, project_members, project_items, task_assignees, task_dependencies, comments, documents, document_versions, time_entries, checklist_items, activity_log
- **핵심 설계**: `project_items` 통합 테이블 (group/task/milestone + parent_id 트리)
- **RLS**: 프로젝트 멤버 기반 접근 제어 + **테넌트 admin bypass** (admin은 모든 프로젝트 접근)
- **헬퍼 함수**: is_project_member, has_project_permission, get_current_tenant_id, is_current_user_admin
- **마이그레이션 파일**: `001_auth.sql`, `002_pm.sql`, `COMPLETE_MIGRATION.sql`, `COMPLETE_PM_MIGRATION.sql`
- **DB 문서**: `supabase/DATABASE.md`

### Phase 5: TeamGantt 데이터 마이그레이션

별도 npm 패키지 (`migration/`)로 구현.

- **추출**: TeamGantt API (Cognito 인증) → JSON 파일 저장
  - 회사 정보, 프로젝트, 태스크, 코멘트, 문서, 시간 기록, 보드
- **임포트**: JSON → Supabase (10단계 파이프라인)
  1. Users (auth.users + profiles)
  2. Projects
  3. Project Members
  4. Groups (project_items: item_type=group)
  5. Tasks (project_items: item_type=task)
  6. Task Assignees
  7. Task Dependencies
  8. Comments
  9. Documents + Versions
  10. Time Entries
- **CLI 옵션**: `--clean` (전체 삭제 후 재임포트), `--resume`, `--only=users|projects|tasks|...`
- **임포트 결과**: 368 프로젝트, 15,272 태스크, 43,873 코멘트, 4,086 담당자, 550 문서, 89 의존성, 7 시간 기록

### Phase 6: PM UI

- **프로젝트 목록** (`ProjectListPage.tsx`):
  - DataGrid (이름, 상태, 시작일, 종료일)
  - 프로젝트 생성 팝업
  - 상태 배지 (active/on_hold/complete/archived)
  - 즐겨찾기 표시
- **프로젝트 상세** (`ProjectDetailPage.tsx`):
  - 7개 탭: Gantt / Tasks / Comments / Files / Time / Activity / Settings
  - 프로젝트 이름, 상태, 기간 표시
- **Gantt 차트** (`features/gantt/GanttView.tsx`):
  - DevExtreme Gantt 컴포넌트
  - project_items → Gantt 포맷 변환
  - 태스크 CRUD (추가/수정/삭제)
  - 의존성 관리 (FS/SS/FF/SF)
  - 리소스 할당/해제
  - 툴바 (Undo/Redo, Expand/Collapse, Zoom, FullScreen)
- **태스크 목록** (`features/tasks/TasksView.tsx`):
  - TreeList 컴포넌트 (계층 표시)
  - 아이템 타입 아이콘 (folder/task/milestone)
  - 진행률 바
  - 담당자 이름 표시
  - 검색/필터
- **파일 관리** (`features/files/FilesView.tsx`):
  - DataGrid (파일명, 크기, 버전, 업로더, 날짜)
  - Supabase Storage 파일 업로드/다운로드
  - 버전 히스토리 팝업
  - 파일 타입별 아이콘
- **활동 로그** (`features/activity/ActivityView.tsx`):
  - 날짜별 그룹핑 타임라인 뷰
  - 필터: 액션 타입, 날짜 범위
  - 아바타, 액션 설명, 타임스탬프 표시
- **시간 추적** (`features/time-tracking/TimeTrackingView.tsx`):
  - DataGrid (태스크명, 사용자, 유형, 시작/종료, 시간, 메모)
  - "Log Time" 팝업 (태스크 선택, 날짜/시간, 분, 메모)
  - Summary 총 시간 합계, 사용자/날짜 필터
- **태스크 상세 패널** (`features/tasks/TaskDetailPanel.tsx`):
  - 태스크 정보 (타입, 날짜, 진행률)
  - 체크리스트 CRUD (추가, 토글, 삭제)
  - 진행 바 ("X of Y completed")
  - Tasks TreeList 행 클릭 / Gantt 태스크 클릭 시 RightPanel에 열림
- **PM 훅**:
  - `useProjects.ts`: 프로젝트 목록 조회 (상태 필터, 이름 검색)
  - `useProject.ts`: 단일 프로젝트 조회
  - `useProjectCrud.ts`: 프로젝트 생성/수정/삭제
  - `useProjectItems.ts`: 태스크, 의존성, 리소스 조회
  - `useProjectMembers.ts`: 멤버 관리
  - `useComments.ts`: 코멘트 CRUD
  - `useDocuments.ts`: 문서 CRUD, 버전 관리, 파일 업로드/다운로드
  - `useActivityLog.ts`: 활동 로그 조회 (프로젝트별, 필터링)
  - `useTimeEntries.ts`: 시간 기록 CRUD
  - `useChecklist.ts`: 체크리스트 CRUD + 토글
- **PM 스토어** (`pm-store.ts`): Zustand in-memory (projects[], activeProject)
- **PM 타입** (`types/pm.ts`): 11개 엔티티 인터페이스 + 8개 enum + UI 합성 타입

### Phase 7: IDE-Style 3-Panel Layout

- **IDELayout** (`components/IDELayout.tsx`): 3-Panel CSS Grid 쉘 (left/center/right)
- **IDEHeader** (`components/IDEHeader.tsx`): 40px 슬림 헤더 (햄버거, 앱 타이틀, 글로벌 내비 아이콘, 검색 placeholder, 유저 영역)
- **LeftPanel** (`components/LeftPanel.tsx`): 경로 기반 컨텍스트 분기 (DashboardNav / ProjectTree)
- **RightPanel** (`components/RightPanel.tsx`): 태스크 상세 인라인 패널 (toggle)
- **TaskDetailPanel** (`features/tasks/TaskDetailPanel.tsx`): TaskDetailPopup에서 Popup 래퍼 제거한 인라인 버전
- **ResizeHandle** (`components/ResizeHandle.tsx`): 4px 드래그 핸들 (좌/우 패널 리사이즈)
- **pm-store 확장**: leftPanelOpen/rightPanelOpen, 패널 너비, selectedTaskId 상태 관리
- **라우트 통합**: 모든 인증 라우트를 `IDELayout + Outlet` 중첩 구조로 변경
- **기존 페이지 적응**: PMLayout 래퍼 제거, 프로젝트 탭을 아이콘 버튼으로 교체
- **Feature View 수정**: GanttView/TasksView/BoardView/CalendarView에서 TaskDetailPopup 제거, usePMStore.setSelectedTaskId 사용
- **CSS 정리**: Vite 보일러플레이트 제거, dark mode → light mode 기본값, max-width 제약 제거

### Phase 8: DevExtreme Button 통일 + 코드 정리

- **네이티브 `<button>` → DevExtreme `<Button>` 전면 교체** (8개 TSX 파일):
  - `IDEHeader.tsx`: 햄버거, 네비, 로그아웃 버튼
  - `LeftPanel.tsx`: 대시보드 네비 버튼
  - `RightPanel.tsx`: 닫기 버튼
  - `ProjectDetailPage.tsx`: 뒤로가기 + 9개 워크스페이스 탭 버튼
  - `DashboardPage.tsx`: 3개 액션 버튼
  - `UsersPage.tsx`: 편집/삭제 아이콘 버튼
  - `CommentsView.tsx`: 삭제 버튼
  - `TaskDetailPanel.tsx`: 체크리스트 삭제 버튼
  - `FilesView.tsx`: 버전 링크 버튼
- **CSS 셀렉터 업데이트**: `button.class` → `.dx-button.class` (7개 CSS 파일)
- **데드 코드 삭제**: `PMLayout.tsx/css` (미사용), `TaskDetailPopup.tsx` (TaskDetailPanel로 대체됨)
- **DevExtreme React `<Button>` 컨벤션**: `cssClass` 아닌 `className` 사용

### Phase 9: TypeScript 빌드 에러 수정 + Vercel 배포

- **Supabase 타입 수정** (`types/supabase.ts`):
  - 14개 테이블 정의에 `Relationships: []` 추가 (`@supabase/postgrest-js` v2 필수)
  - 이 누락으로 `.insert()`, `.update()`, `.select()` 파라미터가 `never`로 추론 → 41개 빌드 에러 발생
- **`exactOptionalPropertyTypes` 대응** (8개 에러):
  - `value ?? null` 패턴 (DevExtreme DateBox props)
  - `{ ...(val ? { key: val } : {}) }` 스프레드 패턴 (함수 인자)
- **`.select()` 반환 타입 캐스팅** (12개 에러): `data as Type[]` 캐스팅
- **DevExtreme 타입 import 수정** (3개 에러): `DragEndEvent`, `AppointmentClickEvent`, `customizeText` 시그니처
- **`vercel.json`** SPA 리라이트 규칙 추가
- **DevExtreme 라이센스 수정** (`index.html`):
  - **문제**: Vite 번들러가 `devextreme/core/config` import를 비동기 `.then()` 패턴으로 변환 → 위젯 초기화 이후에 `config({licenseKey})` 실행됨
  - **해결**: `index.html`에 인라인 `<script>`로 `window.DevExpress.config = { licenseKey: '%VITE_DEVEXTREME_KEY%' }` 설정 (모듈 로드 전 동기 실행)
  - DevExtreme의 `m_config.js`가 초기화 시 `window.DevExpress.config`을 자동 감지
- **Vercel 프로덕션 배포**: https://nanum-project-nu.vercel.app/
  - Production branch: `master`
  - 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEVEXTREME_KEY`

### Phase 10: task_status 컬럼 추가 + UsersPage 실데이터 연동

- **DB 마이그레이션** (`004_add_task_status.sql`):
  - `task_status` enum 타입 생성 (`todo`, `in_progress`, `review`, `done`)
  - `project_items` 테이블에 `task_status` 컬럼 추가 (기본값 `'todo'`)
  - 기존 `custom_fields.board_status` JSON 데이터를 새 컬럼으로 마이그레이션
  - `custom_fields`에서 `board_status` 키 제거
  - `(project_id, task_status)` 인덱스 추가
- **BoardView 개선**: `custom_fields.board_status` JSON → `task_status` 컬럼 직접 사용 (데이터 무결성 확보, update 쿼리 단순화)
- **TasksView 개선**: Status 컬럼 추가 (컬러 배지: To Do / In Progress / Review / Done)
- **TaskDetailPanel 개선**: 태스크 상태 배지 표시
- **TypeScript 타입 업데이트**: `TaskStatus` 타입 추가 (`pm.ts`, `supabase.ts`)
- **DB 문서 업데이트**: `DATABASE.md`에 `task_status` enum 및 컬럼 문서화
- **UsersPage 실데이터 연동**: 하드코딩된 `sampleUsers` 제거 → Supabase `profiles` 테이블에서 `tenant_id` 기반 실시간 조회

### Phase 11: User Management 기능 구현

- **사용자 편집 팝업** (`UsersPage.tsx`):
  - Edit 버튼 클릭 → DevExtreme Popup 열림
  - Full Name 수정 (TextBox)
  - Role 변경: Admin / Manager / Member / Viewer (SelectBox, admin만 가능)
  - Status 변경: Active / Inactive (SelectBox, admin만, 자기 자신은 비활성화 불가)
  - 아바타 업로드 (2MB/image 제한) + 제거 기능
  - 비밀번호: 본인=직접 변경, 타인=리셋 메일 발송
  - 저장 후 DataGrid 재조회 + 본인이면 auth-store 즉시 동기화
- **Role 체계 변경** (`006_update_roles.sql`):
  - 기존: `admin` / `user` / `developer`
  - 변경: `admin` / `manager` / `member` / `viewer`
  - CHECK 제약조건 + `update_user_role` 함수 + `get_tenant_stats` 함수 업데이트
  - 기존 `user`/`developer` 데이터 → `member`로 자동 마이그레이션
- **아바타 Storage** (`005_avatars_bucket.sql`):
  - `avatars` public 버킷 생성
  - RLS: 같은 tenant 사용자만 업로드/삭제, 공개 읽기
  - 경로: `{tenant_id}/{user_id}.{ext}` (upsert)
- **IDEHeader 아바타**: `avatar_url`이 있으면 `<img>` 표시, 없으면 이니셜 fallback
- **useUserManagement 훅** (NEW):
  - `updateProfile(userId, { full_name, role })` — profiles UPDATE + `update_user_role` RPC
  - `uploadAvatar(userId, file)` → Storage upload + `avatar_url` 업데이트 → public URL 반환
  - `removeAvatar(userId)` → `avatar_url` null + Storage 파일 삭제
  - `deactivateUser(userId)` / `reactivateUser(userId)` → RPC 호출
  - `sendPasswordReset(email)` → `supabase.auth.resetPasswordForEmail()`
- **DataGrid 개선**:
  - 아바타 컬럼 추가 (32px 원형 이미지 / 이니셜 fallback)
  - Delete 버튼 → Deactivate/Reactivate 토글 (자기 자신은 disabled)
  - Role 배지 색상: Admin(빨강), Manager(노랑), Member(파랑), Viewer(보라)

### Phase 12: Add User 기능

- **DB 마이그레이션** (`007_create_tenant_user.sql`):
  - `handle_new_user` 트리거 수정: `'user'` → `'member'` (006 role CHECK 호환)
  - `create_tenant_user(p_email, p_full_name, p_role)` RPC 함수 (SECURITY DEFINER)
  - `auth.users` + `auth.identities` INSERT → `handle_new_user` 트리거가 profiles 자동 생성 → tenant/role 업데이트
  - Admin 전용, 중복 이메일 체크, 유효 role 검증
- **useUserManagement 확장**:
  - `rpcWithReturn<T>()` 헬퍼 추가 (데이터 반환 RPC 호출용)
  - `createUser(email, fullName, role)` — RPC 호출 후 비밀번호 설정 이메일 자동 발송
- **UsersPage Add User 팝업**:
  - Email (필수), Full Name, Role (SelectBox) 입력 폼
  - 안내 메시지: "생성 후 비밀번호 설정 이메일이 발송됩니다"
  - 생성 성공 → DataGrid 재조회 + Popup 닫기
  - Admin만 Add User 버튼 표시
  - 에러 처리 (중복 이메일 등)

### Phase 13: Status 변경 버그 수정

- **원인 1**: `useUserManagement.ts`의 RPC 호출에서 파라미터 이름 불일치
  - TypeScript: `target_user_id`, `new_role` → SQL: `p_user_id`, `p_new_role`
  - `deactivate_user`, `reactivate_user`, `update_user_role` 3개 함수 모두 수정
- **원인 2**: `deactivate_user`, `reactivate_user`, `revoke_user_sessions` 함수가 DB에 미생성
  - `001_auth.sql`에 정의되어 있었으나 실제 DB에 실행되지 않았음
  - `008_fix_missing_functions.sql` 마이그레이션으로 해결

### Phase 14: URL 라우팅 구조 개선

- **문제**: Users, Audit, Settings 등 독립 기능이 `/dashboard/*` 하위에 묶여 있어 비체계적
- **변경**: 플랫 구조로 전환
  | 이전 URL | 새 URL |
  |----------|--------|
  | `/dashboard/users` | `/users` |
  | `/dashboard/audit` | `/audit` |
  | `/dashboard/settings` | `/settings` |
  | `/dashboard/overview` | 삭제 (`/dashboard`와 중복) |
  | `/dashboard/applications` | 삭제 (미사용 placeholder) |
- **레거시 리다이렉트**: `<Navigate replace />` 로 이전 URL 접속 시 새 URL로 자동 이동 (404 방지)
- **LeftPanel 로직 변경**: `pathname.startsWith('/dashboard')` → `isProjectDetail` 정규식 판별
  - 프로젝트 상세 페이지(`/projects/:id`)일 때만 ProjectTree 표시, 그 외 MainNav 표시
- **IDEHeader**: `isActive` 로직 단순화 (경로 exact match)
- **수정 파일**: `routes/index.tsx`, `LeftPanel.tsx`, `IDEHeader.tsx`, `DashboardPage.tsx`

### Phase 15: Claude Code 설정 최적화

- **`.claude/CLAUDE.md`** 생성: 프로젝트 가이드 (기술 스택, 구조, 코드 컨벤션, Supabase 주의사항)
- **`.claude/rules/`** 생성 (3개):
  - `supabase.md` — SQL 마이그레이션, RPC 파라미터 컨벤션, RLS, auth 데드락 방지
  - `devextreme.md` — Button/DataGrid/Popup 패턴, CSS override, MCP 활용
  - `react-hooks.md` — 훅 파일 구조, Supabase fetching/RPC 패턴
- **`.claude/skills/`** 생성 (8개): browser-test, deploy, db-migrate, ui-design, architecture, react, review, debug
- **`.claude/settings.local.json`** 정리: Windows/PowerShell 중복 제거, MCP 도구 자동 허용 정리

### Phase 16: Settings 페이지 + 프로필 드롭다운

- **Settings 페이지** (`SettingsPage.tsx`):
  - 2칼럼 레이아웃: 왼쪽 sidebar nav + 오른쪽 content 영역 (max 700px)
  - `useState<string>`으로 active section 관리 (URL sub-routing 불필요)
  - Admin: 4개 섹션 모두 표시, non-admin: My Profile만 표시
- **ProfileSection** (`settings/ProfileSection.tsx`):
  - 아바타 업로드/제거 (기존 `useUserManagement` 훅 재사용)
  - Email (읽기전용), Full Name 수정
  - 비밀번호 변경 (New + Confirm, 기존 `useAuth().updatePassword` 재사용)
- **OrganizationSection** (`settings/OrganizationSection.tsx`, admin only):
  - 테넌트 이름 수정
  - 도메인 수정 (regex 검증)
- **SecuritySection** (`settings/SecuritySection.tsx`, admin only):
  - 비밀번호 규칙: 최소 길이(6~32), 대/소문자, 숫자, 특수문자 필수 여부 (CheckBox)
  - 세션 타임아웃 (분, NumberBox)
- **AppearanceSection** (`settings/AppearanceSection.tsx`, admin only):
  - Primary / Secondary Color (DevExtreme ColorBox)
  - 그라데이션 미리보기
- **useTenantSettings 훅** (`hooks/useTenantSettings.ts`):
  - `tenants` 테이블 single row 조회/수정
  - `updateTenant({ name, domain })` — 기본 정보 수정
  - `updateTenantSettings(partial)` — `settings` JSONB deep merge 후 UPDATE
  - SQL 마이그레이션 불필요 (기존 RLS 정책 활용)
- **프로필 드롭다운 메뉴** (`IDEHeader.tsx`):
  - 우상단 프로필 영역 클릭 → 드롭다운 (email, role, My Profile, Settings, Sign Out)
  - 기존 독립 Sign Out 버튼을 드롭다운 안으로 통합
  - 외부 클릭 시 자동 닫힘
- **라우트 변경**: `/settings` → `SettingsPage` (기존 `DashboardPage` placeholder 교체)

### Phase 17: 프로젝트 브랜딩 통일

- "NanumAuth" → "Nanum Project"로 전면 변경 (5개 파일)
  - `config/index.ts`, `LoginPage.tsx`, `SignUpPage.tsx`, `MainLayout.tsx`, `HomePage.tsx`
- `HomePage.tsx` subtitle/description을 프로젝트 관리 맥락으로 변경
- `auth-store.ts`의 localStorage 키 (`nanumauth-auth`)는 기존 세션 호환성 유지를 위해 유지

### Phase 18: Relations Panel + Item Links

- **DB 마이그레이션** (`009_item_links.sql`):
  - `link_type` enum 생성 (`blocks`, `related_to`, `duplicates`)
  - `item_links` 테이블 (source_id/target_id → project_items FK, UNIQUE 제약, self-link 방지)
  - RLS: task_dependencies와 동일 패턴 (프로젝트 멤버 read, edit 이상 write)
  - `validate_milestone_hierarchy` 트리거: milestone에 자식 추가 방지, 자식 있는 item → milestone 변환 방지
  - `get_item_comment_counts(p_project_id)` RPC: 프로젝트 전체 item별 댓글 수 배치 조회
- **TypeScript 타입** (`types/pm.ts`):
  - `LinkType`, `ItemLink`, `ItemLinkWithNames` 타입 추가
- **새 훅**:
  - `useItemLinks.ts`: item_links CRUD (양방향 조회, 이름 enrichment)
  - `useItemRelations.ts`: 관계 집계 (parent, children, predecessors, successors, semantic links)
- **useProjectItems 확장**: `commentCounts` Map 반환 (`get_item_comment_counts` RPC 호출)
- **RightPanel 탭 기반 리팩토링** (`TaskDetailPanel.tsx`):
  - DevExtreme `TabPanel` 4탭 구조: Info / Relations / Comments / Checklist
  - `InfoTab.tsx`: 타입 뱃지, 상태, 날짜, 진행률, 설명
  - `RelationsTab.tsx`: parent/children/predecessors/successors/links 표시, 클릭 내비게이션, Add Link UI (SelectBox × 2 + Button)
  - `CommentsTab.tsx`: CommentsView 래퍼 (targetType='item')
  - `ChecklistTab.tsx`: 기존 체크리스트 코드 추출
- **pm-store 확장**: `rightPanelTab` 상태 + `setRightPanelTab` 액션 (탭 선택 유지)
- **RightPanel 동적 헤더**: 선택된 item 이름 표시
- **Gantt 시각 강화** (`GanttView.tsx`):
  - Task Name 컬럼 `cellRender`: 타입 아이콘 (folder/detailslayout/event) + 댓글 뱃지
  - 컬럼 폭: 280px → 320px

### Phase 19: Tasks 독립 라우트 분리

- **목적**: 프로젝트 작업 뷰(Gantt/Board/Calendar 등)에 NavRail에서 즉시 접근 가능하도록 개선
- **NavRail 변경**: `Dashboard | Projects | Tasks | Users | Settings` (Audit 항목 NavRail에서 제거, 라우트는 유지)
- **새 페이지** (`TasksWorkspacePage.tsx`):
  - `/tasks` — empty state ("Select a project") 또는 lastProjectId로 자동 리다이렉트
  - `/tasks/:projectId` — 프로젝트 워크스페이스 (Gantt 기본)
  - `/tasks/:projectId/:tab` — 탭 전환 (Gantt/Tasks/Board/Calendar/Comments/Files/Time/Activity/Settings)
  - `localStorage`에 `nanum-last-project-id` 저장/복원
- **라우트 변경** (`routes/index.tsx`):
  - `/projects/:projectId(/:tab)` → `/tasks/:projectId(/:tab)` 리다이렉트 (`ProjectRedirect` 래퍼)
  - `ProjectDetailPage` import 제거 (더 이상 직접 사용하지 않음)
- **ContextSidebar 확장**: `/tasks` 경로에 사이드바 표시 (title: "TASKS", component: ProjectSidebarList)
- **ProjectSidebarList 변경**: 클릭 시 `/tasks/:projectId`로 이동 (기존 `/projects/:projectId`)
- **ProjectListPage 변경**: DataGrid `onRowClick` → `/tasks/:projectId`로 이동

### Phase 20: 마이그레이션 데이터 복구

- **종합 감사 (Audit)**: 원본 TeamGantt 데이터 vs Supabase DB 비교 분석
- **문제 발견**:
  - CRITICAL: 그룹 매핑 실패 (1,656/1,782 DB 존재, id-map에 0개) → 모든 task의 parent_id = null
  - CRITICAL: task_dependencies에 project_id 누락 → 89개 전체 insert 실패
  - MEDIUM: task의 updated_at/updated_by 미임포트 (165건)
  - INFO: checklist 데이터 (1,806건) 미추출 (TeamGantt API에서 빈 응답)
- **수정 스크립트** (`migration/src/repair-all.ts`):
  - Phase 1: 기존 그룹 1,656개 DB에서 발견 → id-map 재구축, 누락 126개 중 123개 삽입 (3개 빈 이름으로 skip)
  - Phase 2: 그룹 parent_id 123건 + 태스크 parent_id 15,268건 일괄 수정
  - Phase 3: dependency 89건 재삽입 (project_id 컬럼이 실제 DB에 존재하지 않아 제외)
  - Phase 4: updated_at 165건 수정
- **결과**: id-map에 group 1,779개 매핑 추가, 간트차트에서 그룹 트리 계층 정상 표시

### Phase 21: DevExtreme 커스텀 다크 테마

- **문제**: DevExtreme Fluent Blue Dark 테마의 neutral gray 색상(#292929, #616161 등)이 앱의 Tailwind Slate 배경과 섞여 갈색(brown-ish)으로 보이는 시각적 부조화
- **해결**: Python 스크립트(`scripts/patch-dark-theme.py`)로 stock dark CSS의 모든 neutral gray를 Tailwind Slate 계열로 일괄 교체
- **색상 교체**: 56개 매핑, 총 803건 교체 (hex + rgb + rgba)
- **보더 두께**: `border: 2px` → `1px` (58건)
- **폰트 경로**: `icons/` → `devextreme/dist/css/icons/` (Vite resolve용)
- **결과 파일**: `src/styles/dx.fluent.nanum-dark.css` (782KB, gzip: 101KB)
- **theme-store.ts**: dark CSS import를 커스텀 테마로 변경
- **문서**: `docs/CUSTOM-THEME.md` — 매핑 테이블, 스크립트 상세, 업그레이드 절차, 2층 테마 구조 설명

### Phase 22: Users 연락처 뷰 + Settings 사용자 관리 분리

- **Users 페이지 (`/users/:userId`)**: DataGrid 관리 화면 → ProfileCard 기반 연락처 디렉토리로 전환
  - 3장의 카드: Basic Info (아바타/이름/부서/직책/Bio), Contacts (전화/이메일), Address (국가/도시/주소)
  - 좌측 사이드바에서 사용자 선택 → 메인 영역에 프로필 표시 (Outlook 연락처 스타일)
  - 자기 자신은 Edit/Save 가능, 다른 사용자는 읽기 전용
  - NavRail `adminOnly` 제거 → 모든 사용자 접근 가능
- **Settings > User Management (`/settings/users`)**: 기존 UsersPage의 DataGrid + CRUD 코드를 이동
  - Admin 전용 (SettingsSidebarList의 `adminOnly: true`)
  - Add User, Edit User 팝업, 역할 변경, 비활성화/재활성화 기능
- **DB 마이그레이션** (`010_profile_extended_fields.sql`):
  - `profiles` 테이블에 9개 컬럼 추가: phone, department, position, address, city, state, country, zip_code, bio
  - `get_user_profile()` 함수 재생성 (새 컬럼 포함)
- **파일 변경**:
  - 신규: `settings/UsersSection.tsx`, `settings/UsersSection.css`
  - 재작성: `UsersPage.tsx`, `UsersPage.css`
  - 수정: `NavRail.tsx`, `UserSidebarList.tsx`, `ContextSidebar.css`, `routes/index.tsx`, `SettingsPage.tsx`, `SettingsSidebarList.tsx`, `settings/index.ts`

### Phase 23: My Profile 독립 + Settings 구조 개선 + Gantt 강화

- **My Profile 독립 페이지** (`/profile`):
  - Settings에서 분리 → 독립 라우트 `/profile`
  - 4개 ProfileCard: Basic Info (아바타/이름/부서/직책/Bio), Contacts (전화/이메일), Address (국가/도시/주/주소/우편번호), Change Password
  - Edit/Save/Cancel 토글, 아바타 업로드/제거
  - IDEHeader 프로필 드롭다운에서 "My Profile" → `/profile` 이동
- **Settings 구조 변경**:
  - "My Profile" 섹션 제거, admin 전용으로 변경
  - 사이드바 순서: Organization → User Management → Security → Appearance
  - 전체 섹션 `max-width: 100%` (기존 700px → 전체 폭)
  - IDEHeader에서 Settings 항목 admin만 표시
- **Users 페이지 읽기 전용화**: 모든 편집 UI 제거 (Edit/Save/Cancel 버튼, 폼 상태)
- **Settings > User Management 확장**: Edit 팝업에 9개 확장 필드 추가 (Department, Position, Phone, Bio, Country, City, State, Zip Code, Address)
- **Gantt 차트 강화**:
  - `taskListWidth` 400 → 700, End/% 컬럼 항상 표시
  - **Assigned 컬럼 추가**: 담당자 이니셜 배지 표시 (assignments + resources 데이터 조인)
- **파일 변경**:
  - 신규: `MyProfilePage.tsx`, `MyProfilePage.css`
  - 수정: `routes/index.tsx`, `IDEHeader.tsx`, `SettingsSidebarList.tsx`, `SettingsPage.tsx`, `SettingsPage.css`, `settings/index.ts`, `UsersPage.tsx`, `settings/UsersSection.tsx`, `GanttView.tsx`, `GanttView.css`

### Phase 24: Gantt 인터랙션 개선 — 커스텀 팝업 + RightPanel 제거

- **목적**: Gantt에서 싱글 클릭 → RightPanel 슬라이드, 더블 클릭 → DevExtreme 기본 팝업(제목/날짜/진행률만)이라는 두 개의 상세 뷰가 공존하여 UX 혼란 → 커스텀 팝업 전용 방식으로 통일
- **인터랙션 모델**:
  | 제스처 | 동작 |
  |--------|------|
  | 싱글 클릭 | 행 하이라이트 (selectedTaskId 설정, 패널/팝업 안 열림) |
  | 더블 클릭 | DevExtreme 기본 팝업 차단 → 커스텀 팝업 오픈 |
  | 우클릭 → Task Details... | 커스텀 팝업 오픈 (onCustomCommand) |
  | 간트 바 드래그 | 날짜/진행률 변경 (기존 유지) |
- **pm-store 디커플링**: `setSelectedTaskId`가 더 이상 `rightPanelOpen`을 자동 설정하지 않음
- **RightPanel 닫기 수정**: 닫기 버튼이 `setRightPanelOpen(false)` 호출 (기존: `setSelectedTaskId(null)`)
- **TaskDetailPopup 컴포넌트** (`src/features/tasks/TaskDetailPopup.tsx`):
  - DevExtreme `<Popup>` (720px, maxHeight 85vh, 드래그 가능)
  - 4탭 구조: Info (편집 폼) / Relations / Comments / Checklist
  - Info 탭: 읽기 모드 (기존 InfoTab) + Edit 버튼 → 편집 모드 (TextBox/DateBox/NumberBox/SelectBox/TextArea)
  - Save → Supabase update → Gantt refetch
- **GanttView 변경**:
  - `onTaskDblClick`: 기본 팝업 차단(`e.cancel=true`) + 커스텀 팝업 오픈
  - `onTaskEditDialogShowing`: 항상 차단(`e.cancel=true`)
  - `onCustomCommand`: "openTaskDetails" 커스텀 커맨드 → 팝업 오픈 (predefined "taskDetails" 대신 커스텀 이름 사용)
  - `<ContextMenu>`: addTask / taskDetails / deleteTask 항목
- **파일 변경**:
  - 신규: `TaskDetailPopup.tsx`
  - 수정: `pm-store.ts`, `RightPanel.tsx`, `GanttView.tsx`, `TaskDetailPopup.css`

### Phase 25: 다크 모드 완전 지원 — 하드코딩 색상 → CSS 변수

- **목적**: 136+ 하드코딩된 색상값을 CSS 변수로 전환하여 light/dark 테마 완벽 동작
- **theme-variables.css** — 35+ 신규 CSS 변수 추가 (light `:root` + dark `[data-theme="dark"]`):
  - Links: `--link-color`, `--link-hover-color`
  - Accent: `--accent-color`, `--accent-shadow`, `--accent-bg-subtle`
  - Semantic: `--star-color`, `--warning-icon`, `--progress-fill`, `--card-hover-shadow`
  - Item types: `--type-group-color`, `--type-task-color`, `--type-milestone-color`
  - Board columns: `--board-col-todo/progress/review/done`
  - Dashboard stat icons: `--stat-projects-bg/icon`, `--stat-tasks-bg/icon`, `--stat-completed-bg/icon`, `--stat-members-bg/icon`
  - Card icons: `--icon-contacts-bg/color`, `--icon-address-bg/color`
  - Roles: `--role-admin/manager/member/viewer-color`
  - Status dots: `--status-dot-active/on-hold/complete/archived`
  - Scheduler: `--scheduler-other-month-bg`
- **CSS 파일 14개 수정**: index.css, DashboardPage.css, ProjectListPage.css, ProjectDetailPage.css, SettingsPage.css, UsersPage.css, MyProfilePage.css, BoardView.css, CalendarView.css, GanttView.css, TasksView.css, TaskDetailPopup.css, ContextSidebar.css
- **TSX 파일 3개 수정**: DashboardPage.tsx (inline stat-icon → CSS class), ProjectSidebarList.tsx (statusDotColors → CSS class), UserSidebarList.tsx (roleBadgeColors → CSS class)
- **의도적 유지**: Auth 페이지 gradient, theme-preview 아이콘, Gantt avatar gradient

### Phase 26: Dashboard 재설계 — 종합 Command Center

- **목적**: 기존 단순 통계 카드 + Quick Actions → 종합 대시보드 (8개 섹션)
- **레이아웃** (4-Row Grid):
  - Row 0: Greeting bar ("Good morning, 김민걸" + 한국어 날짜)
  - Row 1: KPI 4-column grid (Overdue Tasks (danger highlight), In Progress, Due This Week, Completion Rate (mini progress bar))
  - Row 2: 2fr + 1fr (My Tasks | Overdue Items)
  - Row 3: 5fr + 4fr + 3fr (Project Status doughnut | Task Distribution bar | Upcoming Deadlines timeline)
  - Row 4: Full-width Recent Activity feed
- **신규 훅** (`hooks/useDashboardData.ts`):
  - 4개 병렬 쿼리 그룹 (KPI / Lists / Charts / Activity)
  - Progressive loading (섹션별 독립 loading state)
  - 프로젝트명 batch lookup, 담당자 프로필 enrichment
- **신규 컴포넌트** (8개, `features/dashboard/`):
  - `DashboardGreeting.tsx` — 시간대별 인사 + 한국어 날짜
  - `DashboardKPIRow.tsx` — 4 KPI 카드 (overdue 시 red border, "N assigned to me" subtext)
  - `DashboardMyTasks.tsx` — 내 태스크 목록 (status strip, project pill, relative due date)
  - `DashboardAtRisk.tsx` — 기한 초과 아이템 (red dot, "Nd" overdue)
  - `DashboardProjectStatus.tsx` — DevExtreme PieChart (doughnut, center total overlay)
  - `DashboardTaskDistribution.tsx` — DevExtreme Chart (horizontal bar, status color-mapped)
  - `DashboardUpcoming.tsx` — 날짜 그룹 타임라인 (14일, task/milestone dot)
  - `DashboardActivity.tsx` — 활동 피드 (avatar, action verb, relative time)
- **DashboardPage.tsx** — Layout shell (8 sub-components + useDashboardData hook)
- **DashboardPage.css** — 전체 스타일 (cards, KPI, lists, charts, skeleton, responsive breakpoints)
- **반응형**: 1100px (3col→2col), 860px (2col→1col, KPI 2×2), 540px (KPI 1col)

### Phase 27: Cmd+K 글로벌 검색

- **목적**: IDEHeader 중앙 Search 버튼 활성화 → VS Code / Linear 스타일 Cmd+K spotlight 검색
- **검색 대상**: 프로젝트(`projects`), 태스크(`project_items`), 사용자(`profiles`) — 각 카테고리 최대 5개
- **검색 필드**: projects: name/description, items: name, users: full_name/email
- **신규 파일**:
  - `src/hooks/useGlobalSearch.ts` — 검색 훅 (300ms 디바운스, 3개 병렬 Supabase 쿼리, stale response 방지, tenant_id guard)
  - `src/components/GlobalSearch.tsx` — 오버레이 컴포넌트 (`createPortal`, 키보드 내비게이션, 결과 클릭/Enter → 라우트 이동)
  - `src/components/GlobalSearch.css` — 스타일 (backdrop, dialog, input, result groups, footer hints, 애니메이션)
- **수정 파일**:
  - `src/components/IDEHeader.tsx` — `disabled` 제거, `Cmd+K`/`Ctrl+K` 전역 단축키, GlobalSearch 연결
  - `src/components/IDELayout.css` — 검색 트리거 폭 280px → 560px, cursor: pointer, hover 효과
  - `src/styles/theme-variables.css` — 12개 `--search-*` CSS 변수 추가 (light + dark)
- **키보드 인터랙션**: `Cmd+K` 열기, `↑↓` 결과 이동 (순환), `Enter` 선택 이동, `Escape` 닫기
- **결과 내비게이션**:
  - Project → `/tasks/:projectId`
  - Item → `/tasks/:projectId` + RightPanel 오픈 (selectedTaskId 설정)
  - User → `/users/:userId`
- **UI**: min(560px, 90vw) 너비, 12px radius, 카테고리별 아이콘 색상, footer kbd 힌트
- **다크/라이트 모드**: CSS 변수 기반 완전 지원

### Phase 28: DB 마이그레이션 + 타입

- **`supabase/migrations/011_notifications.sql`**: 알림 테이블 (notifications), RLS 정책, 인덱스, `mark_notification_read`/`mark_all_notifications_read` RPC, 할당/멘션 트리거
- **`supabase/migrations/012_project_templates.sql`**: `clone_project_from_template(p_template_id, p_name, p_start_date)` RPC — 아이템/의존성 복사, parent_id 매핑
- **`src/types/pm.ts`**: `Notification` 인터페이스 + `NotificationType` 타입 추가
- **`src/styles/theme-variables.css`**: `--notification-*`, `--board-card-*`, `--search-highlight-bg` 변수 추가 (light/dark)

### Phase 29: 프로젝트 별표

- **`src/hooks/useProjects.ts`**: `is_starred DESC, name ASC` 정렬 (별표 프로젝트 상단)
- **`src/components/sidebars/ProjectSidebarList.tsx`**: 각 프로젝트에 별 아이콘 토글 추가 (`useProjectCrud().updateProject`)
- **`src/pages/ProjectListPage.tsx`**: Name 컬럼 별 아이콘 항상 표시 + 클릭 토글 (`stopPropagation`)
- **`src/pages/TasksWorkspacePage.tsx`**: 툴바에 클릭 가능한 별표 토글
- **`src/components/ContextSidebar.css`**: `.sidebar-star` 스타일 추가

### Phase 30: 알림 시스템 + 실시간 폴링

- **`src/hooks/useAutoRefresh.ts`** (신규): 범용 폴링 훅 — `document.hidden` 체크, `setInterval` 기반
- **`src/hooks/useNotifications.ts`** (신규): 알림 fetch (limit 20) + 30초 폴링 + `markAsRead`/`markAllAsRead` RPC
- **`src/components/NotificationBell.tsx`** (신규): 벨 아이콘 + unread 뱃지 + 드롭다운 (항목별 타입 아이콘, 상대 시간, 읽음 처리)
- **`src/components/NotificationBell.css`** (신규): 드롭다운 스타일 (애니메이션, 읽지 않음 배경)
- **`src/components/IDEHeader.tsx`**: 테마 토글 옆에 `<NotificationBell />` 추가
- **`src/hooks/useProjectItems.ts`**: `useAutoRefresh(fetchData, 30_000)` 적용
- **`src/pages/DashboardPage.tsx`**: `useAutoRefresh(data.refetch, 60_000)` 적용

### Phase 31: Board 강화 + Calendar 편집 + Gantt 개선

- **Board 뷰** (`src/features/board/BoardView.tsx`):
  - 담당자 이니셜 아바타 뱃지 (24px 원형)
  - 기한 뱃지: overdue(빨강), due-soon(3일 이내, 주황), normal
  - `is_critical` 태스크 → 좌측 빨간 보더
  - `BoardView.css` 스타일 추가
- **Calendar 뷰** (`src/features/calendar/CalendarView.tsx`):
  - `editing={{ allowUpdating: true, allowDragging: true, allowResizing: true }}`
  - `onAppointmentUpdated`: 드래그/리사이즈 → start_date/end_date DB 업데이트
  - `onAppointmentAdding`: 클릭 → 새 태스크 생성 (project_items INSERT)
- **Gantt 뷰** (`src/features/gantt/GanttView.tsx`):
  - `handleTaskUpdated` 완료 후 `refetch()` 호출 추가 — 드래그 완료 시 즉시 데이터 동기화

### Phase 32: 대시보드 필터 + 검색 하이라이트

- **`src/hooks/useDashboardData.ts`**: `DashboardFilterOptions { period?, projectId? }` 파라미터 추가, 기간/프로젝트 필터로 모든 쿼리 필터링
- **`src/pages/DashboardPage.tsx`**: Greeting 아래에 필터 바 (기간 SelectBox + 프로젝트 SelectBox)
- **`src/pages/DashboardPage.css`**: `.dashboard-filter-bar` 스타일
- **`src/components/GlobalSearch.tsx`**: `highlightMatch(text, query)` 유틸리티 — 대소문자 무시 매칭 → `<mark className="search-highlight">` 래핑
- **`src/components/GlobalSearch.css`**: `.search-highlight` 스타일 (theme variable 기반)

### Phase 33: 템플릿 + 대량 작업 + Excel

- **프로젝트 템플릿**:
  - `src/hooks/useProjectCrud.ts`: `cloneFromTemplate(templateId, name, startDate)` RPC 추가, `is_template` in UpdateProjectInput
  - `src/pages/ProjectListPage.tsx`: "Template" 버튼 + Popup (템플릿 SelectBox, 이름, 시작일)
  - `src/features/settings/ProjectSettingsView.tsx`: "Mark as Template" Switch 토글 추가
- **대량 태스크 작업** (`src/features/tasks/TasksView.tsx`):
  - TreeList `Selection mode="multiple"` 활성화
  - 벌크 툴바: 상태 일괄 변경 SelectBox + 삭제 버튼 + Clear Selection
  - `TasksView.css`: `.bulk-toolbar` 스타일
- **Excel 내보내기/가져오기** (`src/features/tasks/TasksView.tsx`):
  - Export: DevExtreme `<Export enabled={true} />` 내장 기능
  - Import: "Import" 버튼 → `exceljs`로 .xlsx 파싱 → DataGrid 미리보기 → batch insert
  - 의존성: `exceljs`, `file-saver` 설치

### Phase 34: User Settings 페이지

- **DB**: `profiles.preferences JSONB` 컬럼 추가 (`013_user_preferences.sql`)
- **Preferences Store** (`src/lib/preferences-store.ts`):
  - Zustand persist (localStorage key: `nanum-preferences`)
  - theme, density, dateFormat, timezone, weekStart, defaultView, sidebarDefault
  - Debounced DB sync (1초) — 크로스 디바이스 동기화
  - `loadFromDb()` — 로그인 후 DB에서 불러와 로컬 병합
- **User Settings 페이지** (`/settings`):
  - Appearance: Theme (Light/Dark/System) + Density (Compact/Normal) — 즉시 적용
  - Regional: 날짜 포맷 (5종 + 미리보기), 타임존, 주 시작일
  - Workspace: 기본 뷰, 사이드바 기본 상태
- **Admin 변경**:
  - Appearance 섹션에서 Theme 제거 → Branding Colors만 유지
  - 사이드바 레이블 "Appearance" → "Branding"
- **Density CSS** (`src/styles/density-normal.css`): DataGrid, Button, TreeList 등 간격 증가
- **Default View 적용**: `TasksWorkspacePage` — tab 미지정 시 preferences.defaultView 사용
- **Navigation**: NavRail에 Settings 추가, 프로필 메뉴에 Settings 링크, ContextSidebar에 Settings 사이드바
- **Date Format**: `src/utils/formatDate.ts` 유틸리티 함수 (preferences 기반)

### Phase 35: Project Manager 필드 추가

- **DB 마이그레이션** (`014_project_manager.sql`):
  - `projects` 테이블에 `manager_id UUID REFERENCES auth.users(id)` 컬럼 추가
  - 기존 프로젝트: 첫 번째 admin 멤버를 manager로 backfill
- **타입 수정**: `Project` 인터페이스 + Supabase Row/Insert/Update에 `manager_id` 추가
- **useProjectCrud**: 프로젝트 생성 시 `manager_id`를 생성자로 자동 설정
- **Project Settings**: Manager SelectBox 추가 (멤버 목록에서 선택, clear 가능)
- **ProjectListPage**: `ownerMap` (project_members admin 조회) → `managerMap` (manager_id 기반 profiles 조회)로 단순화, "Owner" → "Manager" 컬럼명 변경
- **파일**: 신규 1개 (migration), 수정 6개 (types 2, hook 1, settings 1, list page 1, docs 2)

### Phase 36: 파비콘 + DataGrid 컬럼 폭 개선

- **파비콘 제작**: N + Progress Arc 디자인 SVG 파비콘 (`public/favicon.svg`)
  - 파란 원(#667eea) 위에 흰색 "N" 문자 + 75% 진행 아크
  - 192x192 PNG (`public/favicon-192.png`) 생성 — 모바일/PWA용
  - `index.html`: favicon.svg + apple-touch-icon 링크 추가, 기존 vite.svg 삭제
- **ProjectListPage DataGrid 컬럼 폭 수정**:
  - `columnAutoWidth={true}` 제거 — 긴 프로젝트명이 과도하게 넓어지는 원인
  - Progress 100→120px, Tasks 70→110px, Updated 150→160px

### Phase 37: Date Format 설정 반영

- **문제**: Settings > Regional > Date Format 변경이 DataGrid/Gantt/Calendar에 미반영
- **원인**: `formatDate` 유틸리티와 preferences store는 존재하지만, 컴포넌트들이 DevExtreme 기본 포맷 사용
- **해결**: `getDxDateFormat()` / `getDxDateTimeFormat()` 헬퍼 추가 (우리 포맷 → DevExtreme 포맷 변환)
- **적용 컴포넌트**:
  - `ProjectListPage` DataGrid: Start/End/Updated 컬럼 `format` 속성
  - `TasksView` TreeList: Start/End 컬럼 `format` 속성
  - `GanttView` Gantt: Start/End 컬럼 `format` 속성
  - `CalendarView`: 툴팁 `toLocaleDateString()` → `formatDate()` 변경
- Zustand 구독으로 설정 변경 시 즉시 반영 (페이지 새로고침 불필요)

### Phase 38: @멘션 기능 — 코멘트에서 팀원 태그 + 알림

- **useComments 훅**: `addComment(message, mentionedUserIds?)` 시그니처 확장, insert에 `mentioned_user_ids` 포함 → DB 트리거가 자동으로 `comment_mention` 알림 생성
- **CommentsView @자동완성**:
  - `useProjectMembers(projectId)`로 프로젝트 멤버 목록 로드
  - TextArea에서 `@` 입력 시 커서 위치 기반 검색어 추출 → 멤버 필터링 드롭다운 표시
  - 키보드 ↑↓ 이동, Enter 선택, Esc 닫기, 마우스 클릭 선택
  - 선택 시 `@이름 ` 삽입 + `mentionedIds` Set에 user_id 추가
  - 전송 시 `addComment(message, Array.from(mentionedIds))` 호출
- **코멘트 @멘션 하이라이트**: `@\S+` 패턴을 `<span className="mention">` 으로 래핑 (accent color + bold)
- **스타일**: mention-dropdown (absolute positioning above TextArea), mention-item (avatar + name), mention highlight
- **DB 변경 없음** — 기존 인프라 활용 (`comments.mentioned_user_ids`, `notify_on_comment_mention()` 트리거, `comment_mention` enum)

### Phase 39: 종합 문서화 + 프로젝트 정리

- **신규 문서 8개** (`docs/`):
  - `SYSTEM-OVERVIEW.md` — 시스템 개요, 기술 스택, 아키텍처 다이어그램, 디렉토리 구조, 환경 변수
  - `FRONTEND-ARCHITECTURE.md` — 라우팅 (17개 경로 + 6개 리다이렉트), 레이아웃 시스템, Zustand 4개 스토어, 공유/페이지/피처 컴포넌트
  - `HOOKS-REFERENCE.md` — 21개 커스텀 훅 API 레퍼런스 (시그니처, Supabase 테이블/RPC, 사용 컴포넌트, 주의사항)
  - `DATABASE-GUIDE.md` — DB 설계 원칙, 마이그레이션 14개, RPC 함수 17개, 트리거, Enum 11개, Storage 버킷
  - `SECURITY-MODEL.md` — 인증 흐름, 역할 체계, RLS 정책 매트릭스 (18개 테이블 × CRUD), 데드락 방지
  - `UI-DESIGN-SYSTEM.md` — CSS 변수 시스템 (12개 카테고리), Light/Dark 테마, Density, DevExtreme 가이드, 반응형
  - `DEPLOYMENT.md` — 개발 환경, Vite 빌드, Vercel 배포, Supabase 설정, TeamGantt 마이그레이션
  - `FUTURE-ROADMAP.md` — 미구현 기능 7개, 기술 부채, 성능/UX 개선, 우선순위 매트릭스
- **`docs/ARCHITECTURE.md`**: 320줄 → 54줄로 축약, 8개 신규 문서를 참조하는 인덱스 역할로 변경
- **불필요 파일 정리**:
  - `database/` 폴더 삭제 (supabase/migrations/와 중복된 초기 스키마 실험본)
  - `scripts/migrate.ts`, `scripts/migrate.mjs` 삭제 (미사용 마이그레이션 스크립트)
  - `TeamGantt프로젝트들.xlsx`, `teamgantt 가져오기 프롬프트.txt` 삭제 (임시 파일)
- **총 3,669줄** 문서 생성, 코드 변경 없음

### Phase 40: Per-User Project Stars

- **기존 문제**: `projects.is_starred`가 프로젝트 공유 속성이라 한 사용자의 별표가 모든 사용자에게 공유됨. UPDATE RLS가 admin 권한을 요구하여 일반 멤버는 별표 불가.
- **해결**: `user_project_stars` 별도 테이블로 전환 — 사용자별 독립 별표 관리
- **DB 변경** (`015_user_project_stars.sql`):
  - `user_project_stars` 테이블 생성 (UNIQUE: user_id + project_id)
  - RLS: 본인 별표만 SELECT/INSERT/DELETE (UPDATE 불필요)
  - 기존 `projects.is_starred` 데이터를 프로젝트 생성자에게 마이그레이션
  - `projects.is_starred` 컬럼 제거
- **타입**: `supabase.ts`에서 projects Row/Insert/Update `is_starred` 제거, `user_project_stars` 타입 추가
- **Hooks**:
  - `useProjects`: projects + user_project_stars 병렬 조회 → `is_starred` 클라이언트 주입 + 정렬
  - `useProject`: 단일 프로젝트 조회 시 star 존재 여부 확인
  - `useProjectCrud`: `toggleStar(projectId)` 함수 추가 (존재하면 DELETE, 없으면 INSERT)
- **컴포넌트 3곳** 별표 토글 호출을 `toggleStar(id)` 로 변경:
  - `ProjectSidebarList.tsx`, `ProjectListPage.tsx`, `TasksWorkspacePage.tsx`

### Bugfix: 새로고침 시 데이터 미로딩 (Supabase Auth 데드락)

**증상**: 페이지 새로고침(F5) 시 프로젝트 목록, 대시보드 통계 등 모든 데이터가 로드되지 않음. 콘솔 에러 없이 빈 화면 표시.

**근본 원인**: Supabase JS v2.89의 `navigator.locks` API와 `onAuthStateChange` 콜백 간 데드락.

```
_initialize() → navigator.locks 획득 → _recoverAndRefresh()
  → _notifyAllSubscribers('SIGNED_IN')
    → useAuth의 onAuthStateChange 콜백 실행
      → await loadUserProfile()
        → supabase.from('profiles').select()
          → 내부적으로 _getAccessToken() → getSession()
            → await initializePromise (_initialize 완료 대기)
              → 💀 DEADLOCK (서로 완료를 기다림)
```

데드락으로 `initializePromise`가 영원히 resolve되지 않아, `getSession()`을 호출하는 모든 코드(데이터 fetching 훅 포함)가 무한 대기.

**수정 내용**:

| 파일 | 변경 | 이유 |
|------|------|------|
| `src/hooks/useAuth.ts` | `onAuthStateChange` 콜백을 non-async로 변경, `loadUserProfile()`을 fire-and-forget으로 호출 | 데드락 해소: 콜백이 즉시 반환되어 `_initialize()` 완료 가능 |
| `src/hooks/useProjects.ts` | `getSession()` guard 제거 | Supabase 클라이언트가 자체적으로 auth 토큰 관리하므로 불필요. 데드락 시 무한 대기 유발 |
| `src/pages/DashboardPage.tsx` | `getSession()` guard를 `profile?.tenant_id` 체크로 교체 | 동일 사유 |

**핵심 교훈**:
- Supabase `onAuthStateChange` 콜백 안에서 Supabase 쿼리를 `await`하면 안 됨 (내부적으로 `getSession()` → `initializePromise` 대기 → 데드락)
- 데이터 fetching 시 `getSession()` guard는 불필요 — Supabase 클라이언트가 `_getAccessToken()`을 통해 자동으로 auth 토큰을 포함함
- `auth-store`의 zustand persist에서 복원된 `profile.tenant_id`로 guard하는 것이 더 적절

### Phase 41: Tenant별 Enum 설정

- **목적**: 하드코딩된 12개 enum 값(status 라벨, 색상, 부서 등)을 tenant별로 관리자가 커스터마이징 가능하도록 전환
- **DB 변경** (`016_tenant_enum_config.sql`):
  - `tenant_enum_config` 테이블 생성 (JSONB options, UNIQUE: tenant_id + category)
  - `task_status`, `project_status` ENUM→TEXT 변환 (커스텀 값 지원)
  - 7개 카테고리 시드: task_status, project_status, user_role, member_permission, department, item_type, link_type
  - RLS: 인증 사용자 SELECT, admin만 INSERT/UPDATE/DELETE
- **타입**: `EnumCategory`, `EnumOption` 타입 추가, `TaskStatus`/`ProjectStatus` → `string` 확장
- **스토어**: `enum-config-store.ts` — Zustand (in-memory), `loadConfigs()`/`getOptions()`/`updateOptions()`, 기본값 fallback
- **소비자 훅**: `useEnumOptions(category)` — `options`, `items`, `labels`, `colors`, `values`, `getLabel()`, `getColor()` 반환
- **ProtectedRoute**: `tenant_id` 확보 시 `loadConfigs()` 자동 호출
- **Admin UI**: `EnumConfigSection.tsx` — 7개 카테고리 탭 + 옵션 편집기 (value/label/color + 순서변경 + 추가/삭제)
- **소비자 업데이트** (12개 컴포넌트):
  - BoardView: 동적 컬럼/그룹
  - TaskDetailPopup: 동적 SelectBox items
  - TasksView: 동적 statusLabels + bulk SelectBox
  - DashboardTaskDistribution: 동적 colors/labels/order
  - DashboardProjectStatus: 동적 colors/labels/palette
  - ProjectListPage: 동적 statusLabels/statusOptions
  - ProjectDetailPage: 동적 statusLabels
  - TasksWorkspacePage: 동적 statusLabels
  - ProjectSettingsView: 동적 statusOptions/permissionOptions/permissionLabels
  - UsersSection: 동적 roleOptions/departmentOptions

### Phase 42: View Column 설정 (Admin + User StateStoring)

- **목적**: Admin이 조직 기본 뷰 컬럼 설정(표시 여부, 순서, 너비)을 관리하고, 사용자는 개인 오버라이드 가능
- **대상 뷰**: Tasks View (TreeList), My Tasks (DataGrid), Gantt View, Board View
- **DB 변경** (`017_tenant_view_config.sql`):
  - `tenant_view_config` 테이블 생성 (JSONB config, UNIQUE: tenant_id + view_key)
  - 4개 뷰에 대한 기본 컬럼/필드 설정 시드
  - RLS: 인증 사용자 SELECT, admin만 INSERT/UPDATE/DELETE
- **타입**: `ViewKey`, `ColumnConfig`, `ViewConfig`, `DxGridState` 타입 추가
- **스토어**: `view-config-store.ts` — Zustand (in-memory)
  - `loadTenantConfigs()` / `loadUserStates()` — 테넌트 설정 + 사용자 상태 로드
  - `updateTenantConfig()` — Admin 설정 변경
  - `saveUserState()` — 사용자 상태 저장 (2초 debounce → profiles.preferences.viewStates)
  - `clearUserState()` — 개인 설정 초기화
- **소비자 훅**: `useViewConfig(viewKey, projectId?)` — `customLoad`/`customSave` stateStoring 콜백, `resetToDefault`
- **ProtectedRoute**: `tenant_id` 확보 시 `loadTenantConfigs()` / `loadUserStates()` 자동 호출
- **Admin UI**: `ViewSettingsSection.tsx` — 4개 뷰 탭 + 컬럼 편집기 (visible 토글, width 입력, 순서 변경, Gantt taskListWidth, Board cardFields)
- **뷰 통합**:
  - TasksView: DevExtreme TreeList `<StateStoring>` 적용 (customLoad/customSave)
  - MyTasksPage: DevExtreme DataGrid `<StateStoring>` 적용
  - GanttView: `columnVisible` 맵 + `taskListWidth` 동적 적용 (StateStoring 미지원)
  - BoardView: `cardFields` 조건부 렌더링 (assignees, dueDate, progress)
- **NavRail**: AdminSidebarList에 "View Columns" 메뉴 추가

### Phase 43: View Config 확장 — Projects Grid + 컬럼 상세 설정 + Grid 레벨 설정

- **목적**: Projects 페이지 그리드 추가 + 컬럼 Caption 편집 + 정렬/필터/그룹핑/고정 옵션 + Grid 레벨 설정 (Row Lines, Group Panel 등)
- **ViewKey 추가**: `'projects_list'` (5개 뷰: projects_list, tasks_view, my_tasks, gantt, board)
- **ColumnConfig 확장**:
  - `caption` 편집 가능 (컬럼명 커스터마이징)
  - `alignment`: left/center/right
  - `minWidth`: 최소 너비
  - `allowSorting`, `sortOrder`, `sortIndex`: 정렬 설정
  - `allowFiltering`: 필터 허용
  - `allowGrouping`, `groupIndex`: 그룹핑 설정
  - `fixed`, `fixedPosition`: 고정 컬럼 (left/right)
- **GridSettings 추가**:
  - `showRowLines`, `showColumnLines`: 선 표시
  - `rowAlternationEnabled`: 줄무늬 배경
  - `wordWrapEnabled`: 텍스트 줄바꿈
  - `showFilterRow`, `showHeaderFilter`: 필터 UI
  - `showGroupPanel`, `showSearchPanel`: 그룹/검색 패널
  - `rowHeight`: compact/normal/comfortable
- **Admin UI 강화** (`ViewSettingsSection.tsx`):
  - 5개 뷰 선택 사이드바
  - Grid Settings 패널 + Presets (Compact/Standard/Detailed)
  - 컬럼별 상세 옵션 (클릭 확장: Sorting, Filtering, Grouping, Fixed)
  - Live Preview (Projects 뷰 전용)
- **ProjectListPage 통합**:
  - `useViewConfig('projects_list')` 훅 연동
  - DevExtreme StateStoring (사용자별 컬럼 드래그/리사이즈 저장)
  - gridSettings 기반 그리드 속성 적용
  - effectiveColumns 기반 동적 Column 렌더링
- **DB 마이그레이션** (`018_view_config_extended.sql`):
  - `projects_list` 뷰 설정 시드
  - 기존 4개 뷰 설정 확장 (gridSettings + 컬럼 옵션)
- **파일 변경**:
  - 수정: `src/types/pm.ts` (ViewKey, ColumnConfig, GridSettings, DxGridState 확장)
  - 수정: `src/lib/view-config-store.ts` (DEFAULT_CONFIGS, GRID_PRESETS, mergeWithTenantConfig)
  - 수정: `src/hooks/useViewConfig.ts` (gridSettings 반환)
  - 수정: `src/pages/admin/ViewSettingsSection.tsx` (완전 재작성)
  - 수정: `src/pages/admin/ViewSettingsSection.css` (새 UI 스타일)
  - 수정: `src/pages/ProjectListPage.tsx` (StateStoring + 동적 컬럼)
  - 신규: `supabase/migrations/018_view_config_extended.sql`

### Phase 44: Admin UI 통합 + User Management 확장

- **목적**: Admin 페이지 전체 디자인 통일 (View Columns 스타일) + User Management에 HR 기능 추가
- **Admin UI 통합**:
  - Organization 섹션: 3개 하위 탭 (Basic Information, Details, Branding)
  - Appearance 섹션 → Organization > Branding 탭으로 통합 및 파일 삭제
  - `admin-sections.css` 공통 스타일 파일 생성 (sidebar tabs, sticky header, card boxes, settings grid)
- **User Management 확장** — 7개 탭:
  - Directory: 전체 사용자 DataGrid (기존 코드 재활용)
  - Departments: 부서 관리 (tenant_enum_config 활용, CRUD UI)
  - Org Chart: 조직도 시각화 (DevExtreme TreeList, manager_id 기반 계층)
  - Active: 현재 근무자 필터 (employment_status = 'active')
  - On Leave: 휴직자 필터 (employment_status = 'on_leave')
  - Terminated: 퇴사자 필터 (employment_status = 'terminated')
  - Settings: 역할 권한 기본값 설정
- **DB 마이그레이션** (`019_employment_status.sql`):
  - `employment_status` ENUM 생성 (active, on_leave, terminated)
  - `profiles` 테이블에 `employment_status`, `department_id`, `manager_id` 컬럼 추가
  - 기존 `is_active` 데이터를 `employment_status`로 마이그레이션
  - `update_employment_status`, `update_user_manager`, `update_user_department` RPC 함수 (admin only)
- **타입 추가**: `EmploymentStatus` 타입, Profile 인터페이스 확장
- **훅 확장** (`useUserManagement.ts`): `updateEmploymentStatus`, `updateUserManager`, `updateUserDepartment` 함수 추가
- **파일 변경**:
  - 신규: `supabase/migrations/019_employment_status.sql`, `src/styles/admin-sections.css`
  - 수정: `src/types/database.ts`, `src/hooks/useUserManagement.ts`
  - 대폭 재작성: `src/pages/admin/UsersSection.tsx`, `src/pages/admin/UsersSection.css`
  - 삭제: `src/pages/admin/AppearanceSection.tsx`, `src/pages/admin/AppearanceSection.css`

### Phase 46: Users 페이지 CRM 스타일 + Enum Config 개선

- **목적**: Users 페이지를 CRM Contact List 스타일로 전환 + Admin Enum 설정 UI 개선
- **Users 페이지 CRM 레이아웃** (`/users`):
  - DataGrid + 우측 상세 패널 (540px) Split Layout
  - 상세 패널 접기/펼치기 토글 버튼 (chevron 아이콘)
  - my-tasks 헤더 스타일 적용 (40px, uppercase "TEAM" 타이틀, 갯수 배지)
  - 사이드바 제거 → 전체 너비 사용
  - Phone, Status 컬럼 추가 (Avatar, Name, Phone, Email, Department, Position, Role, Status)
  - Status 컬럼: employment_status 기반 배지 (Active/On Leave/Terminated)
- **상세 패널 UI**:
  - 아바타 + 이름/직책/배지 헤더
  - 4개 섹션: Contact (Email/Phone), Organization (Department/Manager), Address, Bio
  - Meta 정보: Last Login, Created
  - 반응형: 1300px 이하 480px, 1000px 이하 전체 너비 스택
- **Enum Config 개선** (`/admin/enums`):
  - 사이드바 폭 통일 (180px → 140px, ViewSettings와 동일)
  - Value 컬럼에 선택된 색상 배경 적용 (`enum-value-readonly` 배지)
  - 흰색 텍스트 + text-shadow로 가독성 확보
- **파일 변경**:
  - 대폭 재작성: `src/pages/UsersPage.tsx`, `src/pages/UsersPage.css`
  - 수정: `src/components/ContextSidebar.tsx` (Users 경로 사이드바 제거)
  - 수정: `src/pages/admin/EnumConfigSection.tsx` (색상 배지)
  - 수정: `src/pages/admin/EnumConfigSection.css` (사이드바 폭, 배지 스타일)

### Phase 45: My Tasks 페이지 UI 통일 + 필터 연동 갯수 표시

- **목적**: My Tasks 페이지의 UI/UX를 Projects 페이지와 동일하게 통일
- **MyTasksPage UI 개선**:
  - 헤더 스타일 통일 (40px 컴팩트 헤더, uppercase 타이틀 "MY TASKS", sidebar 스타일 버튼)
  - DataGrid 스타일 통일 (`showBorders={false}`, sidebar 배경색 `var(--sidebar-bg)`)
  - Pager 컴포넌트 추가 (페이지 크기 선택, 정보 표시)
  - 로딩/에러/빈 상태를 `noDataText`로 통합
  - CSS 전면 개편 — `project-grid-container` 패턴 적용
- **필터 연동 갯수 표시**:
  - ProjectListPage/MyTasksPage 헤더에 항목 갯수 배지 추가
  - DataGrid 필터 변경 시 갯수 자동 업데이트 (`onOptionChanged` 이벤트)
  - `visibleCount` state + `lastCountRef` 조합으로 무한 루프 방지
  - `setTimeout` debounce로 안정적인 상태 업데이트
- **파일 변경**:
  - 수정: `src/pages/MyTasksPage.tsx` (Pager import, 헤더 구조, DataGrid props, onOptionChanged)
  - 수정: `src/pages/MyTasksPage.css` (전면 재작성 — ProjectListPage.css 패턴 적용)
  - 수정: `src/pages/ProjectListPage.tsx` (visibleCount state, onOptionChanged)
  - 수정: `src/pages/ProjectListPage.css` (header-count 스타일 추가)

---

## 미완료 / 진행 예정

### 우선순위 높음 → 완료됨

| 항목 | 상태 | 설명 |
|------|------|------|
| 코멘트 UI 완성 | **완료** | CommentsView + useComments 훅으로 CRUD 연결 완료 |
| 파일 관리 UI | **완료** | FilesView + useDocuments 훅, Supabase Storage 업로드/다운로드, 버전 히스토리 |
| 프로젝트 설정 UI | **완료** | ProjectSettingsView + useProjectCrud/useProjectMembers 훅, 프로젝트 정보 수정 + 멤버 권한 관리 |

### 우선순위 중간

| 항목 | 상태 | 설명 |
|------|------|------|
| 시간 추적 UI | **완료** | TimeTrackingView + useTimeEntries 훅, Log Time 팝업, DataGrid + Summary |
| 체크리스트 UI | **완료** | TaskDetailPopup + useChecklist 훅, 체크리스트 CRUD + 토글 |
| 활동 로그 뷰 | **완료** | ActivityView + useActivityLog 훅, 날짜별 그룹핑 타임라인, 필터 |
| 보드 뷰 (Kanban) | **완료** | BoardView + DevExtreme Sortable, 4칼럼 Kanban (To Do/In Progress/Review/Done), 드래그앤드롭, task_status 컬럼 저장 |
| 캘린더 뷰 | **완료** | CalendarView + DevExtreme Scheduler, 월간/주간/어젠다 뷰, 아이템 타입별 색상, 읽기 전용 |

### 우선순위 낮음

| 항목 | 설명 |
|------|------|
| Application 관리 | OAuth2/OIDC 앱 관리 페이지 |
| ~~Audit 로그 뷰어~~ | **완료** — AuditLogPage + useAuditLog 훅, DataGrid (날짜/사용자/액션/리소스/메타데이터), 프로필 조인, 필터/검색/내보내기 |
| MFA 구현 | TOTP, SMS 인증 |
| ~~실시간 업데이트~~ | **완료** — 30초/60초 자동 폴링 (useAutoRefresh 훅), document.hidden 체크 |
| ~~테넌트 설정~~ | **완료** — Settings 페이지: Organization(이름/도메인), Security(비밀번호 규칙/세션 타임아웃), Appearance(브랜딩 컬러) |
| ~~알림 시스템~~ | **완료** — notifications 테이블 + NotificationBell 드롭다운 + 트리거 (할당/멘션) + 30초 폴링 |
| ~~Supabase 타입 생성~~ | **완료** — `db` any-cast 제거, `Database` 타입 동기화, `dbUpdate()` 헬퍼, `gen:types` 스크립트 추가 |

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| Frontend | React + TypeScript (strict) | 19.x / 5.9 |
| UI | DevExtreme + devexpress-gantt | 25.2.3 / 4.1.65 |
| Backend | Supabase (PostgreSQL + Auth + RLS) | supabase-js 2.x |
| State | Zustand | 4.5 |
| Routing | React Router DOM | 7.x |
| Build | Vite | 7.x |

## 실행 방법

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 린트
npm run lint

# TeamGantt 마이그레이션 (migration/ 디렉토리)
cd migration
npm run import          # 전체 임포트
npm run import:clean    # 클린 임포트 (기존 데이터 삭제 후)
npm run import:resume   # 이어서 임포트
npm run repair          # 마이그레이션 복구 (그룹/parent_id/dependencies/timestamps)
```
