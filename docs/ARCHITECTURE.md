# 시스템 아키텍처

## 1. Tech Stack
- **Frontend:** React 19+ (Vite/Next.js), TypeScript 7.0+
- **UI Library:** DevExtreme 25.2.3 (Fluent Theme)
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **IDE:** Visual Studio 2026 (Copilot AI Native)
- **Deployment:** Vercel

## 2. 데이터베이스 구조 (Supabase)
- `public.tenants`: 테넌트(고객사) 정보 관리.
- `public.profiles`: 테넌트별 사용자 상세 정보 (Auth.users와 연동).
- `public.applications`: 테넌트별 등록된 앱 설정.

## 3. 보안 원칙
- 모든 테이블에 `tenant_id` 필드 포함 및 RLS 적용.
- API 통신 시 JWT(JSON Web Token) 검증 필수.