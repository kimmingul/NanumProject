---
name: db-migrate
description: Supabase SQL 마이그레이션 파일 생성 및 관련 문서 업데이트
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# DB Migration

Supabase SQL 마이그레이션 파일을 생성하고 관련 문서를 업데이트합니다.

## 마이그레이션 내용: $ARGUMENTS

## 실행 절차

### 1. 현재 마이그레이션 번호 확인
```bash
ls supabase/migrations/
```
마지막 번호 + 1로 새 파일 생성.

### 2. SQL 파일 생성
`supabase/migrations/NNN_description.sql` 형식으로 작성:

```sql
-- NNN_description.sql
-- 설명
-- Run in Supabase SQL Editor

-- 1) 변경 내용
CREATE OR REPLACE FUNCTION public.function_name(p_param TYPE)
RETURNS RETURN_TYPE AS $$
BEGIN
    -- admin guard (필요 시)
    IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
    -- logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) 권한 부여
GRANT EXECUTE ON FUNCTION public.function_name(TYPE) TO authenticated;
```

### 3. TypeScript 훅 업데이트
RPC 함수가 추가되었으면 `src/hooks/` 관련 훅에 호출 함수 추가.
파라미터명은 SQL과 정확히 동일하게 (`p_` prefix).

### 4. 문서 업데이트
- `supabase/DATABASE.md` — Migration 파일 목록, 함수 테이블, 실행 순서 업데이트
- `docs/ARCHITECTURE.md` — migration 목록 업데이트 (해당 시)

### 5. 사용자 안내
생성된 SQL 파일 경로와 Supabase SQL Editor에서 실행 안내 메시지 출력.

## SQL 작성 규칙
- `CREATE OR REPLACE` 사용 (idempotent)
- 파라미터: `p_` prefix (e.g., `p_user_id UUID`)
- Admin 함수: `SECURITY DEFINER` + `is_current_user_admin()` guard
- 반드시 `GRANT EXECUTE ... TO authenticated`
- RLS 정책 추가 시 `tenant_id` 기반 격리
