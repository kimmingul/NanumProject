---
name: browser-test
description: Chrome DevTools MCP를 사용하여 현재 브라우저 페이지를 테스트
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__click, mcp__chrome-devtools__fill, mcp__chrome-devtools__fill_form, mcp__chrome-devtools__hover, mcp__chrome-devtools__press_key, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__wait_for, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__list_pages, mcp__chrome-devtools__select_page, mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__get_console_message, mcp__chrome-devtools__list_network_requests, mcp__chrome-devtools__get_network_request
---

# Browser Test

Chrome DevTools MCP를 활용하여 현재 브라우저 페이지를 인터랙티브하게 테스트합니다.

## 테스트 대상: $ARGUMENTS

## 실행 절차

1. **페이지 상태 확인**
   - `list_pages`로 열린 페이지 확인
   - `take_snapshot`으로 현재 페이지 구조 파악

2. **기능 테스트**
   - 사용자가 지정한 기능/시나리오를 단계별로 수행
   - 각 단계마다 `take_snapshot`으로 상태 변화 확인
   - 필요 시 `take_screenshot`으로 시각적 확인

3. **에러 확인**
   - `list_console_messages` (types: error, warn)로 콘솔 에러 확인
   - `list_network_requests`로 실패한 API 호출 확인
   - 실패한 요청은 `get_network_request`로 상세 내용 확인

4. **결과 보고**
   - 성공/실패 항목 정리
   - 발견된 에러나 이슈 보고
   - 필요 시 코드 수정 제안

## 주의사항
- DevExtreme 컴포넌트의 드롭다운/팝업은 verbose snapshot이 필요할 수 있음
- Supabase RPC 404 에러 → DB에 함수 미생성 또는 파라미터명 불일치 가능성
- 네트워크 요청 실패 시 Response Body의 `code`, `message`, `details` 확인
