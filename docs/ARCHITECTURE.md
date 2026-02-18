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
│   ├── components/          # 공통 UI 컴포넌트
│   │   ├── PMLayout.tsx     #   PM 페이지 공통 레이아웃 (헤더, 네비게이션)
│   │   ├── ProtectedRoute.tsx #  인증 가드
│   │   └── MainLayout.tsx   #   기본 레이아웃
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── HomePage.tsx     #   랜딩 페이지
│   │   ├── LoginPage.tsx    #   로그인
│   │   ├── SignUpPage.tsx   #   회원가입
│   │   ├── ResetPasswordPage.tsx # 비밀번호 재설정
│   │   ├── DashboardPage.tsx #  대시보드 (통계 카드)
│   │   ├── UsersPage.tsx    #   사용자 관리 (DataGrid)
│   │   ├── ProjectListPage.tsx # 프로젝트 목록 (DataGrid + CRUD)
│   │   └── ProjectDetailPage.tsx # 프로젝트 상세 (탭 기반)
│   ├── features/            # 기능 모듈 (프로젝트 상세 탭)
│   │   ├── gantt/GanttView.tsx     # DevExtreme Gantt 차트
│   │   ├── tasks/TasksView.tsx     # TreeList 기반 태스크 목록
│   │   ├── comments/CommentsView.tsx # 코멘트 뷰
│   │   └── settings/ProjectSettingsView.tsx # 프로젝트 설정
│   ├── hooks/               # React 커스텀 훅
│   │   ├── useAuth.ts       #   인증 상태 + 로그인/로그아웃
│   │   ├── useProjects.ts   #   프로젝트 목록 조회
│   │   ├── useProject.ts    #   단일 프로젝트 조회
│   │   ├── useProjectCrud.ts #  프로젝트 생성/수정/삭제
│   │   ├── useProjectItems.ts # 태스크/의존성/리소스 조회
│   │   ├── useProjectMembers.ts # 프로젝트 멤버 관리
│   │   └── useComments.ts   #   코멘트 CRUD
│   ├── lib/                 # 코어 라이브러리
│   │   ├── supabase.ts      #   Supabase 클라이언트 (typed + untyped)
│   │   ├── auth-store.ts    #   Zustand 인증 스토어 (persistent)
│   │   └── pm-store.ts      #   Zustand PM 스토어 (in-memory)
│   ├── types/               # TypeScript 타입 정의
│   │   ├── pm.ts            #   PM 모듈 타입 (11개 엔티티 + enum)
│   │   ├── database.ts      #   Auth 모듈 타입 (Tenant, Profile 등)
│   │   ├── auth.ts          #   인증 관련 타입
│   │   └── supabase.ts      #   Supabase 생성 타입
│   ├── config/              # 설정
│   │   ├── index.ts         #   Supabase URL/Key, 앱 정보
│   │   └── devextreme.ts    #   DevExtreme 라이선스, 테마
│   ├── routes/index.tsx     # 라우터 설정 (12개 라우트)
│   ├── App.tsx              # 루트 컴포넌트
│   └── main.tsx             # 엔트리포인트
├── supabase/                # DB 스키마 & 마이그레이션
│   ├── migrations/
│   │   ├── 001_auth.sql     #   Auth 모듈 (테이블 + RLS + 트리거 + 함수)
│   │   └── 002_pm.sql       #   PM 모듈 (Enum + 테이블 + RLS + 트리거)
│   ├── COMPLETE_MIGRATION.sql    # Auth 모듈 통합 SQL
│   ├── COMPLETE_PM_MIGRATION.sql # PM 모듈 통합 SQL
│   └── DATABASE.md          # DB 스키마 문서
├── migration/               # TeamGantt 마이그레이션 도구 (별도 npm 패키지)
│   ├── src/
│   │   ├── api/             #   TeamGantt API 클라이언트 (Cognito 인증)
│   │   ├── extractors/      #   데이터 추출 모듈
│   │   ├── importers/       #   Supabase 임포트 모듈 (10단계)
│   │   └── utils/           #   로거, Rate Limiter, 프로그레스
│   └── package.json
├── scripts/                 # 빌드/유틸 스크립트
├── docs/                    # 개발 문서
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
- 테넌트 admin (`profiles.role = 'admin'`): project_members 등록 없이 모든 프로젝트 접근
- 프로젝트 권한 계층: `admin > edit > own_progress > view`
- `is_active` 필드로 소프트 삭제 (프로젝트 상태 `status`와 독립)

## 4. 라우팅

| 경로 | 페이지 | 인증 |
|------|--------|------|
| `/` | 랜딩 페이지 | - |
| `/login` | 로그인 | - |
| `/signup` | 회원가입 | - |
| `/reset-password` | 비밀번호 재설정 | - |
| `/dashboard` | 대시보드 (통계) | 필요 |
| `/dashboard/users` | 사용자 관리 | 필요 |
| `/projects` | 프로젝트 목록 | 필요 |
| `/projects/:id` | 프로젝트 상세 (기본: gantt) | 필요 |
| `/projects/:id/:tab` | 프로젝트 상세 탭 (gantt/tasks/comments/files/settings) | 필요 |

## 5. 상태 관리

| 스토어 | 라이브러리 | 영속성 | 내용 |
|--------|-----------|--------|------|
| `auth-store` | Zustand | localStorage | user, session, profile, isAuthenticated |
| `pm-store` | Zustand | in-memory | projects[], activeProject |

## 6. 환경 변수

```env
VITE_SUPABASE_URL=          # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY=     # Supabase Anonymous Key
VITE_DEVEXTREME_KEY=        # DevExtreme 라이선스 키
```
