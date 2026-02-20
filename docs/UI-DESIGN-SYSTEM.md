# UI 디자인 시스템

NanumProject의 CSS 변수 체계, 테마 시스템, DevExtreme 컴포넌트 가이드, 반응형 레이아웃 규칙을 정리한 문서입니다.

> **관련 문서**: [CUSTOM-THEME.md](./CUSTOM-THEME.md) — DevExtreme 커스텀 다크 테마 상세, [ARCHITECTURE.md](./ARCHITECTURE.md) — 전체 시스템 구조

---

## 1. CSS 변수 시스템

모든 앱 스타일은 `src/styles/theme-variables.css`에 정의된 CSS 커스텀 프로퍼티를 사용합니다. 하드코딩된 색상은 Phase 25에서 전면 제거되었습니다.

### 1.1 레이아웃 (Layout)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--layout-bg` | `#f8fafc` | `#0f172a` | 전체 페이지 배경 |

### 1.2 헤더 (Header — 40px)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--header-bg` | `#ffffff` | `#0f172a` | 헤더 배경 |
| `--header-text` | `#1e293b` | `#e2e8f0` | 헤더 텍스트 |
| `--header-border` | `#e2e8f0` | `#1e293b` | 하단 보더 |
| `--header-search-bg` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` | 검색 트리거 배경 |
| `--header-search-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` | 검색 트리거 보더 |
| `--header-search-text` | `#94a3b8` | `#64748b` | 검색 placeholder |
| `--header-search-kbd-bg` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` | 키보드 힌트 배경 |
| `--header-search-kbd-border` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.15)` | 키보드 힌트 보더 |
| `--header-search-kbd-text` | `#94a3b8` | `#64748b` | 키보드 힌트 텍스트 |
| `--header-user-name` | `#475569` | `#cbd5e1` | 사용자 이름 |
| `--header-user-caret` | `#94a3b8` | `#64748b` | 드롭다운 캐럿 |
| `--header-user-hover-bg` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.08)` | 유저 영역 호버 |

### 1.3 NavRail (48px 고정)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--nav-rail-bg` | `#1e293b` | `#020617` | NavRail 배경 (항상 어두운 톤) |
| `--nav-rail-border` | `#334155` | `#1e293b` | 우측 보더 |
| `--nav-rail-icon` | `#94a3b8` | `#64748b` | 기본 아이콘 |
| `--nav-rail-icon-hover` | `#e2e8f0` | `#e2e8f0` | 호버 아이콘 |
| `--nav-rail-icon-active` | `#f1f5f9` | `#f1f5f9` | 활성 아이콘 |
| `--nav-rail-hover-bg` | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.1)` | 호버 배경 |
| `--nav-rail-active-bg` | `rgba(255,255,255,0.15)` | `rgba(255,255,255,0.15)` | 활성 배경 |

### 1.4 사이드바 (Sidebar)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--sidebar-bg` | `#ffffff` | `#1e293b` | 사이드바 배경 |
| `--sidebar-border` | `#e2e8f0` | `#334155` | 보더/구분선 |
| `--sidebar-text` | `#475569` | `#cbd5e1` | 기본 텍스트 |
| `--sidebar-title` | `#94a3b8` | `#64748b` | 섹션 타이틀 |
| `--sidebar-icon` | `#64748b` | `#94a3b8` | 기본 아이콘 |
| `--sidebar-icon-hover` | `#1e293b` | `#e2e8f0` | 호버 아이콘 |
| `--sidebar-hover-bg` | `#f1f5f9` | `#334155` | 호버 배경 |
| `--sidebar-active-bg` | `#eff6ff` | `rgba(99,102,241,0.15)` | 활성 배경 |
| `--sidebar-active-text` | `#2563eb` | `#818cf8` | 활성 텍스트 |

### 1.5 콘텐츠 (Content)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--bg-primary` | `#ffffff` | `#0f172a` | 기본 배경 |
| `--bg-secondary` | `#f8fafc` | `#1e293b` | 보조 배경 |
| `--text-primary` | `#1e293b` | `#f1f5f9` | 본문 텍스트 |
| `--text-secondary` | `#64748b` | `#94a3b8` | 보조 텍스트 |
| `--text-tertiary` | `#94a3b8` | `#64748b` | 비활성 텍스트 |
| `--border-color` | `#e2e8f0` | `#334155` | 기본 보더 |
| `--border-color-strong` | `#d1d5db` | `#475569` | 강조 보더 |
| `--hover-bg` | `#f1f5f9` | `#334155` | 호버 배경 |

### 1.6 배지 (Badges)

| 변수 | Light | Dark | 의미 |
|------|-------|------|------|
| `--badge-success-bg/text` | `#d1fae5` / `#059669` | `rgba(5,150,105,0.2)` / `#34d399` | 성공/완료 |
| `--badge-warning-bg/text` | `#fef3c7` / `#d97706` | `rgba(217,119,6,0.2)` / `#fbbf24` | 경고/보류 |
| `--badge-info-bg/text` | `#dbeafe` / `#2563eb` | `rgba(37,99,235,0.2)` / `#60a5fa` | 정보/진행 |
| `--badge-danger-bg/text` | `#fee2e2` / `#dc2626` | `rgba(220,38,38,0.2)` / `#f87171` | 위험/에러 |
| `--badge-neutral-bg/text` | `#f1f5f9` / `#64748b` | `rgba(100,116,139,0.2)` / `#94a3b8` | 중립/기본 |
| `--badge-purple-bg/text` | `#f3e8ff` / `#9333ea` | `rgba(147,51,234,0.2)` / `#c084fc` | 보라/특별 |

### 1.7 카드, 폼, 알림, 액센트

| 변수 그룹 | 주요 변수 | 용도 |
|-----------|----------|------|
| Cards | `--card-bg`, `--card-shadow`, `--card-border` | 대시보드/보드 카드 |
| Forms | `--form-label`, `--input-border` | 입력 폼 |
| Alerts | `--alert-error-*`, `--alert-success-*`, `--alert-info-*` | 알림 메시지 |
| Accent | `--accent-color` (`#667eea` / `#818cf8`), `--accent-shadow`, `--accent-bg-subtle` | 브랜드 강조색 |
| Links | `--link-color`, `--link-hover-color` | 앵커 링크 |
| Spinner | `--spinner-border`, `--spinner-active` | 로딩 스피너 |
| Avatar | `--avatar-gradient` | 프로필 아바타 그라데이션 |

### 1.8 DataGrid

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--grid-header-bg` | `#f8fafc` | `#1e293b` | 헤더 행 배경 |
| `--grid-border` | `#e2e8f0` | `#334155` | 그리드 보더 |
| `--grid-alt-row-bg` | `#f8fafc` | `rgba(255,255,255,0.02)` | 교대 행 배경 |

### 1.9 아이템 타입, 보드, 역할, 상태 색상

| 변수 그룹 | 변수 | Light | Dark | 의미 |
|-----------|------|-------|------|------|
| Item Type | `--type-group-color` | `#3b82f6` | `#60a5fa` | 그룹(폴더) |
| | `--type-task-color` | `#22c55e` | `#4ade80` | 태스크 |
| | `--type-milestone-color` | `#f59e0b` | `#fbbf24` | 마일스톤 |
| Board Col | `--board-col-todo` | `#94a3b8` | `#94a3b8` | To Do |
| | `--board-col-progress` | `#3b82f6` | `#60a5fa` | In Progress |
| | `--board-col-review` | `#f59e0b` | `#fbbf24` | Review |
| | `--board-col-done` | `#22c55e` | `#4ade80` | Done |
| Role | `--role-admin-color` | `#dc2626` | `#f87171` | Admin |
| | `--role-manager-color` | `#2563eb` | `#60a5fa` | Manager |
| | `--role-member-color` | `#16a34a` | `#4ade80` | Member |
| | `--role-viewer-color` | `#94a3b8` | `#94a3b8` | Viewer |
| Status | `--status-dot-active` | `#22c55e` | `#4ade80` | Active |
| | `--status-dot-on-hold` | `#f59e0b` | `#fbbf24` | On Hold |
| | `--status-dot-complete` | `#3b82f6` | `#60a5fa` | Complete |
| | `--status-dot-archived` | `#94a3b8` | `#94a3b8` | Archived |

### 1.10 글로벌 검색 (Cmd+K)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--search-overlay-bg` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | 백드롭 |
| `--search-dialog-bg` | `#ffffff` | `#1e293b` | 다이얼로그 배경 |
| `--search-dialog-shadow` | `0 16px 70px rgba(0,0,0,0.2)` | `...0.5` | 다이얼로그 그림자 |
| `--search-input-text` | `#1e293b` | `#f1f5f9` | 검색 입력 텍스트 |
| `--search-item-hover-bg` | `#f1f5f9` | `#334155` | 결과 항목 호버 |
| `--search-item-active-bg` | `rgba(102,126,234,0.08)` | `rgba(129,140,248,0.12)` | 결과 항목 활성 |
| `--search-highlight-bg` | `#fef08a` | `rgba(250,204,21,0.3)` | 검색어 하이라이트 |
| `--search-footer-bg` | `#f8fafc` | `rgba(0,0,0,0.2)` | 하단 힌트 배경 |

### 1.11 알림 (Notifications)

| 변수 | Light | Dark | 용도 |
|------|-------|------|------|
| `--notification-bg` | `#ffffff` | `#1e293b` | 드롭다운 배경 |
| `--notification-hover-bg` | `#f1f5f9` | `#334155` | 항목 호버 |
| `--notification-unread-bg` | `#eff6ff` | `rgba(99,102,241,0.1)` | 읽지 않음 배경 |
| `--notification-badge-bg` | `#ef4444` | `#ef4444` | 알림 뱃지 (빨강) |
| `--notification-icon-assignment` | `#3b82f6` | `#60a5fa` | 할당 아이콘 |
| `--notification-icon-comment` | `#8b5cf6` | `#a78bfa` | 코멘트 아이콘 |
| `--notification-icon-status` | `#22c55e` | `#4ade80` | 상태 변경 아이콘 |
| `--notification-icon-due` | `#f59e0b` | `#fbbf24` | 기한 아이콘 |

### 1.12 보드 카드, 대시보드 통계

| 변수 그룹 | 변수 | 용도 |
|-----------|------|------|
| Board Card | `--board-card-overdue` / `--board-card-due-soon` / `--board-card-critical-border` | 기한 초과/임박/중요 |
| Dashboard Stat | `--stat-projects-bg/icon` | 프로젝트 수 KPI |
| | `--stat-tasks-bg/icon` | 태스크 수 KPI |
| | `--stat-completed-bg/icon` | 완료율 KPI |
| | `--stat-members-bg/icon` | 멤버 수 KPI |

---

## 2. Light / Dark 테마

### 2.1 테마 전환 메커니즘

```
[사용자 클릭 / System preference]
    → preferences-store (theme: 'light' | 'dark' | 'system')
    → html[data-theme="dark"] 속성 설정
    → CSS 변수 자동 전환 (theme-variables.css)
    → DevExtreme CSS 전환 (theme-store.ts)
```

- `theme-store.ts`가 `<link>` 태그로 DevExtreme CSS를 동적 추가/제거
- `html.theme-transition` 클래스로 0.3s 전환 애니메이션 제공
- 설정은 `preferences-store`(localStorage `nanum-preferences`)에 영구 저장 + DB 동기화

### 2.2 2층 테마 구조

```
Layer 1: DevExtreme Theme CSS (위젯 스타일링)
  ├── Light: dx.fluent.blue.light.compact.css (stock, main.tsx에서 static import)
  └── Dark:  dx.fluent.nanum-dark.css (custom, <link> 태그로 동적 로드)

Layer 2: App CSS Variables (레이아웃 스타일링)
  └── theme-variables.css
      ├── :root { ... }         ← Light 기본값
      └── [data-theme="dark"] { ... }  ← Dark 오버라이드
```

### 2.3 색상 팔레트 기준

모든 색상은 **Tailwind CSS Slate 팔레트**를 기반으로 합니다:

```
Slate-950: #020617    Slate-50:  #f8fafc
Slate-900: #0f172a    Slate-100: #f1f5f9
Slate-800: #1e293b    Slate-200: #e2e8f0
Slate-700: #334155    Slate-300: #cbd5e1
Slate-600: #475569    Slate-400: #94a3b8
Slate-500: #64748b
```

Dark 모드에서 배경 → Slate-900/800, 텍스트 → Slate-100/200, 보더 → Slate-700/600.

---

## 3. 커스텀 다크 테마

DevExtreme의 stock Fluent Blue Dark 테마는 neutral gray (#292929, #616161 등)를 사용하여 앱의 Slate 톤과 시각적 부조화를 일으킵니다. 이를 해결하기 위해 Python 스크립트로 커스텀 다크 테마를 생성합니다.

### 3.1 생성 절차

```bash
python3 scripts/patch-dark-theme.py
```

### 3.2 처리 단계

1. **색상 교체**: 56개 neutral gray → Tailwind Slate 매핑 (hex, rgb, rgba 3가지 형식, 총 803건)
2. **보더 두께**: `border: 2px` → `1px` (58건, border-radius 제외)
3. **폰트 경로**: `icons/` → `devextreme/dist/css/icons/` (Vite resolve용)
4. **헤더 주석**: 파일 상단에 생성 정보 삽입

### 3.3 주요 색상 매핑

| 계층 | Stock Gray | Slate | 용도 |
|------|-----------|-------|------|
| 기본 배경 | `#1f1f1f` | `#0f172a` (Slate-900) | 페이지/위젯 배경 |
| 컴포넌트 배경 | `#292929` | `#1e293b` (Slate-800) | 카드/패널 |
| 호버 | `#3d3d3d` | `#334155` (Slate-700) | 호버/활성 |
| 보더 | `#616161` | `#4b5e78` | 구분선 |
| 비활성 텍스트 | `#757575` | `#64748b` (Slate-500) | 아이콘 |
| 보조 텍스트 | `#adadad` | `#a8b6c8` | 라벨 |

### 3.4 업그레이드 시

DevExtreme 버전 업데이트 후 스크립트 재실행 필요. 자세한 절차는 [CUSTOM-THEME.md](./CUSTOM-THEME.md) 7번 섹션 참조.

---

## 4. Density 시스템

### 4.1 모드 전환

- **Compact** (기본): DevExtreme 기본 compact 테마 간격
- **Normal**: `html.density-normal` 클래스 추가 시 활성화

설정: User Settings > Appearance > Density (Compact / Normal)

### 4.2 `density-normal.css` 오버라이드

`src/styles/density-normal.css` 파일이 다음 요소의 간격을 증가시킵니다:

| 대상 | Compact 기본 | Normal |
|------|-------------|--------|
| DataGrid 행 패딩 | ~6px 8px | 9px 12px |
| DataGrid 헤더 패딩 | ~6px 8px | 9px 12px |
| TextEditor 최소 높이 | ~30px | 36px |
| Button 최소 높이/패딩 | ~30px / 4px 12px | 36px / 6px 16px |
| TreeList 행 패딩 | ~5px 8px | 8px 10px |
| SelectBox 최소 높이 | ~30px | 36px |
| List 아이템 패딩 | ~8px 10px | 10px 14px |
| Toolbar 최소 높이 | ~36px | 40px |
| 사이드바 아이템 패딩 | ~6px 10px | 8px 12px |
| 워크스페이스 탭 버튼 | ~30px | 36px |

---

## 5. DevExtreme 컴포넌트 가이드

### 5.1 Button

```tsx
import { Button } from 'devextreme-react/button';

// Primary
<Button text="Action" icon="plus" type="default" stylingMode="contained" />

// Secondary
<Button text="Cancel" stylingMode="outlined" />

// Icon-only
<Button icon="trash" stylingMode="text" hint="Delete" />
```

**규칙**:
- 네이티브 `<button>` 사용 금지 — 반드시 DevExtreme `<Button>` 사용
- CSS 클래스: `className` prop 사용 (NOT `cssClass`)
- CSS 셀렉터: `.dx-button.custom-class` 패턴

### 5.2 DataGrid

```tsx
import DataGrid, { Column, Paging, FilterRow } from 'devextreme-react/data-grid';

<DataGrid
  dataSource={data}
  keyExpr="id"
  showBorders={true}
>
  <Column dataField="name" caption="Name" dataType="string" />
  <Column dataField="status" caption="Status" dataType="string" />
  <FilterRow visible={true} />
  <Paging pageSize={10} />
</DataGrid>
```

**규칙**:
- `keyExpr` 항상 지정 (보통 `"id"`)
- `dataSource`에 typed 배열 전달
- 컬럼에 `dataField`, `caption`, `dataType` 명시
- 날짜 컬럼: `format` 속성에 `getDxDateFormat()` 유틸리티 사용

### 5.3 SelectBox

```tsx
import { SelectBox } from 'devextreme-react/select-box';

<SelectBox
  items={options}
  value={selected}
  onValueChanged={(e) => setSelected(e.value)}
  displayExpr="label"
  valueExpr="value"
/>
```

### 5.4 Popup

```tsx
import { Popup } from 'devextreme-react/popup';

<Popup
  visible={showPopup}
  onHiding={() => setShowPopup(false)}
  title="Edit Item"
  width={720}
  maxHeight="85vh"
  hideOnOutsideClick={true}
  showCloseButton={true}
  dragEnabled={true}
/>
```

### 5.5 CSS Override 패턴

DevExtreme 위젯 스타일 오버라이드 시 `.container .dx-widget` 패턴으로 specificity 확보:

```css
/* DataGrid 배경 오버라이드 */
.workspace-content .dx-datagrid { background-color: var(--sidebar-bg); }
.workspace-content .dx-datagrid-headers td { background-color: var(--sidebar-bg) !important; }

/* Gantt 배경 오버라이드 */
.workspace-content .dx-gantt { background-color: var(--sidebar-bg); }

/* TreeList 배경 오버라이드 */
.workspace-content .dx-treelist { background-color: var(--sidebar-bg); }

/* Scheduler 배경 오버라이드 */
.workspace-content .dx-scheduler { background-color: var(--sidebar-bg); }
```

`ProjectDetailPage.css`에 ~66개의 DX 위젯 오버라이드가 있으며, CSS 변수를 통해 라이트/다크 모두 대응합니다.

---

## 6. 아이콘 / 배지 체계

### 6.1 역할 배지 (Role Badge)

```css
.sidebar-user-role.role-color-admin   { color: var(--role-admin-color); }   /* 빨강 */
.sidebar-user-role.role-color-manager { color: var(--role-manager-color); }  /* 파랑 */
.sidebar-user-role.role-color-member  { color: var(--role-member-color); }   /* 초록 */
.sidebar-user-role.role-color-viewer  { color: var(--role-viewer-color); }   /* 회색 */
```

### 6.2 상태 배지 (Status Badge)

프로젝트 상태와 태스크 상태 모두 동일한 배지 시스템을 사용:

```css
/* 프로젝트 상태 */
.status-active   { background: var(--badge-success-bg); color: var(--badge-success-text); }
.status-on_hold  { background: var(--badge-warning-bg); color: var(--badge-warning-text); }
.status-complete { background: var(--badge-info-bg);    color: var(--badge-info-text); }
.status-archived { background: var(--badge-neutral-bg); color: var(--badge-neutral-text); }

/* 태스크 상태 */
.status-todo        { background: var(--badge-neutral-bg); color: var(--badge-neutral-text); }
.status-in_progress { background: var(--badge-info-bg);    color: var(--badge-info-text); }
.status-review      { background: var(--badge-warning-bg); color: var(--badge-warning-text); }
.status-done        { background: var(--badge-success-bg); color: var(--badge-success-text); }
```

### 6.3 아이템 타입 아이콘

| 타입 | DevExtreme 아이콘 | 색상 변수 | Light | Dark |
|------|-------------------|-----------|-------|------|
| Group | `dx-icon-folder` | `--type-group-color` | `#3b82f6` | `#60a5fa` |
| Task | `dx-icon-detailslayout` | `--type-task-color` | `#22c55e` | `#4ade80` |
| Milestone | `dx-icon-event` | `--type-milestone-color` | `#f59e0b` | `#fbbf24` |

### 6.4 아이템 타입 배지

```css
.type-group     { background: var(--badge-info-bg);    color: var(--badge-info-text); }
.type-task      { background: var(--badge-success-bg); color: var(--badge-success-text); }
.type-milestone { background: var(--badge-warning-bg); color: var(--badge-warning-text); }
```

### 6.5 상태 도트

사이드바 프로젝트 목록에서 8px 원형 도트로 프로젝트 상태를 표시:

```css
.sidebar-status-dot.status-dot-active   { background-color: var(--status-dot-active); }
.sidebar-status-dot.status-dot-on_hold  { background-color: var(--status-dot-on-hold); }
.sidebar-status-dot.status-dot-complete { background-color: var(--status-dot-complete); }
.sidebar-status-dot.status-dot-archived { background-color: var(--status-dot-archived); }
```

### 6.6 알림 타입 아이콘

| 타입 | 아이콘 | 배경/색상 |
|------|--------|-----------|
| assignment | `dx-icon-user` | `rgba(59,130,246,0.1)` / `--notification-icon-assignment` |
| comment_mention | `dx-icon-comment` | `rgba(139,92,246,0.1)` / `--notification-icon-comment` |
| status_change | `dx-icon-check` | `rgba(34,197,94,0.1)` / `--notification-icon-status` |
| due_date | `dx-icon-clock` | `rgba(245,158,11,0.1)` / `--notification-icon-due` |

### 6.7 워크스페이스 탭 아이콘 색상

각 뷰 탭에 고유한 아이콘 색상을 부여합니다:

| 탭 | CSS 클래스 | 기본 색상 | 활성 색상 |
|----|-----------|----------|----------|
| Gantt | `.tab-gantt` | `#818cf8` | `#a5b4fc` |
| Grid | `.tab-grid` | `#22d3ee` | `#67e8f9` |
| Board | `.tab-board` | `#c084fc` | `#d8b4fe` |
| Calendar | `.tab-calendar` | `#fb923c` | `#fdba74` |
| Comments | `.tab-comments` | `#4ade80` | `#86efac` |
| Files | `.tab-files` | `#fbbf24` | `#fde047` |
| Time | `.tab-time` | `#f472b6` | `#f9a8d4` |
| Activity | `.tab-activity` | `#34d399` | `#6ee7b7` |
| Settings | `.tab-settings` | `#94a3b8` | `#cbd5e1` |

---

## 7. 반응형 브레이크포인트

### 7.1 대시보드 (`DashboardPage.css`)

| 브레이크포인트 | KPI Row | Row 2 (2fr+1fr) | Row 3 (5fr+4fr+3fr) |
|---------------|---------|-----------------|---------------------|
| > 1100px | 4열 | 2열 | 3열 |
| <= 1100px | 4열 | 2열 | 2열 + 1열 full-width |
| <= 860px | 2x2 | 1열 | 1열 |
| <= 540px | 1열, 패딩 축소 | 1열 | 1열 |

### 7.2 패널 크기 범위

| 패널 | 최소 폭 | 기본 폭 | 최대 폭 |
|------|---------|---------|---------|
| NavRail | 48px (고정) | 48px | 48px |
| ContextSidebar | ~180px (collapsed: 40px) | ~240px | ~400px |
| RightPanel | ~250px | ~360px | ~500px |
| Center (content) | 나머지 공간 (flex: 1) | — | — |

### 7.3 보드 뷰

- 칼럼: `min-width: 260px`, `max-width: 340px`
- 수평 스크롤: `overflow-x: auto` (스크롤바 숨김, ScrollArrowOverlay로 네비게이션)

### 7.4 글로벌 검색

- 다이얼로그 폭: `min(560px, 90vw)`
- 최대 높이: `min(480px, 70vh)`
- 상단 여백: `20vh`

---

## 8. 애니메이션

| 이름 | 대상 | 효과 |
|------|------|------|
| `profileMenuIn` | 프로필 드롭다운 | opacity 0→1, translateY -4→0 (0.15s) |
| `notifDropIn` | 알림 드롭다운 | opacity 0→1, translateY -4→0 (0.12s) |
| `searchFadeIn` | 검색 백드롭 | opacity 0→1 (0.12s) |
| `searchDialogIn` | 검색 다이얼로그 | opacity + scale 0.96→1 + translateY (0.15s) |
| `skeleton-pulse` | 스켈레톤 로딩 | opacity 1→0.4→1 (1.2s) |
| `spin` | 로딩 스피너 | rotate 360deg (0.8s) |
| `theme-transition` | 테마 전환 | background/color/border/shadow (0.3s) |

---

## 9. CSS 파일 구조

```
src/
├── index.css                        # 전역 reset (font, body, a, button)
├── App.css                          # (빈 파일 또는 최소)
├── styles/
│   ├── theme-variables.css          # 모든 CSS 변수 (light + dark, ~435줄)
│   ├── density-normal.css           # Normal density 오버라이드 (~47줄)
│   └── dx.fluent.nanum-dark.css     # 커스텀 DevExtreme 다크 테마 (~782KB)
├── components/
│   ├── IDELayout.css                # IDE 3-panel 쉘 + 헤더 + 프로필 메뉴
│   ├── NavRail.css                  # 48px 좌측 아이콘 네비게이션
│   ├── ContextSidebar.css           # 컨텍스트 사이드바 + 목록 스타일
│   ├── GlobalSearch.css             # Cmd+K 검색 오버레이
│   ├── NotificationBell.css         # 알림 벨 드롭다운
│   └── ScrollArrowOverlay.css       # 스크롤 화살표 오버레이
├── pages/
│   ├── DashboardPage.css            # 대시보드 전체 (KPI, 카드, 차트, 리스트)
│   ├── ProjectDetailPage.css        # 워크스페이스 툴바 + DX 위젯 오버라이드
│   ├── ProjectListPage.css          # 프로젝트 목록 DataGrid
│   ├── UsersPage.css                # 사용자 프로필 카드
│   ├── MyProfilePage.css            # 내 프로필 페이지
│   ├── AdminPage.css                # Admin 설정 페이지
│   ├── UserSettingsPage.css         # 사용자 설정 페이지
│   ├── LoginPage.css                # 로그인
│   ├── SignUpPage.css               # 회원가입
│   ├── ResetPasswordPage.css        # 비밀번호 재설정
│   ├── HomePage.css                 # 랜딩 페이지
│   └── AuditLogPage.css             # 감사 로그
└── features/
    ├── gantt/GanttView.css          # Gantt 뷰 (타입 아이콘, 담당자 배지)
    ├── tasks/TasksView.css          # TreeList 뷰 (배지, 진행률, 벌크 툴바)
    ├── tasks/TaskDetailPanel.css    # RightPanel 태스크 상세
    ├── tasks/TaskDetailPopup.css    # 태스크 상세 팝업
    ├── tasks/tabs/RelationsTab.css  # 관계 탭
    ├── board/BoardView.css          # Kanban 보드 (칼럼, 카드, 드래그)
    ├── calendar/CalendarView.css    # 캘린더 뷰
    ├── comments/CommentsView.css    # 코멘트 뷰 (@멘션 드롭다운)
    ├── files/FilesView.css          # 파일 관리 뷰
    ├── activity/ActivityView.css    # 활동 로그 뷰
    ├── time-tracking/TimeTrackingView.css # 시간 추적 뷰
    └── settings/ProjectSettingsView.css   # 프로젝트 설정 뷰
```
