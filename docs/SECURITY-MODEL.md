# SECURITY-MODEL.md — 보안 모델

> NanumProject의 인증, 인가, Row Level Security, 테넌트 격리에 대한 보안 설계 문서.

---

## 1. 인증 흐름 (Authentication Flow)

### 1.1 Supabase Auth 기반

Supabase Auth (GoTrue) 서버가 인증을 담당하며, 클라이언트는 `@supabase/supabase-js` SDK를 통해 상호작용한다.

```
사용자 → signInWithPassword() → Supabase Auth → JWT (access_token + refresh_token)
                                                      │
                                                      ▼
                                          localStorage 저장
                                          (sb-<ref>-auth-token)
```

### 1.2 세션 관리

| 항목 | 설정 |
|------|------|
| 세션 저장소 | `window.localStorage` |
| 자동 갱신 | `autoRefreshToken: true` |
| URL 감지 | `detectSessionInUrl: true` (OAuth redirect, password reset) |

**Zustand persist 연동**:

Supabase 세션과 별도로, `auth-store`(Zustand)가 `nanumauth-auth` 키로 localStorage에 `session`, `user`, `profile`을 유지한다. 페이지 새로고침 시:

1. Zustand persist가 localStorage에서 상태 복원 → `isAuthenticated` 즉시 결정 (깜빡임 방지)
2. `useAuth` 훅이 `getSession()`으로 Supabase에 실제 세션 확인
3. `onAuthStateChange` 리스너가 세션 변경(만료, 갱신, 로그아웃) 감지

### 1.3 사용자 생성 흐름

두 가지 경로가 존재한다:

**A. 자가 가입 (Self Sign-up)**:
```
signUp() → auth.users INSERT → handle_new_user 트리거
                                  → Default Tenant에 profiles 행 생성 (role='member')
```

**B. 관리자 초대 (Admin Invite)**:
```
create_tenant_user RPC → auth.users INSERT + auth.identities INSERT
                          → handle_new_user 트리거 → profiles 생성
                          → profiles UPDATE (올바른 tenant_id, role 설정)
```

관리자 초대로 생성된 사용자는 비밀번호가 비어 있으며, 비밀번호 재설정 이메일을 통해 최초 로그인한다.

---

## 2. 역할 체계 (Role System)

### 2.1 테넌트 역할 (profiles.role)

```
admin > manager > member > viewer
```

| 역할 | 설명 | 주요 권한 |
|------|------|-----------|
| `admin` | 테넌트 관리자 | 모든 프로젝트 접근, 사용자 관리, 감사 로그 조회, 역할 변경 |
| `manager` | 프로젝트 매니저 | 일반 사용자와 동일 (현재 추가 서버 권한 없음, UI 레벨 구분용) |
| `member` | 일반 사용자 | 프로젝트 멤버로 등록된 프로젝트에만 접근 |
| `viewer` | 읽기 전용 | 프로젝트 멤버로 등록된 프로젝트 읽기만 가능 |

> **역할 변경 이력**: 006_update_roles.sql에서 `admin/user/developer` → `admin/manager/member/viewer`로 변경됨.

### 2.2 프로젝트 권한 (project_members.permission)

```
admin > edit > own_progress > view
```

| 권한 | 설명 |
|------|------|
| `admin` | 프로젝트 설정, 멤버 관리, 삭제 |
| `edit` | 아이템 CRUD, 담당자 할당, 의존성 편집 |
| `own_progress` | 자신이 담당한 아이템의 진행률 변경 |
| `view` | 읽기 전용 |

`has_project_permission()` 함수는 **상위 호환** 방식으로 동작한다:

```sql
-- admin 권한은 edit, own_progress, view를 모두 포함
permission = 'admin'
OR (p_required IN ('edit', 'own_progress', 'view') AND permission = 'edit')
OR (p_required IN ('own_progress', 'view') AND permission = 'own_progress')
OR (p_required = 'view' AND permission = 'view')
```

---

## 3. RLS 정책 매트릭스

### 3.1 Auth 모듈 테이블

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **tenants** | 자기 tenant | admin | 자기 tenant + admin | 차단 (false) |
| **profiles** | 같은 tenant | 본인 (user_id = auth.uid()) | 본인 또는 tenant admin | tenant admin |
| **applications** | 같은 tenant | admin/developer | admin/developer | admin |
| **audit_logs** | tenant admin | 같은 tenant | 차단 (false) | 차단 (false) |
| **sessions** | 본인 또는 tenant admin | 본인 | 본인 | 본인 |

### 3.2 PM 모듈 테이블

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **projects** | 멤버 OR tenant admin | 같은 tenant | project admin OR tenant admin | project admin OR tenant admin |
| **project_members** | 멤버 OR tenant admin | project admin OR tenant admin | project admin OR tenant admin | project admin OR tenant admin |
| **project_items** | 멤버 OR tenant admin | edit 이상 OR tenant admin | edit 이상 OR tenant admin | edit 이상 OR tenant admin |
| **task_assignees** | 멤버 OR tenant admin | edit 이상 OR tenant admin | edit 이상 OR tenant admin | edit 이상 OR tenant admin |
| **task_dependencies** | 멤버 | edit 이상 | edit 이상 | edit 이상 |
| **item_links** | 멤버 OR tenant admin | edit 이상 OR tenant admin | - | edit 이상 OR tenant admin |
| **comments** | 멤버 | 멤버 | 작성자 본인 | 작성자 OR project admin |
| **documents** | 멤버 | 멤버 | 업로더 OR project admin | 업로더 OR project admin |
| **document_versions** | 멤버 (documents JOIN) | 멤버 (documents JOIN) | - | - |
| **time_entries** | 멤버 | 본인만 | 본인만 | 본인만 |
| **checklist_items** | 멤버 (project_items JOIN) | 멤버 | 멤버 | 멤버 |
| **activity_log** | 멤버 OR admin (project_id NULL) | 같은 tenant | 차단 (false) | 차단 (false) |

### 3.3 Notifications 테이블

| 동작 | 조건 |
|------|------|
| SELECT | 본인 알림만 (`user_id = auth.uid()`) |
| INSERT | 모두 허용 (`WITH CHECK (true)`) — 트리거/SECURITY DEFINER 함수가 삽입 |
| UPDATE | 본인 알림만 |
| DELETE | - (정책 없음) |

---

## 4. 테넌트 Admin Bypass

테넌트 admin (`profiles.role = 'admin'`)은 `project_members`에 등록되지 않아도 테넌트 내 모든 프로젝트 데이터를 조회/수정할 수 있다.

이는 RLS 정책에서 `is_current_user_admin()` 조건을 OR로 추가하여 구현된다:

```sql
-- 전형적인 PM 테이블 SELECT 정책
USING (
  tenant_id = public.get_current_tenant_id()
  AND (
    public.is_project_member(project_id)
    OR public.is_current_user_admin()  -- ← admin bypass
  )
)
```

**예외**: `task_dependencies`와 일부 하위 테이블은 admin bypass가 없으므로, admin이 해당 데이터에 접근하려면 프로젝트 멤버여야 한다.

---

## 5. RLS 헬퍼 함수

모든 헬퍼 함수는 `SECURITY DEFINER`로 정의되어 호출자가 아닌 함수 소유자 권한으로 실행된다. `STABLE` 마크는 동일 트랜잭션 내 결과가 변하지 않음을 보장한다.

### get_current_tenant_id()

```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

현재 인증된 사용자의 `tenant_id`를 반환한다. 거의 모든 RLS 정책의 테넌트 격리 조건에 사용된다.

### is_current_user_admin()

```sql
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

테넌트 admin 여부를 확인한다. Admin bypass 정책과 SECURITY DEFINER RPC 함수의 권한 가드에 사용된다.

### is_project_member(p_project_id)

```sql
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = auth.uid()
          AND is_active = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

현재 사용자가 특정 프로젝트의 활성 멤버인지 확인한다. PM 테이블 SELECT 정책의 기본 조건이다.

### has_project_permission(p_project_id, p_required)

```sql
CREATE OR REPLACE FUNCTION public.has_project_permission(
    p_project_id UUID, p_required member_permission
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = auth.uid()
          AND is_active = true
          AND (
            permission = 'admin'
            OR (p_required IN ('edit','own_progress','view') AND permission = 'edit')
            OR (p_required IN ('own_progress','view') AND permission = 'own_progress')
            OR (p_required = 'view' AND permission = 'view')
          )
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

프로젝트 내 특정 권한 이상을 보유하는지 계층적으로 확인한다. PM 테이블 INSERT/UPDATE/DELETE 정책에 사용된다.

### has_role(required_role)

```sql
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = required_role LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

특정 테넌트 역할 보유 여부를 확인한다. applications 테이블 정책에서 developer 역할 확인에 사용된다.

---

## 6. Storage 보안

### avatars 버킷

| 정책 | 동작 | 조건 |
|------|------|------|
| `avatars_public_read` | SELECT | 모든 사용자 (public bucket) |
| `avatars_tenant_upload` | INSERT | 같은 tenant 폴더만 |
| `avatars_tenant_update` | UPDATE | 같은 tenant 폴더만 |
| `avatars_tenant_delete` | DELETE | 같은 tenant 폴더만 |

경로 패턴: `{tenant_id}/{user_id}.{ext}`

테넌트 격리는 `storage.foldername(name)[1]`로 첫 번째 폴더명을 추출하여 사용자의 `tenant_id`와 비교한다.

### documents 버킷

Private 버킷으로, Supabase Storage API를 통해서만 접근 가능하다.
경로 패턴: `{tenant_id}/{project_id}/{timestamp}_{filename}`

> documents 버킷의 세부 RLS 정책은 마이그레이션에 포함되지 않았으며, Supabase Dashboard에서 별도 설정이 필요할 수 있다.

---

## 7. Supabase Auth 데드락 방지

### 문제

`onAuthStateChange` 콜백 내에서 Supabase 쿼리를 `await`하면 데드락이 발생한다:

```
onAuthStateChange 콜백 실행 중 (initialize lock 보유)
  → await supabase.from('profiles').select(...)
    → 내부적으로 _getAccessToken() 호출
      → getSession() 호출
        → await initializePromise (lock 대기)
          → 데드락!
```

### 해결

```typescript
// DEADLOCK - 절대 하지 말 것
supabase.auth.onAuthStateChange(async (_event, session) => {
  await supabase.from('profiles').select('*');  // ← 데드락
});

// CORRECT - fire-and-forget 패턴
supabase.auth.onAuthStateChange((_event, session) => {
  supabase.from('profiles').select('*').then(({ data }) => { /* ... */ });
});
```

### 데이터 fetching 가드

Supabase 쿼리 전에 `getSession()` 호출을 가드로 사용하지 않는다. Supabase SDK가 내부적으로 `_getAccessToken()`을 통해 인증 토큰을 자동 처리한다.

```typescript
// BAD - getSession()을 가드로 사용
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
await supabase.from('table').select('*');

// GOOD - auth-store의 profile로 가드
const profile = useAuthStore.getState().profile;
if (!profile?.tenant_id) return;
await supabase.from('table').select('*');
```

---

## 8. SECURITY DEFINER 함수 패턴

Admin 전용 RPC 함수는 `SECURITY DEFINER`로 정의하여 함수 소유자(postgres) 권한으로 실행하되, 내부에서 `is_current_user_admin()` 가드를 설치한다.

```sql
CREATE OR REPLACE FUNCTION public.admin_only_function(p_param TEXT)
RETURNS void AS $$
BEGIN
    -- 1) Admin 가드 (필수)
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action';
    END IF;

    -- 2) 비즈니스 로직 (RLS 우회하여 실행)
    UPDATE public.profiles SET role = p_param ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) authenticated 역할에 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.admin_only_function(TEXT) TO authenticated;
```

이 패턴을 사용하는 함수:
- `create_tenant_user` — auth.users/identities 직접 삽입 (SECURITY DEFINER 필수)
- `update_user_role` — 다른 사용자의 profiles 수정
- `deactivate_user` / `reactivate_user` — 다른 사용자의 is_active 변경
- `get_audit_logs` — 감사 로그 조회 (admin 전용)

---

## 참조

- **데이터베이스 가이드**: [`docs/DATABASE-GUIDE.md`](./DATABASE-GUIDE.md) — 테이블 설계, 마이그레이션 이력, RPC 함수 목록
- **DB 스키마 상세**: [`supabase/DATABASE.md`](../supabase/DATABASE.md) — 테이블 관계도, 필드 레벨 상세
- **아키텍처 개요**: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — 시스템 전체 구조
