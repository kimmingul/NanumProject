---
name: ui-design
description: UI/UX 디자인 및 레이아웃 설계 — DevExtreme 컴포넌트 기반
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__resize_page, mcp__chrome-devtools__emulate, mcp__claude_ai_DevExpressDocs__devexpress_docs_search, mcp__claude_ai_DevExpressDocs__devexpress_docs_get_content
---

# UI/UX Design

DevExtreme + React 기반 UI/UX 설계 및 구현을 수행합니다.

## 디자인 대상: $ARGUMENTS

## 설계 프로세스

### 1. 현재 UI 분석
- 기존 페이지/컴포넌트의 패턴 파악 (스냅샷/스크린샷)
- 프로젝트 CSS 컨벤션 확인 (`src/pages/*.css`, `src/components/`)
- DevExtreme 테마: Fluent Blue Light

### 2. 레이아웃 설계
ASCII 목업으로 레이아웃 제안:
```
┌─ Header ──────────────────────────────┐
│ Title              [Action] [Action]  │
├───────────────────────────────────────┤
│ Content Area                          │
│                                       │
└───────────────────────────────────────┘
```

### 3. 컴포넌트 선택
DevExtreme 공식 문서(`devexpress_docs_search`)를 참조하여 최적의 컴포넌트 선택:
- 데이터 테이블 → DataGrid
- 폼 입력 → TextBox, SelectBox, DateBox, NumberBox
- 레이아웃 → Popup, TabPanel, Accordion
- 차트 → Chart, PieChart
- 네비게이션 → TreeView, Menu, Tabs

### 4. 디자인 시스템 규칙

**색상 팔레트:**
- Primary: DevExtreme Fluent Blue (#337ab7 계열)
- 배경: #f8fafc (light gray), white
- 텍스트: #1e293b (dark), #64748b (secondary)
- Success: #059669 / #d1fae5
- Error: #dc2626 / #fee2e2
- Warning: #d97706 / #fef3c7
- Info: #2563eb / #dbeafe

**간격 & 크기:**
- 페이지 패딩: 2rem
- 카드 패딩: 1.5rem, border-radius: 8px, box-shadow: 0 1px 3px rgba(0,0,0,0.1)
- 배지: padding 0.25rem 0.75rem, border-radius: 12px, font-size 0.8rem

**타이포그래피:**
- h1: 1.75rem, font-weight 700, color #1e293b
- body: 0.95rem
- label: 0.85rem, font-weight 600, color #374151

### 5. 반응형 확인
- Chrome DevTools MCP의 `resize_page`/`emulate`로 다양한 뷰포트 테스트
- IDE-style 3-panel 레이아웃 고려 (좌측 패널 접힘 시)

### 6. 구현
- 컴포넌트 TSX + CSS 파일 생성
- 기존 패턴 따라 일관된 스타일링
- DevExtreme 위젯은 반드시 공식 React wrapper 사용
