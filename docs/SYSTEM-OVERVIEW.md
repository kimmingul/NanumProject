# 시스템 개요 (System Overview)

## 1. 프로젝트 목적

NanumProject는 중소형 기업 및 팀을 위한 **멀티테넌트 프로젝트 관리 시스템**이다.
TeamGantt 수준의 Gantt 차트 기반 일정 관리, RBAC 인증/권한 관리, 태스크 추적, 문서 관리, 시간 기록 기능을 제공한다.

- 커스텀 도메인: `https://pm.nanumspace.com`
- TeamGantt에서 데이터 마이그레이션 완료 (368 프로젝트, 15,272 태스크, 43,873 코멘트)

## 2. 기술 스택

| 레이어 | 기술 | 버전 | 설명 |
|--------|------|------|------|
| 프레임워크 | React | 19.x | SPA, Strict Mode |
| 언어 | TypeScript | 5.9 | strict mode, path alias `@/` |
| UI 컴포넌트 | DevExtreme | 25.2.x | Fluent Blue Light 테마, DataGrid/Gantt/Popup 등 |
| Gantt 차트 | devexpress-gantt | 4.1.x | Gantt 뷰 전용 라이브러리 |
| 백엔드/DB | Supabase | 2.49.x | PostgreSQL + Auth + Storage + RLS |
| 상태 관리 | Zustand | 4.5.x | auth-store (persist), pm-store (in-memory) |
| 라우팅 | React Router DOM | 7.x | createBrowserRouter, SPA rewrite |
| 빌드 도구 | Vite | 7.x | HMR, path alias, dev port 5173 |
| 배포 | Vercel | - | master 브랜치 push 시 자동 배포 |
| 기타 | exceljs, file-saver | - | Excel 내보내기 |

## 3. 전체 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│                                                      │
│  React 19 + DevExtreme + React Router DOM            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Zustand   │  │ Hooks    │  │ Features         │   │
│  │ auth-store│  │ useAuth  │  │ gantt, board,    │   │
│  │ pm-store  │  │ useProject│ │ calendar, tasks, │   │
│  │ theme     │  │ useItems │  │ comments, files  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                       │                              │
│                       ▼                              │
│             Supabase JS Client                       │
│             (@supabase/supabase-js)                   │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS (REST + Realtime)
                        ▼
┌───────────────────────────────────────────────────────┐
│                    Supabase Cloud                      │
│                                                        │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐            │
│  │  Auth    │  │ PostgREST │  │ Storage  │            │
│  │ (GoTrue) │  │  (API)    │  │ (S3)     │            │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘           │
│       │              │              │                  │
│       ▼              ▼              ▼                  │
│  ┌─────────────────────────────────────────────────┐  │
│  │              PostgreSQL                          │  │
│  │  RLS (Row Level Security) + RPC Functions        │  │
│  │  테넌트 격리 + RBAC 권한 제어                       │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## 4. 프로젝트 디렉토리 구조

```
NanumProject/
├── src/                        # 프론트엔드 소스 코드
│   ├── main.tsx                # 앱 엔트리 포인트
│   ├── App.tsx                 # AppRouter 렌더링
│   ├── routes/                 # React Router 설정 (ProtectedRoute + IDELayout)
│   ├── components/             # 공유 UI (IDELayout, NavRail, ResizeHandle 등)
│   ├── pages/                  # 라우트 페이지 (Dashboard, Users, Projects 등)
│   ├── features/               # 기능 모듈
│   │   ├── gantt/              # Gantt 차트 뷰
│   │   ├── board/              # 보드 뷰
│   │   ├── calendar/           # 캘린더 뷰
│   │   ├── tasks/              # 태스크 관리 (TreeList, Detail)
│   │   ├── comments/           # 코멘트 (@mention, 알림)
│   │   ├── files/              # 파일/문서 관리
│   │   ├── activity/           # 활동 로그
│   │   ├── dashboard/          # 대시보드 위젯
│   │   ├── time-tracking/      # 시간 추적
│   │   └── settings/           # 설정 기능
│   ├── hooks/                  # 커스텀 훅 (useAuth, useProjectItems 등 21개)
│   ├── lib/                    # 코어 라이브러리
│   │   ├── supabase.ts         # Supabase 클라이언트 (typed singleton)
│   │   ├── auth-store.ts       # 인증 Zustand 스토어 (localStorage persist)
│   │   ├── pm-store.ts         # PM Zustand 스토어 (in-memory)
│   │   ├── theme-store.ts      # 테마 Zustand 스토어 (light/dark/system)
│   │   └── preferences-store.ts# 사용자 환경설정 스토어
│   ├── config/                 # 설정 (Supabase 키, DevExtreme 라이선스)
│   ├── types/                  # TypeScript 타입 (pm.ts, supabase.ts, auth.ts 등)
│   ├── styles/                 # 전역 스타일 (테마 변수, 밀도 설정)
│   └── utils/                  # 유틸리티 함수
├── supabase/
│   ├── migrations/             # SQL 마이그레이션 (001~014)
│   └── DATABASE.md             # DB 스키마 문서
├── migration/                  # TeamGantt 데이터 마이그레이션 도구 (별도 npm 패키지)
├── scripts/                    # 유틸리티 스크립트 (migrate.mjs, patch-dark-theme.py)
├── docs/                       # 프로젝트 문서
│   ├── PRD.md                  # 제품 요구사항
│   ├── PROGRESS.md             # 개발 진행 현황
│   ├── ARCHITECTURE.md         # 시스템 아키텍처
│   ├── SYSTEM-OVERVIEW.md      # 시스템 개요 (본 문서)
│   └── DEPLOYMENT.md           # 배포 가이드
├── index.html                  # SPA 진입점 (DevExtreme 라이선스 inline script)
├── vite.config.ts              # Vite 설정 (path alias @/)
├── tsconfig.json               # TypeScript 프로젝트 참조
├── tsconfig.app.json           # TypeScript 앱 설정 (strict, ES2022)
├── vercel.json                 # Vercel SPA rewrite 설정
├── package.json                # 의존성 및 스크립트
└── .env.example                # 환경 변수 템플릿
```

## 5. 환경 변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | Y |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (클라이언트용) | Y |
| `VITE_DEVEXTREME_KEY` | DevExtreme 상용 라이선스 키 | Y |

> 모든 환경 변수는 `VITE_` 접두사 필수 (Vite 빌드 타임 치환).
> `.env.example`을 복사하여 `.env` 파일 생성 후 실제 값 입력.

## 6. 개발/빌드/배포 명령어

```bash
npm run dev          # Vite 개발 서버 (localhost:5173, HMR)
npm run build        # 프로덕션 빌드 (tsc -b && vite build → dist/)
npm run preview      # 빌드 결과 로컬 미리보기
npm run lint         # ESLint 실행
npx tsc --noEmit     # 타입 체크만 실행
npm run gen:types    # Supabase DB 타입 자동 생성 → src/types/supabase.ts
```

## 7. 관련 문서

| 문서 | 설명 |
|------|------|
| [PRD.md](./PRD.md) | 제품 요구사항 정의 |
| [PROGRESS.md](./PROGRESS.md) | 개발 진행 현황 (Phase별 기록) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 시스템 아키텍처 상세 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 배포 및 환경 설정 가이드 |
| [DATABASE.md](../supabase/DATABASE.md) | 데이터베이스 스키마 문서 |
