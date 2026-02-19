---
name: review
description: 코드 리뷰 — 보안, 성능, 패턴 준수, 버그 탐지
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# Code Review

코드를 체계적으로 리뷰하여 버그, 보안 이슈, 패턴 위반을 찾습니다.

## 리뷰 대상: $ARGUMENTS

## 리뷰 체크리스트

### Security
- [ ] Supabase RPC 호출 시 파라미터명 SQL과 일치 여부
- [ ] RLS 정책으로 tenant 격리 보장
- [ ] Admin-only 함수에 `is_current_user_admin()` guard
- [ ] XSS: 사용자 입력이 `dangerouslySetInnerHTML` 없이 렌더링
- [ ] 민감 정보 (.env, API keys) 코드에 하드코딩 없음
- [ ] Storage 접근: tenant_id 기반 경로 검증

### Supabase Patterns
- [ ] `onAuthStateChange` 내 Supabase 쿼리 await 없음 (deadlock)
- [ ] 데이터 fetching guard: `profile?.tenant_id` 사용
- [ ] RPC 파라미터: `p_` prefix, SQL 함수와 이름 동일
- [ ] 에러 처리: `if (error) throw error` 패턴

### React/TypeScript
- [ ] `useCallback` deps 완전성 (ESLint exhaustive-deps)
- [ ] `useEffect` cleanup 필요 여부 (subscriptions, timers)
- [ ] TypeScript strict: `any` 사용 없음
- [ ] 컴포넌트 import 경로: `@/` alias 사용
- [ ] DevExtreme: `<Button>` 사용 (네이티브 `<button>` 금지)

### Performance
- [ ] 불필요한 리렌더 방지 (Zustand selector 사용)
- [ ] 대량 데이터: DataGrid 가상 스크롤 / 페이징
- [ ] 이미지: 적절한 크기, lazy loading
- [ ] Supabase 쿼리: 필요한 컬럼만 select

### Code Quality
- [ ] 프로젝트 컨벤션 준수 (파일명, 구조, 스타일)
- [ ] 중복 코드 없음
- [ ] 에러 메시지가 사용자 친화적
- [ ] 적절한 로딩/에러 상태 UI

## 결과 보고 형식

```
## Review: [파일명]

### CRITICAL (즉시 수정 필요)
- [이슈 설명 + 파일:라인 + 수정 방안]

### WARNING (수정 권장)
- [이슈 설명 + 파일:라인 + 수정 방안]

### SUGGESTION (개선 고려)
- [이슈 설명 + 파일:라인 + 제안]

### GOOD (잘한 점)
- [칭찬할 패턴/구현]
```
