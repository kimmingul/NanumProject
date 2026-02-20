# 향후 로드맵

NanumProject의 미구현 기능, 기술 부채, 성능/UX 개선 사항을 우선순위별로 정리합니다.

> **관련 문서**: [PROGRESS.md](./PROGRESS.md) — 개발 진행 현황, [PRD.md](./PRD.md) — 원본 요구사항, [ARCHITECTURE.md](./ARCHITECTURE.md) — 시스템 구조

---

## 1. 미구현 기능

### 1.1 Realtime Subscriptions — 폴링 → Supabase Realtime 채널

**현재 상태**: `useAutoRefresh` 훅으로 30~60초 간격 폴링 (project_items, dashboard, notifications)

**목표**: Supabase Realtime `channel.on('postgres_changes', ...)` 으로 전환하여 즉시 반영

**필요한 이유**:
- 폴링은 동시 편집 시 최대 30초 지연 발생 — Gantt/Board에서 다른 사용자의 변경이 즉시 보이지 않음
- 불필요한 네트워크 요청 (변경 없어도 주기적 쿼리)
- Supabase Realtime은 이미 프로젝트에 포함된 기능 (추가 비용 없음)

**예상 작업량**: 중간 (2~3일)
- `useProjectItems`, `useNotifications`, `useDashboardData`에 Realtime 구독 추가
- `channel.subscribe()` / `channel.unsubscribe()` 생명주기 관리
- fallback으로 폴링 유지 (Realtime 연결 실패 시)

---

### 1.2 MFA (Multi-Factor Authentication)

**현재 상태**: 이메일/비밀번호 단일 인증만 지원

**목표**: TOTP (Google Authenticator 등) 및 SMS 인증 추가

**필요한 이유**:
- 임상시험 데이터는 민감 정보 — 의료 규정(HIPAA, GCP 등) 준수 시 MFA 필수
- Supabase Auth에 MFA API가 내장되어 있어 구현 부담 낮음

**예상 작업량**: 중간 (2~3일)
- Supabase `supabase.auth.mfa.enroll()` / `verify()` / `unenroll()` API 연동
- QR 코드 표시 + 확인 코드 입력 UI
- 로그인 플로우에 MFA challenge 단계 추가
- Settings > Security에 MFA 활성화/비활성화 토글

---

### 1.3 Application Management (OAuth2/OIDC)

**현재 상태**: DB에 `applications` 테이블 존재하지만 UI 미구현 (NavRail에서 제거됨)

**목표**: 테넌트별 OAuth2/OIDC 앱 등록/관리 페이지

**필요한 이유**:
- 외부 시스템(EDC, CTMS 등)과의 API 연동 시 OAuth2 클라이언트 필요
- PRD에 명시된 기능이나 현재 우선순위 낮음

**예상 작업량**: 큼 (5~7일)
- Application CRUD UI (DataGrid + Edit Popup)
- Client ID/Secret 생성 로직
- Redirect URI, Allowed Origins 관리
- Token endpoint 구현 (Supabase Edge Function)

---

### 1.4 Resource Management View (리소스 간트)

**현재 상태**: `projects` 테이블에 `in_resource_management` 플래그 존재하지만 뷰 미구현

**목표**: 사용자별 업무 부하를 시각화하는 Resource Gantt 뷰

**필요한 이유**:
- 프로젝트 매니저가 팀원별 할당량을 한눈에 파악 불가
- 과부하/유휴 리소스 식별 어려움

**예상 작업량**: 큼 (5~7일)
- DevExtreme Gantt의 Resource 뷰 활용 또는 커스텀 구현
- 사용자 × 기간 교차 매트릭스
- 할당 시간 대비 가용 시간 계산

---

### 1.5 Report / Dashboard Export (PDF)

**현재 상태**: DataGrid의 Excel 내보내기만 지원 (TasksView)

**목표**: 대시보드, Gantt 차트, 보고서를 PDF로 내보내기

**필요한 이유**:
- 임상시험 보고서/감사 자료로 PDF 제출 필요
- 경영진 보고 시 프로젝트 현황 PDF 제공

**예상 작업량**: 중간 (3~4일)
- `html2canvas` + `jsPDF` 또는 서버사이드 렌더링
- 대시보드/Gantt 페이지에 "Export PDF" 버튼 추가
- 인쇄 최적화 레이아웃

---

### 1.6 Email Notifications (Supabase Edge Functions)

**현재 상태**: 인앱 알림만 지원 (NotificationBell 드롭다운)

**목표**: 중요 이벤트(할당, 기한 임박, @멘션) 시 이메일 발송

**필요한 이유**:
- 앱에 접속하지 않은 사용자에게 알림 전달 불가
- 기한 초과 태스크 사전 경고 필요

**예상 작업량**: 중간 (2~3일)
- Supabase Edge Function으로 이메일 발송 로직 구현
- DB 트리거 → Edge Function 호출 파이프라인
- 이메일 템플릿 (HTML)
- User Settings에 이메일 알림 on/off 토글

---

### 1.7 Mobile Responsive 최적화

**현재 상태**: 대시보드에 반응형 브레이크포인트 있으나, IDE 3-panel 레이아웃은 데스크탑 전용

**목표**: 모바일(< 768px)에서 사용 가능한 레이아웃

**필요한 이유**:
- 현장 모니터링 시 모바일에서 태스크 확인/업데이트 필요
- NavRail + Sidebar가 모바일에서 공간 과다 점유

**예상 작업량**: 큼 (5~7일)
- NavRail → 하단 탭바 전환
- Sidebar → 오버레이 드로어
- Gantt → 리스트 뷰 fallback
- Board → 세로 스크롤 칼럼

---

## 2. 기술 부채

### 2.1 TypeScript 타입 불일치

**문제 1**: `profiles` 확장 필드가 `supabase.ts`에 미반영

Phase 22에서 `profiles` 테이블에 9개 컬럼 추가 (phone, department, position, address, city, state, country, zip_code, bio). 이 필드들이 `src/types/supabase.ts`의 `profiles.Row/Insert/Update`에 포함되어 있지 않음.

**문제 2**: `notifications` 테이블 타입 미정의

`supabase.ts`에 `notifications` 테이블 타입이 없음. `pm.ts`에 `Notification` 인터페이스는 있지만 Supabase Database 타입과 분리되어 있음.

**문제 3**: `task_dependencies.project_id` 스키마 불일치

`pm.ts`의 `TaskDependency` 인터페이스에 `project_id`가 있지만, 실제 DB 테이블에는 `project_id` 컬럼이 존재하지 않을 수 있음 (Phase 20 복구 시 발견).

**문제 4**: `supabase.rpc` 타입 캐스팅

Supabase 생성 타입에서 `Functions: Record<string, never>`로 정의되어 있어, 모든 RPC 호출에 `as unknown as ...` 캐스팅 필요.

```typescript
// 현재 패턴 — 모든 RPC 호출에 반복
const { error } = await (supabase.rpc as unknown as (
  fn: string, params: Record<string, unknown>
) => Promise<{ error: { message: string } | null }>)(fn, params);
```

**해결 방향**:
- `npx supabase gen types` 파이프라인 구축하여 `supabase.ts` 자동 생성
- 또는 수동으로 누락 타입 추가 + RPC 함수 시그니처 정의

**예상 작업량**: 작음 (1일)

---

### 2.2 Supabase Generated Types 자동 동기화

**현재 상태**: `supabase.ts`를 수동 편집. DB 스키마 변경 시 타입 동기화 누락 위험.

**목표**: CI/CD 파이프라인 또는 pre-commit hook에서 `supabase gen types` 자동 실행

**해결 방향**:
- `npx supabase gen types typescript --project-id <id>` 스크립트 추가
- `package.json`에 `gen:types` 스크립트 이미 존재 — CI 통합만 필요
- 생성된 타입과 수동 타입의 병합 전략 결정

**예상 작업량**: 작음 (0.5일)

---

### 2.3 ProjectDetailPage.css의 DX 위젯 오버라이드

**현재 상태**: ~66개의 CSS 오버라이드 규칙 (많은 `!important` 포함). 커스텀 다크 테마 도입 이전에 작성.

**문제**: 커스텀 다크 테마(`dx.fluent.nanum-dark.css`)가 이미 slate 색상을 제공하므로, 다크 모드 오버라이드의 상당수가 이론적으로 불필요. 하지만 라이트 모드에서도 적용되어 완전 제거 시 시각적 차이 발생 가능.

**해결 방향**: 위젯별로 오버라이드를 주석 처리 → 라이트/다크 확인 → 차이 없으면 삭제. 단계적 진행.

**예상 작업량**: 작음 (1일)

---

## 3. 성능 개선

### 3.1 Virtual Scrolling — ProjectSidebarList

**현재 상태**: 전체 프로젝트 목록을 한 번에 렌더링. 현재 368개 프로젝트.

**문제**: 프로젝트 수가 수천 개로 증가 시 사이드바 렌더링 성능 저하

**해결 방향**: DevExtreme `List` 컴포넌트의 `virtualModeEnabled` 또는 `react-window`/`react-virtualized` 적용

**예상 작업량**: 작음 (0.5~1일)

---

### 3.2 Dashboard 쿼리 최적화

**현재 상태**: `useDashboardData` 훅이 4개 병렬 쿼리 그룹 실행 (KPI, Lists, Charts, Activity). 각 그룹 내 다수의 Supabase 쿼리.

**문제**: 프로젝트/태스크가 많아질수록 쿼리 시간 증가. 특히 "Overdue Tasks", "Due This Week" 등 집계 쿼리.

**해결 방향**:
- PostgreSQL Materialized View로 대시보드 집계 사전 계산
- 또는 Supabase RPC 함수로 서버사이드 집계 (단일 쿼리로 KPI 반환)
- Progressive loading은 이미 구현되어 있어, 개별 섹션 지연은 UX에 미치는 영향 제한적

**예상 작업량**: 중간 (2~3일)

---

### 3.3 이미지 Lazy Loading

**현재 상태**: 아바타 이미지에 `loading="lazy"` 미적용

**해결 방향**: `<img loading="lazy" />` 추가 (사이드바 사용자 목록, 대시보드 활동 피드, 코멘트 뷰)

**예상 작업량**: 매우 작음 (0.5일)

---

### 3.4 Gantt 대규모 데이터 최적화

**현재 상태**: 전체 project_items를 한 번에 로드. 1,500+ 아이템 프로젝트에서 초기 로드 지연 가능.

**해결 방향**:
- DevExtreme Gantt의 `lazy loading` 모드 활용 (펼침 시 자식 로드)
- 또는 top-level 그룹만 초기 로드 후 expand 시 자식 fetch

**예상 작업량**: 중간 (2~3일)

---

## 4. UX 개선

### 4.1 Drag & Drop 파일 업로드

**현재 상태**: FilesView에서 "Upload" 버튼 클릭 → 파일 선택 대화상자만 지원

**목표**: 파일을 드래그하여 직접 업로드 영역에 드롭

**해결 방향**: `onDragOver`/`onDrop` 이벤트 핸들러 + 드롭 영역 시각 피드백

**예상 작업량**: 작음 (0.5~1일)

---

### 4.2 Rich Text Editor (코멘트)

**현재 상태**: 코멘트는 plain text (DevExtreme `TextArea`). @멘션 자동완성은 지원하지만 서식 없음.

**목표**: 볼드, 이탤릭, 코드 블록, 링크 등 기본 서식 지원

**해결 방향**:
- DevExtreme `HtmlEditor` 컴포넌트 또는 `tiptap`/`lexical` 에디터
- DB `comments.message` 컬럼을 HTML 또는 Markdown으로 저장
- XSS 방지를 위한 sanitization 필수

**예상 작업량**: 중간 (2~3일)

---

### 4.3 키보드 단축키 확장

**현재 상태**: `Cmd+K` (글로벌 검색) 만 지원

**목표**: 추가 단축키

| 단축키 | 동작 |
|--------|------|
| `Cmd+K` | 글로벌 검색 (구현 완료) |
| `Cmd+N` | 새 태스크 생성 |
| `Cmd+Shift+N` | 새 프로젝트 생성 |
| `Escape` | 패널/팝업 닫기 |
| `1~9` | 워크스페이스 탭 전환 |
| `Cmd+[` / `Cmd+]` | 사이드바 토글 |

**예상 작업량**: 작음 (1일)

---

### 4.4 국제화 (i18n)

**현재 상태**: UI 텍스트가 한국어/영어 혼재 (코드 내 하드코딩)

**목표**: `react-i18next` 또는 유사 라이브러리로 다국어 지원

**필요한 이유**:
- 글로벌 임상시험 시 다국어 팀 협업 필요
- 현재 날짜/인사말은 한국어 고정 (DashboardGreeting)

**예상 작업량**: 큼 (5~7일) — 전체 UI 텍스트 추출 + 번역 파일 구성

---

### 4.5 Undo/Redo 글로벌 지원

**현재 상태**: Gantt 뷰에서만 DevExtreme 내장 Undo/Redo 지원

**목표**: Board, Tasks, Calendar 등에서도 실행 취소/다시 실행

**해결 방향**: 액션 히스토리 스택 + `Cmd+Z` / `Cmd+Shift+Z` 핸들러

**예상 작업량**: 큼 (3~5일)

---

## 5. 우선순위 매트릭스

| 항목 | 영향도 | 작업량 | 우선순위 |
|------|--------|--------|---------|
| Realtime Subscriptions | 높음 | 중간 | **P1** |
| TypeScript 타입 불일치 수정 | 중간 | 작음 | **P1** |
| Supabase 타입 자동 동기화 | 중간 | 작음 | **P1** |
| MFA | 높음 | 중간 | **P2** |
| Email Notifications | 높음 | 중간 | **P2** |
| Dashboard 쿼리 최적화 | 중간 | 중간 | **P2** |
| Virtual Scrolling | 낮음 | 작음 | **P2** |
| 이미지 Lazy Loading | 낮음 | 매우 작음 | **P2** |
| Drag & Drop 파일 업로드 | 낮음 | 작음 | **P3** |
| 키보드 단축키 확장 | 낮음 | 작음 | **P3** |
| CSS 오버라이드 정리 | 낮음 | 작음 | **P3** |
| Report/PDF Export | 중간 | 중간 | **P3** |
| Rich Text Editor | 낮음 | 중간 | **P3** |
| Resource Management View | 중간 | 큼 | **P4** |
| Mobile Responsive | 중간 | 큼 | **P4** |
| Application Management | 낮음 | 큼 | **P4** |
| i18n | 낮음 | 큼 | **P4** |
| Gantt 대규모 최적화 | 낮음 | 중간 | **P4** |
| Undo/Redo 글로벌 | 낮음 | 큼 | **P4** |
