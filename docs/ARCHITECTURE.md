# 시스템 아키텍처

## 1. Tech Stack

| 영역 | 기술 | 버전 |
|------|------|------|
| Frontend | React + TypeScript (strict) | React 19, TS 5.9 |
| UI Library | DevExtreme (Fluent Blue Light) | 25.2.3 |
| Gantt | devexpress-gantt | 4.1.65 |
| Backend/DB | Supabase (PostgreSQL + Auth) | supabase-js 2.x |
| State | Zustand (auth: persistent, pm: in-memory) | 4.5 |
| Routing | React Router DOM | 7.x |
| Build | Vite | 7.x |
| Lint | ESLint + typescript-eslint | 9.x |

## 2. 프로젝트 구조

```
NanumProject/
├── src/
│   ├── components/            # 공통 UI 컴포넌트
│   │   ├── IDELayout.tsx      #   3-Panel CSS Grid 쉘 (left/center/right)
│   │   ├── IDEHeader.tsx      #   40px 슬림 헤더 (네비, 검색, 유저)
│   │   ├── LeftPanel.tsx      #   좌측 패널 (대시보드 네비 / 프로젝트 트리)
│   │   ├── RightPanel.tsx     #   우측 패널 (태스크 상세 인라인)
│   │   ├── ResizeHandle.tsx   #   4px 드래그 핸들 (패널 리사이즈)
│   │   └── ProtectedRoute.tsx #   인증 가드 + 리다이렉트
│   ├── pages/                 # 페이지 컴포넌트
│   │   ├── HomePage.tsx       #   랜딩 페이지
│   │   ├── LoginPage.tsx      #   로그인
│   │   ├── SignUpPage.tsx     #   회원가입
│   │   ├── ResetPasswordPage.tsx # 비밀번호 재설정
│   │   ├── DashboardPage.tsx  #   대시보드 (통계 카드)
│   │   ├── UsersPage.tsx      #   사용자 관리 (DataGrid + Edit/Add User Popup)
│   │   ├── AuditLogPage.tsx   #   감사 로그 뷰어
│   │   ├── ProjectListPage.tsx #  프로젝트 목록 (DataGrid + CRUD)
│   │   └── ProjectDetailPage.tsx # 프로젝트 상세 (탭 기반)
│   ├── features/              # 기능 모듈 (프로젝트 상세 탭)
│   │   ├── gantt/GanttView.tsx        # DevExtreme Gantt 차트
│   │   ├── tasks/TasksView.tsx        # TreeList 기반 태스크 목록
│   │   ├── tasks/TaskDetailPanel.tsx  # 태스크 상세 인라인 패널 (RightPanel용)
│   │   ├── board/BoardView.tsx        # Kanban 보드 (Sortable)
│   │   ├── calendar/CalendarView.tsx  # Scheduler 캘린더 뷰
│   │   ├── comments/CommentsView.tsx  # 코멘트 뷰
│   │   ├── files/FilesView.tsx        # 파일 관리
│   │   ├── activity/ActivityView.tsx  # 활동 로그 타임라인
│   │   ├── time-tracking/TimeTrackingView.tsx # 시간 추적
│   │   └── settings/ProjectSettingsView.tsx   # 프로젝트 설정
│   ├── hooks/                 # React 커스텀 훅
│   │   ├── useAuth.ts         #   인증 상태 + 로그인/로그아웃
│   │   ├── useUserManagement.ts # 사용자 관리 (프로필 수정, 아바타, 비활성화, 생성)
│   │   ├── useProjects.ts     #   프로젝트 목록 조회
│   │   ├── useProject.ts      #   단일 프로젝트 조회
│   │   ├── useProjectCrud.ts  #   프로젝트 생성/수정/삭제
│   │   ├── useProjectItems.ts #   태스크/의존성/리소스 조회
│   │   ├── useProjectMembers.ts #  프로젝트 멤버 관리
│   │   ├── useComments.ts     #   코멘트 CRUD
│   │   ├── useDocuments.ts    #   문서 CRUD, 버전 관리
│   │   ├── useActivityLog.ts  #   활동 로그 조회
│   │   ├── useAuditLog.ts     #   감사 로그 조회
│   │   ├── useTimeEntries.ts  #   시간 기록 CRUD
│   │   └── useChecklist.ts    #   체크리스트 CRUD + 토글
│   ├── lib/                   # 코어 라이브러리
│   │   ├── supabase.ts        #   Supabase 클라이언트 (typed)
│   │   ├── auth-store.ts      #   Zustand 인증 스토어 (persistent)
│   │   └── pm-store.ts        #   Zustand PM 스토어 (in-memory)
│   ├── types/                 # TypeScript 타입 정의
│   │   ├── pm.ts              #   PM 모듈 타입 (11개 엔티티 + enum)
│   │   ├── database.ts        #   Auth 모듈 타입 (Tenant, Profile 등)
│   │   ├── auth.ts            #   인증 관련 타입
│   │   └── supabase.ts        #   Supabase 생성 타입
│   ├── config/                # 설정
│   │   ├── index.ts           #   Supabase URL/Key, 앱 정보
│   │   └── devextreme.ts      #   DevExtreme 라이선스, 테마
│   ├── routes/index.tsx       # 라우터 설정 (IDELayout + Outlet 중첩)
│   ├── App.tsx                # 루트 컴포넌트
│   └── main.tsx               # 엔트리포인트
├── supabase/                  # DB 스키마 & 마이그레이션
│   ├── migrations/
│   │   ├── 001_auth.sql       #   Auth 모듈 (테이블 + RLS + 트리거 + 함수)
│   │   ├── 002_pm.sql         #   PM 모듈 (Enum + 테이블 + RLS + 트리거)
│   │   ├── 004_add_task_status.sql # task_status enum + 컬럼 추가
│   │   ├── 005_avatars_bucket.sql  # avatars Storage 버킷 + RLS
│   │   ├── 006_update_roles.sql    # Role 체계 변경 (admin/manager/member/viewer)
│   │   └── 007_create_tenant_user.sql # handle_new_user 수정 + create_tenant_user RPC
│   ├── COMPLETE_MIGRATION.sql     # Auth 모듈 통합 SQL
│   ├── COMPLETE_PM_MIGRATION.sql  # PM 모듈 통합 SQL
│   └── DATABASE.md            # DB 스키마 문서
├── migration/                 # TeamGantt 마이그레이션 도구 (별도 npm 패키지)
│   ├── src/
│   │   ├── api/               #   TeamGantt API 클라이언트 (Cognito 인증)
│   │   ├── extractors/        #   데이터 추출 모듈
│   │   ├── importers/         #   Supabase 임포트 모듈 (10단계)
│   │   └── utils/             #   로거, Rate Limiter, 프로그레스
│   └── package.json
├── scripts/                   # 빌드/유틸 스크립트
├── docs/                      # 개발 문서
└── package.json
```

## 3. 데이터베이스 구조

> 상세 스키마: `supabase/DATABASE.md`

### Auth 모듈 (5개 테이블)
`tenants` → `profiles` → `applications` → `audit_logs` → `sessions`

### PM 모듈 (11개 테이블)

```
projects ──┬── project_members ──→ auth.users
           │
           ├── project_items (self-ref: parent_id, item_type: group|task|milestone)
           │       ├── task_assignees ──→ auth.users
           │       ├── task_dependencies (predecessor/successor)
           │       ├── time_entries
           │       └── checklist_items
           │
           ├── comments (target_type: project|item)
           └── documents → document_versions
```

**핵심 설계: `project_items` 통합 테이블**
- `item_type` (group/task/milestone)으로 구분
- `parent_id` 자기참조로 트리 구조
- DevExtreme Gantt에 최적화된 단일 계층 구조

### 보안 체계 (RLS)

- 모든 테이블에 `tenant_id` 기반 Row Level Security
- 테넌트 역할 체계: `admin` / `manager` / `member` / `viewer`
- 테넌트 admin (`profiles.role = 'admin'`): project_members 등록 없이 모든 프로젝트 접근
- 프로젝트 권한 계층: `admin > edit > own_progress > view`
- `is_active` 필드로 소프트 삭제 (프로젝트 상태 `status`와 독립)
- Storage: `avatars` 버킷 (public read, 같은 tenant만 upload/delete)

## 4. 라우팅

| 경로 | 페이지 | 인증 |
|------|--------|------|
| `/` | 랜딩 페이지 | - |
| `/login` | 로그인 | - |
| `/signup` | 회원가입 | - |
| `/reset-password` | 비밀번호 재설정 | - |
| `/dashboard` | 대시보드 (통계) | 필요 |
| `/dashboard/users` | 사용자 관리 | 필요 |
| `/dashboard/audit` | 감사 로그 뷰어 | 필요 |
| `/projects` | 프로젝트 목록 | 필요 |
| `/projects/:id` | 프로젝트 상세 (기본: gantt) | 필요 |
| `/projects/:id/:tab` | 프로젝트 상세 탭 (gantt/tasks/board/calendar/comments/files/time/activity/settings) | 필요 |

모든 인증 필요 라우트는 `ProtectedRoute > IDELayout > Outlet` 중첩 구조.

## 5. 상태 관리

| 스토어 | 라이브러리 | 영속성 | 내용 |
|--------|-----------|--------|------|
| `auth-store` | Zustand | localStorage (`nanumauth-auth`) | user, session, profile, isAuthenticated, isLoading |
| `pm-store` | Zustand | in-memory | projects[], activeProject, 패널 상태 (left/right open/width), selectedTaskId |

### 새로고침 시 인증 복원 흐름

```
1. zustand persist → localStorage에서 session/profile 복원
2. auth-store merge → isAuthenticated=true, isLoading=false (즉시)
3. ProtectedRoute → 인증됨으로 판단, 자식 렌더링
4. Supabase GoTrueClient._initialize() → navigator.locks 획득 후 세션 복원
5. 데이터 fetching 훅 → Supabase 쿼리 (내부적으로 initializePromise 대기 후 실행)
```

## 6. Supabase Auth 주의사항

### onAuthStateChange 콜백 내 Supabase 쿼리 금지

Supabase JS v2는 `_initialize()` 실행 중 `navigator.locks`를 보유한 상태에서 `onAuthStateChange` 콜백을 호출한다. 이 콜백 안에서 Supabase 쿼리를 `await`하면 **데드락**이 발생한다:

- Supabase 쿼리 → `_getAccessToken()` → `getSession()` → `await initializePromise`
- `initializePromise`는 `_initialize()` 완료를 기다림
- `_initialize()`는 콜백 완료를 기다림 → **데드락**

```typescript
// ❌ 데드락 발생
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await supabase.from('profiles').select('*').eq('user_id', session.user.id);
  }
});

// ✅ fire-and-forget으로 호출
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    supabase.from('profiles').select('*').eq('user_id', session.user.id)
      .then(({ data }) => { /* ... */ });
  }
});
```

### 데이터 fetching 시 getSession() guard 불필요

Supabase 클라이언트는 쿼리 실행 시 `_getAccessToken()`을 통해 자동으로 auth 토큰을 포함한다. 별도의 `getSession()` guard는 불필요하며, 초기화 지연 시 불필요한 대기를 유발할 수 있다. `auth-store`의 `profile.tenant_id` 등으로 guard하는 것이 적절하다.

## 7. 환경 변수

```env
VITE_SUPABASE_URL=          # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY=     # Supabase Anonymous Key
VITE_DEVEXTREME_KEY=        # DevExtreme 라이선스 키
```

## 8. UI 컴포넌트 컨벤션

모든 버튼은 DevExtreme `<Button>` 컴포넌트를 사용한다 (네이티브 `<button>` 사용 금지):

```tsx
// Primary action
<Button text="New Project" icon="plus" type="default" stylingMode="contained" onClick={handler} />

// Secondary action
<Button text="Cancel" stylingMode="outlined" onClick={handler} />

// Icon-only action
<Button icon="trash" stylingMode="text" hint="Delete" onClick={handler} />
```

- DevExtreme React `<Button>`은 `cssClass`가 아닌 **`className`**으로 커스텀 CSS 클래스 적용
- CSS 셀렉터는 `.dx-button.class-name` 패턴 사용 (예: `.dx-button.ide-header-btn`)

## 9. DevExtreme 라이센스 설정

DevExtreme 라이선스 키는 `index.html`의 인라인 `<script>`에서 설정한다:

```html
<script>
  window.DevExpress = window.DevExpress || {};
  window.DevExpress.config = { licenseKey: '%VITE_DEVEXTREME_KEY%' };
</script>
```

**`config()` 함수 대신 `window.DevExpress.config`을 사용하는 이유:**

Vite 프로덕션 번들러가 `devextreme/core/config` import를 비동기 preload 패턴(`.then()`)으로 변환하여, `config({licenseKey})` 호출이 위젯 초기화 **이후에** 실행된다. 반면 `window.DevExpress.config`은:
1. 인라인 `<script>`로 모듈 스크립트보다 먼저 동기 실행됨
2. Vite가 빌드 시 `%VITE_DEVEXTREME_KEY%`를 실제 값으로 치환함
3. DevExtreme의 `m_config.js`가 초기화 시 `typeof DevExpress !== "undefined" && DevExpress.config` 체크로 자동 감지

> `src/config/devextreme.ts`의 `config({licenseKey})` 호출은 fallback으로 유지하되, 실제 라이선스 적용은 `index.html`에서 이루어진다.

## 10. Vercel 배포

- **URL**: https://nanum-project-nu.vercel.app/
- **Production branch**: `master`
- **빌드 커맨드**: `tsc -b && vite build` (package.json `build` 스크립트)
- **SPA 라우팅**: `vercel.json`에 `{ "source": "/(.*)", "destination": "/index.html" }` 리라이트 규칙
- **환경변수**: Vercel Settings > Environment Variables에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEVEXTREME_KEY` 설정 (All Environments)
- **주의**: Vite 환경변수는 **빌드 타임**에 치환되므로, 환경변수 변경 후 반드시 **Redeploy** 필요
