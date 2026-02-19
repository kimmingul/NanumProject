---
description: Supabase DB 마이그레이션 및 RPC 작성 규칙
globs:
  - "supabase/**/*.sql"
  - "src/hooks/use*.ts"
---

# Supabase Rules

## SQL Migration Files
- 파일명: `NNN_description.sql` (3자리 숫자 prefix, 순차적)
- 상단에 주석으로 파일 설명 + "Run in Supabase SQL Editor" 안내
- `CREATE OR REPLACE FUNCTION` 사용 (idempotent)
- Admin-only 함수는 `SECURITY DEFINER` + `is_current_user_admin()` guard
- 함수 생성 후 반드시 `GRANT EXECUTE ON FUNCTION ... TO authenticated;`

## RPC Parameter Convention
- SQL 파라미터: `p_` prefix (e.g., `p_user_id`, `p_new_role`)
- TypeScript RPC 호출 시 파라미터 이름은 **SQL과 정확히 동일**해야 함
- PostgREST는 이름 기반 매칭 — 이름 불일치 시 404 에러 발생

```typescript
// SQL: create_tenant_user(p_email TEXT, p_full_name TEXT, p_role TEXT)
await supabase.rpc('create_tenant_user', {
  p_email: email,      // ✅ SQL 파라미터명과 동일
  p_full_name: name,   // ✅
  p_role: role,         // ✅
});
```

## RLS 정책
- 모든 테이블에 `tenant_id` 기반 격리 필수
- SELECT: `get_current_tenant_id()` 또는 `is_project_member()` 사용
- INSERT/UPDATE/DELETE: 적절한 권한 체크 (`has_project_permission()`, `is_current_user_admin()`)

## Auth Deadlock Prevention
- `onAuthStateChange` 콜백 내에서 Supabase 쿼리 절대 `await` 금지
- 데이터 fetching guard: `profile?.tenant_id` 사용 (NOT `getSession()`)
