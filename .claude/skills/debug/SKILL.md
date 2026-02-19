---
name: debug
description: 버그 진단 및 수정 — 브라우저, Supabase, React 전 레이어
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__click, mcp__chrome-devtools__fill, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__wait_for, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__get_console_message, mcp__chrome-devtools__list_network_requests, mcp__chrome-devtools__get_network_request
---

# Debug

버그를 체계적으로 진단하고 수정합니다.

## 버그 내용: $ARGUMENTS

## 진단 프로세스

### 1. 증상 확인
- 브라우저 콘솔 에러 확인: `list_console_messages(types: ["error", "warn"])`
- 네트워크 실패 확인: `list_network_requests(resourceTypes: ["xhr", "fetch"])`
- 실패한 요청 상세: `get_network_request(reqid)` → Response Body 확인
- UI 상태 확인: `take_snapshot` / `take_screenshot`

### 2. 에러 유형별 진단

#### Supabase RPC 404
```
PGRST202: Could not find the function public.X(param) in the schema cache
```
- **원인 1**: DB에 함수 미생성 → SQL 마이그레이션 실행 필요
- **원인 2**: 파라미터명 불일치 → TypeScript와 SQL 파라미터명 비교
- **확인**: `supabase/migrations/` 에서 함수 정의 검색

#### Supabase RPC 403 / RLS 위반
```
new row violates row-level security policy
```
- RLS 정책 확인 (SELECT/INSERT/UPDATE/DELETE 별도)
- `tenant_id` 필터 확인
- `profiles.role` 권한 레벨 확인

#### Auth Deadlock (빈 화면, 무한 로딩)
- `onAuthStateChange` 콜백 내 `await` 있는지 확인
- `getSession()` guard 사용 여부 확인
- 해결: fire-and-forget 패턴, `profile?.tenant_id` guard

#### React 렌더링 에러
- 컴포넌트 트리에서 에러 위치 추적
- `useEffect` deps 확인 (무한 루프 가능성)
- undefined/null 접근 확인

#### TypeScript 빌드 에러
```bash
npx tsc --noEmit  # 타입 에러 확인
npm run build     # 빌드 에러 확인
```

### 3. 수정 및 검증
1. 원인 파악 후 최소한의 코드 수정
2. `npm run build` 빌드 확인
3. 브라우저에서 동일 시나리오 재현 테스트
4. 콘솔/네트워크 에러 없음 확인

### 4. 회귀 방지
- 발견된 패턴을 `rules/` 또는 `MEMORY.md`에 기록
- 유사 코드에서 동일 패턴 검색하여 일괄 수정

## 자주 발생하는 버그 패턴

| 증상 | 원인 | 해결 |
|------|------|------|
| RPC 404 | 함수 미생성 or 파라미터명 불일치 | SQL 실행 or 파라미터명 수정 |
| 데이터 미로딩 | Auth deadlock | fire-and-forget 패턴 |
| 저장 실패 | RLS 정책 위반 | tenant_id/role 확인 |
| 무한 로딩 | useEffect deps 문제 | deps 배열 수정 |
| 빈 드롭다운 | items 배열 미전달 | dataSource/items 확인 |
