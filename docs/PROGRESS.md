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
| 실시간 업데이트 | Supabase Realtime 구독 |
| 테넌트 설정 | 브랜딩, 보안 정책 |
| 알림 시스템 | 멘션, 할당 알림 |
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
```
