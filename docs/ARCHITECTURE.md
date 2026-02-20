# 시스템 아키텍처 — 문서 인덱스

> 이 문서는 NanumProject의 개발 문서 인덱스입니다.
> 각 영역별 상세 문서를 참조하세요.

## 문서 맵

| 문서 | 설명 |
|------|------|
| [SYSTEM-OVERVIEW.md](./SYSTEM-OVERVIEW.md) | 시스템 개요, 기술 스택, 디렉토리 구조, 환경 변수, 명령어 |
| [FRONTEND-ARCHITECTURE.md](./FRONTEND-ARCHITECTURE.md) | 라우팅, 레이아웃 시스템, Zustand 상태 관리, 컴포넌트 계층 |
| [HOOKS-REFERENCE.md](./HOOKS-REFERENCE.md) | 21개 커스텀 훅 API 레퍼런스 (시그니처, 테이블, 사용처) |
| [DATABASE-GUIDE.md](./DATABASE-GUIDE.md) | DB 설계 원칙, 마이그레이션, RPC 함수, 트리거, Enum |
| [SECURITY-MODEL.md](./SECURITY-MODEL.md) | 인증 흐름, 역할 체계, RLS 정책, Auth 데드락 방지 |
| [UI-DESIGN-SYSTEM.md](./UI-DESIGN-SYSTEM.md) | CSS 변수, 테마 시스템, DevExtreme 가이드, 반응형 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 개발 환경, 빌드, Vercel 배포, Supabase 설정 |
| [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) | 미구현 기능, 기술 부채, 성능/UX 개선 계획 |

## 기타 문서

| 문서 | 설명 |
|------|------|
| [PROGRESS.md](./PROGRESS.md) | 개발 진행 히스토리 (Phase 1–38) |
| [PRD.md](./PRD.md) | 제품 요구사항 정의서 |
| [CUSTOM-THEME.md](./CUSTOM-THEME.md) | DevExtreme 다크 테마 커스터마이징 가이드 |
| [../supabase/DATABASE.md](../supabase/DATABASE.md) | DB 스키마 상세 (테이블, 컬럼, 타입, RLS) |

## Quick Reference

### 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19 + TypeScript 5.9 (strict) |
| UI | DevExtreme 25.x (Fluent Blue Light) |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| State | Zustand (auth: persistent, pm: in-memory) |
| Build/Deploy | Vite 7 → Vercel (auto-deploy on master) |

### 핵심 설계 결정

- **`project_items` 통합 테이블** — group/task/milestone을 단일 테이블에서 parent_id 트리로 관리 (DevExtreme Gantt 최적화)
- **멀티테넌시** — 모든 테이블에 `tenant_id` + RLS 정책으로 데이터 격리
- **IDE-style 레이아웃** — NavRail + ContextSidebar + MainContent + RightPanel 3-panel 구조
- **Auth 데드락 방지** — `onAuthStateChange` 콜백에서 Supabase 쿼리 `await` 금지 ([상세](./SECURITY-MODEL.md))

### 명령어

```bash
npm run dev        # 개발 서버 (localhost:5173)
npm run build      # 프로덕션 빌드 (tsc -b && vite build)
npm run lint       # ESLint
npx tsc --noEmit   # 타입 체크
```
