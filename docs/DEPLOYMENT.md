# 배포 가이드 (Deployment Guide)

## 1. 개발 환경 설정

### 사전 요구사항

| 도구 | 버전 | 설명 |
|------|------|------|
| Node.js | 22.x 이상 | JavaScript 런타임 |
| npm | 10.x 이상 | 패키지 매니저 (Node.js 포함) |
| Git | 최신 | 소스 코드 관리 |

### 초기 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd NanumProject

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

### 환경 변수 (.env)

```bash
# Supabase 프로젝트 URL (https://<project-ref>.supabase.co)
VITE_SUPABASE_URL=your_supabase_project_url

# Supabase anonymous key (클라이언트 사이드용, 공개 가능)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# DevExtreme 상용 라이선스 키
VITE_DEVEXTREME_KEY=your_devextreme_license_key
```

> **중요**: 모든 클라이언트 환경 변수는 `VITE_` 접두사가 필요하다. Vite는 빌드 타임에 `import.meta.env.VITE_*` 값을 정적으로 치환한다. 런타임 환경 변수는 지원하지 않는다.

## 2. Vite 개발 서버

### 실행

```bash
npm run dev
```

- 기본 포트: `http://localhost:5173`
- HMR (Hot Module Replacement) 지원 — 파일 저장 시 즉시 반영
- React Fast Refresh 활성화 (`@vitejs/plugin-react`)

### Path Alias

`vite.config.ts`와 `tsconfig.app.json`에 동일한 alias 설정:

```
@/ → src/
```

사용 예: `import { supabase } from '@/lib/supabase'`

`tsconfig.app.json`에도 동일한 paths가 등록되어 있다 (`@/types/*`, `@/lib/*`, `@/hooks/*` 등).

## 3. 프로덕션 빌드

### 빌드 명령어

```bash
npm run build
```

이 명령은 두 단계를 순차 실행한다:

1. **`tsc -b`** — TypeScript 프로젝트 레퍼런스 기반 타입 체크
2. **`vite build`** — 번들링 + 최적화 → `dist/` 디렉토리 출력

빌드 결과는 `dist/` 디렉토리에 출력된다 (index.html, JS/CSS 번들, 정적 에셋).

- `npm run preview` — 빌드 결과 로컬 미리보기
- `npx tsc --noEmit` — 빌드 없이 타입 체크만 실행

## 4. Vercel 배포

### 자동 배포

- **트리거**: `master` 브랜치에 push 시 Vercel이 자동으로 빌드/배포
- **빌드 명령**: Vercel이 `npm run build` 실행
- **출력 디렉토리**: `dist/`
- **프레임워크 감지**: Vite (자동)

### SPA 라우팅 (vercel.json)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

모든 경로를 `index.html`로 rewrite하여 React Router의 클라이언트 사이드 라우팅을 지원한다. 이 설정이 없으면 새로고침 시 404 에러가 발생한다.

### 커스텀 도메인

프로덕션: `https://pm.nanumspace.com` (Vercel 대시보드 > Domains에서 설정, DNS CNAME 필요)

### 환경 변수 관리

Vercel 환경 변수는 **빌드 타임에 주입**된다. Vercel 대시보드 > Environment Variables에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEVEXTREME_KEY`를 등록한다. **환경 변수 변경 후 반드시 Redeploy 필요** (런타임 치환 불가). Production/Preview/Development 환경별로 다른 값을 설정할 수 있다.

## 5. DevExtreme 라이선스

DevExtreme은 상용 라이선스가 필요하다. 라이선스 키는 두 곳에서 설정된다:

### index.html (인라인 스크립트)

```html
<script>
  window.DevExpress = window.DevExpress || {};
  window.DevExpress.config = { licenseKey: '%VITE_DEVEXTREME_KEY%' };
</script>
```

Vite가 빌드 시 `%VITE_DEVEXTREME_KEY%`를 실제 값으로 치환한다.
이 인라인 스크립트는 JS 번들 로드 전에 실행되어, 비동기 모듈 로드 시에도 라이선스가 적용된다.

### src/config/devextreme.ts (모듈 설정)

```typescript
import config from 'devextreme/core/config';
const DEVEXTREME_KEY = import.meta.env.VITE_DEVEXTREME_KEY || '';
if (DEVEXTREME_KEY) {
  config({ licenseKey: DEVEXTREME_KEY });
}
```

`main.tsx`에서 `import '@/config/devextreme'`로 초기화한다.

### 테마 설정

- 기본 테마: `dx.fluent.blue.light.compact.css`
- 다크 모드: `dx.fluent.blue.dark.compact.css` (동적 전환)
- 테마 전환: `theme-store.ts` (localStorage `nanum-theme` 키)
- FOUC 방지: `index.html` 인라인 스크립트로 초기 테마 적용

## 6. Supabase 설정

### 프로젝트 설정

| 항목 | 값 |
|------|---|
| Site URL | `https://pm.nanumspace.com` |
| Redirect URLs | `http://localhost:5173/**`, `https://pm.nanumspace.com/**` |

Site URL과 Redirect URLs는 Supabase 대시보드 > Authentication > URL Configuration에서 설정한다.

### 인증 및 Storage

- Email 인증 활성화, 비밀번호 재설정 (이메일 기반)
- Session: `localStorage` persist, 자동 토큰 갱신
- `avatars` 스토리지 버킷 (`005_avatars_bucket.sql`)

### DB 타입 자동 생성

```bash
npm run gen:types
```

Supabase CLI를 사용하여 DB 스키마에서 TypeScript 타입을 자동 생성한다 (`src/types/supabase.ts`).

> `SUPABASE_PROJECT_ID` 환경 변수가 필요하다. Supabase CLI가 전역 설치되어 있어야 한다.

### SQL 마이그레이션

마이그레이션 파일은 `supabase/migrations/` 디렉토리에 순차적으로 관리된다:

| 파일 | 설명 |
|------|------|
| `001_auth.sql` | Auth 모듈 (tenants, profiles, RLS, 함수) |
| `002_pm.sql` | PM 모듈 (projects, project_items, comments 등) |
| `003_seed.sql` | 시드 데이터 |
| `004_add_task_status.sql` | 태스크 상태 필드 추가 |
| `005_avatars_bucket.sql` | 아바타 스토리지 버킷 |
| `006_update_roles.sql` | 역할 체계 업데이트 |
| `007_create_tenant_user.sql` | 테넌트 사용자 생성 RPC |
| `008_fix_missing_functions.sql` | 누락 함수 보완 |
| `009_item_links.sql` | 아이템 링크 (의존성) |
| `010_profile_extended_fields.sql` | 프로필 확장 필드 |
| `011_notifications.sql` | 알림 시스템 |
| `012_project_templates.sql` | 프로젝트 템플릿 |
| `013_user_preferences.sql` | 사용자 환경설정 |
| `014_project_manager.sql` | 프로젝트 매니저 필드 |

마이그레이션은 Supabase SQL Editor에서 수동 실행하거나 `scripts/migrate.mjs`를 사용한다:

```bash
npm run migrate
```

## 7. TeamGantt 마이그레이션

`migration/` 디렉토리는 TeamGantt에서 데이터를 추출하여 Supabase로 임포트하는 별도 Node.js 패키지이다.

### 설정

```bash
cd migration
npm install
cp .env.example .env
# .env 편집: Cognito 인증 정보 + Supabase 연결 정보 입력
```

### 주요 명령어

```bash
npm run migrate            # 전체 마이그레이션 (추출 + 임포트)
npm run migrate:discover   # 데이터 탐색만
npm run migrate:verify     # 결과 검증
npm run migrate:resume     # 중단된 마이그레이션 재개
npm run import             # Supabase 임포트
npm run import:clean       # 기존 데이터 삭제 후 재임포트
npm run import:resume      # 중단된 임포트 재개
npm run repair             # 데이터 정합성 복구
```

개별 임포트: `npm run import:users`, `import:projects`, `import:tasks`, `import:comments`, `import:time`

임포트는 10단계 파이프라인으로 실행된다: Users → Projects → Members → Groups → Tasks → Assignees → Dependencies → Comments → Documents → Time Entries.

> 상세 사용법은 `migration/EXTRACTION-GUIDE.md` 및 `migration/AUTHENTICATION-GUIDE.md` 참조.

## 8. 유틸리티 스크립트

| 스크립트 | 설명 |
|---------|------|
| `scripts/migrate.mjs` | SQL 마이그레이션 실행기 |
| `scripts/migrate.ts` | 마이그레이션 실행기 (TypeScript 버전) |
| `scripts/patch-dark-theme.py` | DevExtreme 다크 테마 CSS 패치 |

## 9. 트러블슈팅

| 증상 | 해결 |
|------|------|
| 빌드 타입 오류 | `npx tsc --noEmit`으로 확인. `tsc -b`가 먼저 실행되므로 타입 오류 시 빌드 중단 |
| 환경 변수 미적용 | `.env` 위치 확인, `VITE_` 접두사 확인, 개발 서버 재시작. Vercel은 Redeploy 필요 |
| DevExtreme 라이선스 경고 | `VITE_DEVEXTREME_KEY` 값 확인, 개발 서버 재시작 |
| Supabase Auth 데드락 | `onAuthStateChange` 내 `await` 금지. [ARCHITECTURE.md](./ARCHITECTURE.md) 참조 |

## 10. 관련 문서

| 문서 | 설명 |
|------|------|
| [SYSTEM-OVERVIEW.md](./SYSTEM-OVERVIEW.md) | 시스템 개요 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 시스템 아키텍처 상세 |
| [PRD.md](./PRD.md) | 제품 요구사항 |
| [PROGRESS.md](./PROGRESS.md) | 개발 진행 현황 |
| [DATABASE.md](../supabase/DATABASE.md) | DB 스키마 문서 |
| [migration/EXTRACTION-GUIDE.md](../migration/EXTRACTION-GUIDE.md) | TeamGantt 추출 가이드 |
| [migration/AUTHENTICATION-GUIDE.md](../migration/AUTHENTICATION-GUIDE.md) | TeamGantt 인증 가이드 |
