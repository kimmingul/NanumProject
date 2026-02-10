# NanumProject Architecture

## 1) Tech Stack
- **Frontend:** React 19 + Vite + TypeScript
- **Routing:** React Router
- **UI Library:** DevExtreme 25.2.3 (Fluent theme)
- **State:** Zustand
- **Backend:** Supabase (PostgreSQL, Auth, Storage/Functions optional)
- **Deployment:** Vercel

## 2) High-level 구조
- 웹앱(React)이 Supabase(PostgREST/Auth)를 사용하여 프로젝트/태스크 데이터를 읽고 쓴다.
- 인증은 Supabase Auth를 사용하고, 프론트는 세션을 유지(persistSession)한다.

## 3) 데이터/보안 원칙
- 모든 핵심 테이블에 `tenant_id` 필드를 포함한다.
- 모든 테이블에 RLS(Row Level Security)를 적용하여 테넌트 격리를 강제한다.
- 프론트에서 Supabase anon key로 접근하더라도, 실제 접근 권한은 RLS 정책으로 통제한다.

## 4) 주요 도메인(예상)
- tenants / profiles
- projects / tasks / project_members
- (optional) audit_logs
