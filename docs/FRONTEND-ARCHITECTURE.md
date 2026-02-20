# 프론트엔드 아키텍처 (Frontend Architecture)

> NanumProject 프론트엔드의 라우팅, 레이아웃, 상태 관리, 컴포넌트 구조를 상세히 문서화합니다.
>
> 관련 문서: [HOOKS-REFERENCE.md](./HOOKS-REFERENCE.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) | [PRD.md](./PRD.md)

---

## 1. 라우팅 구조 (Routing)

### 1.1 엔트리 포인트

- `src/App.tsx` → `<AppRouter />`
- `src/routes/index.tsx` — `createBrowserRouter` (React Router DOM 7.x)

### 1.2 라우트 테이블

| 경로 | 컴포넌트 | Guard | 레이아웃 | 설명 |
|------|----------|-------|----------|------|
| `/` | `HomePage` | 없음 | 없음 | 랜딩 페이지 (공개) |
| `/login` | `LoginPage` | 없음 | 없음 | 로그인 |
| `/signup` | `SignUpPage` | 없음 | 없음 | 회원가입 |
| `/reset-password` | `ResetPasswordPage` | 없음 | 없음 | 비밀번호 재설정 |
| `/dashboard` | `DashboardPage` | ProtectedRoute | IDELayout | 대시보드 (KPI, 차트, 활동) |
| `/projects` | `ProjectListPage` | ProtectedRoute | IDELayout | 프로젝트 목록 (DataGrid) |
| `/tasks` | `TasksWorkspacePage` | ProtectedRoute | IDELayout | 작업 공간 (프로젝트 미선택 시 빈 상태) |
| `/tasks/:projectId` | `TasksWorkspacePage` | ProtectedRoute | IDELayout | 프로젝트 작업 공간 (기본 탭) |
| `/tasks/:projectId/:tab` | `TasksWorkspacePage` | ProtectedRoute | IDELayout | 프로젝트 작업 공간 (특정 탭) |
| `/profile` | `MyProfilePage` | ProtectedRoute | IDELayout | 내 프로필 편집 |
| `/users` | `UsersPage` | ProtectedRoute | IDELayout | 사용자 목록 (사이드바) |
| `/users/:userId` | `UsersPage` | ProtectedRoute | IDELayout | 사용자 프로필 상세 |
| `/audit` | `AuditLogPage` | ProtectedRoute | IDELayout | 감사 로그 (DataGrid) |
| `/settings` | `UserSettingsPage` | ProtectedRoute | IDELayout | 개인 설정 (기본: appearance) |
| `/settings/:section` | `UserSettingsPage` | ProtectedRoute | IDELayout | 개인 설정 (섹션별) |
| `/admin` | `AdminPage` | ProtectedRoute | IDELayout | 관리자 설정 (기본: organization) |
| `/admin/:section` | `AdminPage` | ProtectedRoute | IDELayout | 관리자 설정 (섹션별) |

### 1.3 레거시 리디렉트

| 이전 경로 | 리디렉트 대상 | 방식 |
|-----------|-------------|------|
| `/projects/:projectId` | `/tasks/:projectId` | `ProjectRedirect` 컴포넌트 |
| `/projects/:projectId/:tab` | `/tasks/:projectId/:tab` | `ProjectRedirect` 컴포넌트 |
| `/dashboard/users` | `/users` | `<Navigate replace />` |
| `/dashboard/audit` | `/audit` | `<Navigate replace />` |
| `/dashboard/settings` | `/admin` | `<Navigate replace />` |
| `/dashboard/overview` | `/dashboard` | `<Navigate replace />` |

### 1.4 ProtectedRoute 로직

```
src/components/ProtectedRoute.tsx
```

1. `useAuth()` 훅으로 `isAuthenticated`, `isLoading` 가져옴
2. `isLoading === true` → "Loading..." 표시
3. `isAuthenticated === false` → `/login`으로 리디렉트 (원래 location을 state로 전달)
4. `isAuthenticated === true` → `children` 렌더링

### 1.5 인증 라우트 네스팅

```
ProtectedRoute
  └── IDELayout
        └── Outlet (각 페이지 컴포넌트)
```

모든 보호 라우트는 하나의 layout route로 래핑되어 있어서 IDELayout이 한 번만 마운트됩니다.

---

## 2. 레이아웃 시스템 (Layout System)

### 2.1 IDELayout 구조

```
src/components/IDELayout.tsx
```

VS Code 스타일의 3패널 레이아웃입니다.

```
┌─────────────────────────────────────────────────────┐
│  IDEHeader (고정 상단 바)                              │
├──────┬──────────────────────────────────────────────┤
│      │ ┌──────────┬──┬──────────────┬──┬─────────┐ │
│ Nav  │ │ Context  │Re│   Main       │Re│ Right   │ │
│ Rail │ │ Sidebar  │si│   Content    │si│ Panel   │ │
│      │ │          │ze│   (Outlet)   │ze│         │ │
│ 40px │ │160-400px │4 │    1fr       │4 │260-500px│ │
│      │ │          │px│              │px│         │ │
│      │ └──────────┴──┴──────────────┴──┴─────────┘ │
└──────┴──────────────────────────────────────────────┘
```

### 2.2 각 영역 설명

| 영역 | 너비 | 컴포넌트 | 설명 |
|------|------|----------|------|
| **IDEHeader** | 100% (고정 높이) | `IDEHeader` | 앱 타이틀, 검색, 테마 토글, 알림, 사용자 메뉴 |
| **NavRail** | 40px (고정) | `NavRail` | 아이콘 전용 수직 내비게이션 바 |
| **ContextSidebar** | 160-400px (리사이즈) | `ContextSidebar` | 경로별 사이드바 콘텐츠 |
| **ResizeHandle (좌)** | 4px | `ResizeHandle` | 사이드바 너비 조정 드래그 핸들 |
| **MainContent** | 1fr (가변) | `<main>` | 페이지 컴포넌트 (Outlet) |
| **ResizeHandle (우)** | 4px | `ResizeHandle` | 우측 패널 너비 조정 드래그 핸들 |
| **RightPanel** | 260-500px (리사이즈) | `RightPanel` | 태스크 상세 패널 |

### 2.3 ContextSidebar 경로 매핑

```
src/components/ContextSidebar.tsx
```

| 경로 패턴 | 사이드바 콘텐츠 | 헤더 타이틀 |
|-----------|---------------|-----------|
| `/tasks/*` | `ProjectSidebarList` | TASKS |
| `/users/*` | `UserSidebarList` | USERS |
| `/audit/*` | `AuditSidebarList` | AUDIT LOG |
| `/settings/*` | `SettingsSidebarList` | SETTINGS |
| `/admin/*` | `AdminSidebarList` | ADMIN |
| 기타 (`/dashboard`, `/projects`, `/profile`) | 없음 (사이드바 숨김) | — |

사이드바 콘텐츠가 없는 경로에서는 `hasSidebarContent()` 함수가 `false`를 반환하여 사이드바 영역이 완전히 숨겨집니다.

### 2.4 사이드바 콘텐츠 목록

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `ProjectSidebarList` | `sidebars/ProjectSidebarList.tsx` | 활성 프로젝트 목록 (별표/이름), 클릭 시 `/tasks/:id` 이동 |
| `UserSidebarList` | `sidebars/UserSidebarList.tsx` | 테넌트 사용자 목록 (아바타/이름/역할), 자동 첫 번째 선택 |
| `AuditSidebarList` | `sidebars/AuditSidebarList.tsx` | 날짜 필터 (Today, 7일, 30일, All Time) |
| `SettingsSidebarList` | `sidebars/SettingsSidebarList.tsx` | 설정 섹션 (Appearance, Regional, Workspace) |
| `AdminSidebarList` | `sidebars/AdminSidebarList.tsx` | 관리 섹션 (Organization, Users, Security, Branding), admin 전용 |

### 2.5 패널 토글/리사이즈 동작

- **사이드바 접기**: 토글 버튼 → `leftPanelOpen = false` → 40px 메뉴 버튼만 표시
- **사이드바 펴기**: 메뉴 버튼 클릭 → `leftPanelOpen = true` → 전체 사이드바 표시
- **리사이즈**: `ResizeHandle` 드래그 → `setLeftPanelWidth()`/`setRightPanelWidth()` 호출
- **우측 패널**: 태스크 선택 시 자동 열림, 닫기 버튼으로 수동 닫기
- **grid-template-columns**: `[sidebarW] [resizeL] [1fr] [resizeR] [rightW]` 동적 계산

### 2.6 스크롤 오버레이

`ScrollArrowOverlay` 컴포넌트는 스크롤 가능 컨테이너에 상/하(또는 좌/우) 화살표와 페이드 그래디언트를 렌더링합니다.

- `ContextSidebar` — 내장된 자체 스크롤 오버레이
- `TasksWorkspacePage` — `workspace-content` 영역에 `ScrollArrowOverlay` 적용

---

## 3. 상태 관리 (State Management)

### 3.1 Zustand Store 개요

| Store | 파일 | 영속성 | localStorage 키 | 용도 |
|-------|------|--------|-----------------|------|
| `useAuthStore` | `lib/auth-store.ts` | persist | `nanumauth-auth` | 인증 상태 (user, session, profile) |
| `usePMStore` | `lib/pm-store.ts` | 없음 (in-memory) | — | 프로젝트/패널 UI 상태 |
| `usePreferencesStore` | `lib/preferences-store.ts` | persist + DB sync | `nanum-preferences` | 사용자 환경설정 |
| `useThemeStore` | `lib/theme-store.ts` | persist | `nanum-theme` | 테마 (light/dark/system) |

### 3.2 auth-store 상세

```typescript
// lib/auth-store.ts
interface AuthStore extends AuthState {
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}
```

**영속성 설정**:
- `partialize`: `session`, `user`, `profile`만 저장 (isLoading 제외)
- `merge`: 복원 시 `isAuthenticated = !!session`, `isLoading = !session` 계산
  - 이를 통해 페이지 새로고침 후 ProtectedRoute가 "Loading..."에 갇히지 않음

**세션 복원 플로우**:
1. localStorage에서 Zustand 상태 복원 → `isAuthenticated = true`, `isLoading = true`
2. `useAuth` 훅의 `useEffect` → `supabase.auth.getSession()` 호출
3. 세션 유효 → `setSession`, `loadUserProfile` → `setLoading(false)`
4. 세션 만료 → `setSession(null)` → 로그인 페이지로 리디렉트

### 3.3 pm-store 상세

```typescript
// lib/pm-store.ts
interface PMStore {
  // 프로젝트 목록
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  // 활성 프로젝트
  activeProject: Project | null;
  activeProjectLoading: boolean;

  // 패널 상태
  leftPanelOpen: boolean;       // 기본값: true
  rightPanelOpen: boolean;      // 기본값: false
  leftPanelWidth: number;       // 기본값: 220
  rightPanelWidth: number;      // 기본값: 320
  selectedTaskId: string | null;
  rightPanelTab: number;        // 기본값: 0
}
```

- **영속성 없음** — 새로고침 시 초기값으로 리셋
- 프로젝트 목록/활성 프로젝트는 `useProjects`/`useProject` 훅이 관리
- 패널 상태는 IDELayout과 RightPanel에서 사용

### 3.4 preferences-store 상세

```typescript
// lib/preferences-store.ts
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'normal';
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'YYMMDD';
  timezone: string;          // 'auto' | IANA timezone
  weekStart: 0 | 1;         // 0=Sunday, 1=Monday
  defaultView: 'gantt' | 'board' | 'grid' | 'calendar';
  sidebarDefault: 'expanded' | 'collapsed';
}
```

**이중 영속성 메커니즘**:
1. **localStorage** (`nanum-preferences`): 즉시 적용, 오프라인 대비
2. **DB sync** (`profiles.preferences` JSONB 컬럼): `setPreference()` 호출 시 1초 debounce 후 저장

**데이터 로드 플로우**:
1. localStorage에서 복원 (빠른 렌더)
2. `loadFromDb()` 호출 → DB 값으로 머지 → 최신 상태 적용
3. `applyDensity()`, `setTheme()` 등 사이드이펙트 즉시 실행

### 3.5 theme-store 상세

```typescript
// lib/theme-store.ts
interface ThemeStore {
  theme: ThemeMode;  // 'light' | 'dark' | 'system'
  setTheme: (theme: ThemeMode) => void;
}
```

- DevExtreme 다크 테마 CSS를 동적 `<link>` 태그로 토글
- `system` 모드: `prefers-color-scheme` 미디어 쿼리 리스너 등록
- `document.documentElement` `data-theme` 속성으로 커스텀 CSS 변수 전환
- 테마 전환 시 0.35초 트랜지션 애니메이션

---

## 4. 공유 컴포넌트 (Shared Components)

### 4.1 IDEHeader

```
src/components/IDEHeader.tsx
```

상단 헤더 바. 다음 요소를 포함합니다:

- **좌측**: 앱 타이틀 "NanumProject" (클릭 시 `/dashboard` 이동)
- **중앙**: 검색 트리거 버튼 (`Cmd+K` / `Ctrl+K` 단축키)
- **우측**: 테마 토글 (sun/moon 아이콘), `NotificationBell`, 사용자 프로필 메뉴 (드롭다운)

사용자 프로필 드롭다운 메뉴:
- 이메일, 역할 표시
- My Profile, Settings 링크
- Admin 링크 (admin 역할만)
- Sign Out 버튼

### 4.2 NavRail

```
src/components/NavRail.tsx
```

40px 너비의 수직 아이콘 내비게이션 바.

| 아이콘 | 경로 | 라벨 | 위치 | 조건 |
|--------|------|------|------|------|
| datatrending | `/dashboard` | Dashboard | 상단 | 모든 사용자 |
| activefolder | `/projects` | Projects | 상단 | 모든 사용자 |
| clipboardtasklist | `/tasks` | Tasks | 상단 | 모든 사용자 |
| user | `/users` | Users | 상단 | 모든 사용자 |
| preferences | `/settings` | Settings | 하단 | 모든 사용자 |
| lock | `/admin` | Admin | 하단 | admin 역할만 |

활성 상태는 `location.pathname.startsWith(path)` 패턴으로 감지합니다.

### 4.3 ContextSidebar

```
src/components/ContextSidebar.tsx
```

경로에 따라 동적으로 콘텐츠를 전환하는 사이드바.

- 헤더: 토글 버튼 + 섹션 타이틀
- 바디: 스크롤 가능 영역, 스크롤 상태 감지 (ResizeObserver + MutationObserver)
- 스크롤 화살표: 상/하 페이드 그래디언트 + 화살표 버튼 (80% 페이지 스크롤)

### 4.4 RightPanel

```
src/components/RightPanel.tsx
```

태스크 상세 정보를 표시하는 우측 패널.

- 헤더: 선택된 태스크 이름 + 닫기 버튼
- 바디: `TaskDetailPanel` 컴포넌트 (탭 구조: Info, Checklist, Comments, Relations)
- 빈 상태: "Select a task to view details" 메시지

### 4.5 ResizeHandle

```
src/components/ResizeHandle.tsx
```

패널 리사이즈를 위한 4px 드래그 핸들.

```typescript
interface ResizeHandleProps {
  position: 'left' | 'right';
  onResize: (width: number) => void;
  currentWidth: number;
  minWidth: number;      // left: 160, right: 260
  maxWidth: number;      // left: 400, right: 500
}
```

- 드래그 시작: `col-resize` 커서, `user-select: none`
- 드래그 중: `position` 방향에 따라 delta 계산, min/max 클램핑
- 드래그 종료: 커서/선택 복원

### 4.6 NotificationBell

```
src/components/NotificationBell.tsx
```

알림 벨 아이콘 + 드롭다운 목록.

- 미읽음 배지 (9+ 표기)
- 알림 유형별 아이콘: assignment(user), comment_mention(comment), status_change(todo), due_date(clock)
- 클릭 시 읽음 처리 + 관련 프로젝트/태스크로 이동
- "Mark all read" 일괄 읽음 처리
- 30초 자동 새로고침 (`useAutoRefresh`)

### 4.7 GlobalSearch

```
src/components/GlobalSearch.tsx
```

`Cmd+K` 전역 검색 다이얼로그 (Portal 렌더링).

- 검색 대상: 프로젝트, 태스크/항목, 사용자
- 300ms 디바운스, 최소 2자 입력
- 키보드 내비게이션: Arrow Up/Down, Enter, Escape
- 검색어 하이라이트 (`<mark>` 태그)
- 결과 선택 시 해당 페이지로 이동 (태스크의 경우 우측 패널 자동 열림)

### 4.8 ScrollArrowOverlay

```
src/components/ScrollArrowOverlay.tsx
```

스크롤 가능한 컨테이너에 오버레이 화살표/페이드를 표시하는 유틸리티 컴포넌트.

- 수직/수평 방향 지원
- ResizeObserver + MutationObserver로 동적 콘텐츠 변화 감지
- `requestAnimationFrame`으로 성능 최적화

---

## 5. 페이지 컴포넌트 (Page Components)

### 5.1 공개 페이지

| 페이지 | 경로 | 파일 | 설명 |
|--------|------|------|------|
| `HomePage` | `/` | `pages/HomePage.tsx` | 랜딩 페이지 — Sign Up/Sign In CTA |
| `LoginPage` | `/login` | `pages/LoginPage.tsx` | 이메일/비밀번호 로그인, 로그인 후 이전 경로로 복귀 |
| `SignUpPage` | `/signup` | `pages/SignUpPage.tsx` | 회원가입 (이메일 인증) |
| `ResetPasswordPage` | `/reset-password` | `pages/ResetPasswordPage.tsx` | 비밀번호 재설정 |

### 5.2 보호 페이지

| 페이지 | 경로 | 파일 | 주요 훅 | 역할 제한 |
|--------|------|------|---------|----------|
| `DashboardPage` | `/dashboard` | `pages/DashboardPage.tsx` | `useDashboardData`, `useProjects`, `useAutoRefresh` | 모든 사용자 |
| `ProjectListPage` | `/projects` | `pages/ProjectListPage.tsx` | `useProjects`, `useProjectCrud`, `usePreferencesStore` | 모든 사용자 |
| `TasksWorkspacePage` | `/tasks/:projectId/:tab` | `pages/TasksWorkspacePage.tsx` | `useProject`, `useProjectCrud`, `usePreferencesStore` | 모든 사용자 |
| `UsersPage` | `/users/:userId` | `pages/UsersPage.tsx` | `useAuthStore` (직접 Supabase 쿼리) | 모든 사용자 |
| `MyProfilePage` | `/profile` | `pages/MyProfilePage.tsx` | `useAuth`, `useUserManagement`, `useAuthStore` | 모든 사용자 |
| `AuditLogPage` | `/audit` | `pages/AuditLogPage.tsx` | `useAuditLog` | 모든 사용자 |
| `UserSettingsPage` | `/settings/:section` | `pages/UserSettingsPage.tsx` | `usePreferencesStore` | 모든 사용자 |
| `AdminPage` | `/admin/:section` | `pages/AdminPage.tsx` | `useAuthStore`, `useTenantSettings` | admin 전용 (UI 레벨) |

### 5.3 TasksWorkspacePage 탭 구조

`/tasks/:projectId/:tab` — 9개 탭 뷰를 가진 프로젝트 작업 공간.

| 탭 ID | 아이콘 | 라벨 | 피처 컴포넌트 | 설명 |
|--------|--------|------|--------------|------|
| `gantt` | chart | Gantt Chart | `GanttView` | DevExtreme Gantt (기본 뷰) |
| `grid` | detailslayout | Grid | `TasksView` | DataGrid 기반 태스크 목록 |
| `board` | contentlayout | Board | `BoardView` | 칸반 보드 |
| `calendar` | event | Calendar | `CalendarView` | 캘린더 뷰 |
| `comments` | comment | Comments | `CommentsView` | 프로젝트 코멘트 (@mention) |
| `files` | doc | Files | `FilesView` | 파일/문서 관리 |
| `time` | clock | Time | `TimeTrackingView` | 시간 추적 |
| `activity` | fieldchooser | Activity | `ActivityView` | 활동 로그 |
| `settings` | preferences | Settings | `ProjectSettingsView` | 프로젝트 설정 |

- 기본 탭: `usePreferencesStore`의 `defaultView` 설정값 (gantt/board/grid/calendar)
- `gantt`, `grid`, `board`, `files`, `time` 탭은 툴바에 추가 액션 버튼 표시 (Add Task, Upload 등)
- 마지막 방문 프로젝트 ID를 `localStorage` (`nanum-last-project-id`)에 저장

### 5.4 AdminPage 섹션 구조

| 섹션 key | 컴포넌트 | 파일 | 설명 |
|----------|----------|------|------|
| `organization` | `OrganizationSection` | `pages/admin/OrganizationSection.tsx` | 조직명, 도메인 설정 |
| `users` | `UsersSection` | `pages/admin/UsersSection.tsx` | 사용자 관리 (생성, 역할 변경, 비활성화) |
| `security` | `SecuritySection` | `pages/admin/SecuritySection.tsx` | 보안 설정 |
| `appearance` | `AppearanceSection` | `pages/admin/AppearanceSection.tsx` | 브랜딩/외관 설정 |

### 5.5 UserSettingsPage 섹션 구조

| 섹션 key | 컴포넌트 | 파일 | 설명 |
|----------|----------|------|------|
| `appearance` | `AppearanceSettings` | `pages/user-settings/AppearanceSettings.tsx` | 테마, density 설정 |
| `regional` | `RegionalSettings` | `pages/user-settings/RegionalSettings.tsx` | 날짜 형식, 타임존, 주 시작일 |
| `workspace` | `WorkspaceSettings` | `pages/user-settings/WorkspaceSettings.tsx` | 기본 뷰, 사이드바 기본값 |

---

## 6. 피처 모듈 (Feature Modules)

### 6.1 features/gantt

| 파일 | 설명 |
|------|------|
| `GanttView.tsx` | DevExtreme Gantt 컴포넌트 래퍼. 태스크/그룹/마일스톤, 종속성, 리소스 표시 |
| `GanttView.css` | Gantt 스타일링 |

- `useProjectItems` 훅으로 데이터 로드
- `GanttActions` 인터페이스: `addTask()`, `deleteTask()` 외부 호출
- 태스크 선택 시 `setSelectedTaskId` + `setRightPanelOpen(true)`
- `TaskDetailPopup` — Gantt에서 더블클릭 시 팝업으로 태스크 상세 표시
- auto-refresh 30초 (팝업 열려있을 때 일시정지)

### 6.2 features/tasks

| 파일 | 설명 |
|------|------|
| `TasksView.tsx` | DataGrid 기반 태스크 목록 (인라인 편집) |
| `TasksView.css` | Grid 스타일링 |
| `TaskDetailPanel.tsx` | 우측 패널 태스크 상세 (탭 구조) |
| `TaskDetailPanel.css` | 상세 패널 스타일링 |
| `TaskDetailPopup.tsx` | 팝업 기반 태스크 상세 (Gantt에서 사용) |
| `TaskDetailPopup.css` | 팝업 스타일링 |
| `tabs/InfoTab.tsx` | 기본 정보 탭 (이름, 상태, 날짜, 진행률, 담당자) |
| `tabs/ChecklistTab.tsx` | 체크리스트 탭 |
| `tabs/CommentsTab.tsx` | 코멘트 탭 (태스크 단위) |
| `tabs/RelationsTab.tsx` | 관계 탭 (상위/하위, 선행/후행, 링크) |
| `tabs/RelationsTab.css` | 관계 탭 스타일링 |

### 6.3 features/board

| 파일 | 설명 |
|------|------|
| `BoardView.tsx` | 칸반 보드 (status 기반 컬럼: todo → in_progress → review → done) |
| `BoardView.css` | 보드 스타일링 |

- `BoardActions` 인터페이스: `addTask()` 외부 호출
- 드래그&드롭으로 상태 변경

### 6.4 features/calendar

| 파일 | 설명 |
|------|------|
| `CalendarView.tsx` | 캘린더 기반 태스크/마일스톤 표시 |
| `CalendarView.css` | 캘린더 스타일링 |

### 6.5 features/comments

| 파일 | 설명 |
|------|------|
| `CommentsView.tsx` | 프로젝트 단위 코멘트 뷰 (작성/수정/삭제, @mention 자동완성) |
| `CommentsView.css` | 코멘트 스타일링 |

- `useComments` 훅 사용
- @mention: 텍스트에서 `@이름` 패턴 감지 → 드롭다운 선택 → 알림 생성
- 자기 코멘트만 인라인 편집/삭제 가능

### 6.6 features/files

| 파일 | 설명 |
|------|------|
| `FilesView.tsx` | 파일/문서 관리 (업로드, 다운로드, 삭제, 버전 관리) |
| `FilesView.css` | 파일 뷰 스타일링 |

- `FileActions` 인터페이스: `upload()` 외부 호출
- `useDocuments` 훅 사용
- Supabase Storage 기반

### 6.7 features/time-tracking

| 파일 | 설명 |
|------|------|
| `TimeTrackingView.tsx` | 시간 기록 관리 (추가/수정/삭제, 필터링) |
| `TimeTrackingView.css` | 시간 추적 스타일링 |

- `TimeActions` 인터페이스: `logTime()` 외부 호출
- `useTimeEntries` 훅 사용

### 6.8 features/activity

| 파일 | 설명 |
|------|------|
| `ActivityView.tsx` | 프로젝트 활동 로그 타임라인 |
| `ActivityView.css` | 활동 뷰 스타일링 |

- `useActivityLog` 훅 사용

### 6.9 features/settings

| 파일 | 설명 |
|------|------|
| `ProjectSettingsView.tsx` | 프로젝트 설정 (이름, 설명, 상태, 날짜, 멤버 관리, 삭제, 템플릿) |
| `ProjectSettingsView.css` | 설정 뷰 스타일링 |

- `useProjectCrud`, `useProjectMembers` 훅 사용

### 6.10 features/dashboard

| 파일 | 설명 |
|------|------|
| `DashboardGreeting.tsx` | 시간대별 인사 메시지 |
| `DashboardKPIRow.tsx` | KPI 카드 행 (지연, 진행중, 이번 주 마감, 완료율, 내 진행중, 내 마감) |
| `DashboardMyTasks.tsx` | 내 태스크 목록 위젯 |
| `DashboardAtRisk.tsx` | 지연 항목 위젯 |
| `DashboardUpcoming.tsx` | 다가오는 마감 위젯 |
| `DashboardProjectStatus.tsx` | 프로젝트 상태 분포 차트 |
| `DashboardTaskDistribution.tsx` | 태스크 상태 분포 차트 |
| `DashboardActivity.tsx` | 최근 활동 피드 |

- `useDashboardData` 훅에서 모든 데이터 일괄 로드
- 필터: 기간 (all/this_week/this_month/last_30/last_90/this_year) + 프로젝트별
- 60초 자동 새로고침

---

## 7. 데이터 흐름 요약

```
사용자 인증
  ├── Supabase Auth → onAuthStateChange → auth-store (Zustand persist)
  ├── ProtectedRoute → auth-store.isAuthenticated 체크
  └── useAuth hook → signIn/signUp/signOut/resetPassword

데이터 조회
  ├── hooks → supabase client → PostgreSQL (RLS 적용)
  ├── tenant guard: profile?.tenant_id 체크 (deadlock 방지)
  └── 결과 → 컴포넌트 로컬 state 또는 Zustand store

상태 공유
  ├── 인증 정보: auth-store (전역)
  ├── 프로젝트 목록/활성 프로젝트: pm-store (전역)
  ├── 패널 상태: pm-store (전역)
  ├── 환경설정: preferences-store (localStorage + DB)
  └── 피처 데이터: 각 hook의 로컬 state (컴포넌트 스코프)
```
