# 개발 진행 현황

## 완료된 작업

### Phase 1: 프로젝트 인프라

- TypeScript strict mode 설정 (path alias `@/`)
- Vite 7 빌드 환경
- ESLint + typescript-eslint 린팅
- 환경 변수 설정 (Supabase URL/Key, DevExtreme Key)

### Phase 2: Auth 모듈 DB

- **테이블 5개**: tenants, profiles, applications, audit_logs, sessions
- **RLS**: 테넌트 격리, RBAC (admin/user/developer)
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
- **태스크 상세 팝업** (`features/tasks/TaskDetailPopup.tsx`):
  - 태스크 정보 (타입, 날짜, 진행률)
  - 체크리스트 CRUD (추가, 토글, 삭제)
  - 진행 바 ("X of Y completed")
  - Tasks TreeList 행 클릭 / Gantt 태스크 클릭 시 열림
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
| 보드 뷰 (Kanban) | **완료** | BoardView + DevExtreme Sortable, 4칼럼 Kanban (To Do/In Progress/Review/Done), 드래그앤드롭, custom_fields.board_status 저장 |
| 캘린더 뷰 | **완료** | CalendarView + DevExtreme Scheduler, 월간/주간/어젠다 뷰, 아이템 타입별 색상, 읽기 전용 |

### 우선순위 낮음

| 항목 | 설명 |
|------|------|
| Application 관리 | OAuth2/OIDC 앱 관리 페이지 |
| Audit 로그 뷰어 | 감사 로그 필터링/조회 |
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
