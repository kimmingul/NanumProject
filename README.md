# NanumProject

Gantt 차트 기반 프로젝트 관리 웹앱.

> NOTE: 이 리포지토리는 초기에는 Auth0-like IDaaS(NanumAuth/CoreAuth) 컨셉을 참고했으나,
> TeamGantt 데이터 마이그레이션 이후 **NanumProject(프로젝트/간트 관리)** 가 메인 제품 방향으로 확정되었습니다.
> 인증(Auth)은 NanumProject의 필수 모듈이며, 과거 NanumAuth 문서는 `docs/auth/` 아래에 reference로 보관합니다.

## Tech Stack
- React 19 + Vite + TypeScript
- DevExtreme 25.2.x
- Supabase (Postgres + Auth)
- Vercel (deployment)

## Local Development
```bash
npm install
npm run dev
```

## Docs
- `docs/PRD.md` — NanumProject PRD
- `docs/ARCHITECTURE.md` — Architecture
- `docs/PROGRESS.md` — Progress log
- `docs/auth/` — Reference: NanumAuth/CoreAuth 문서
