---
name: react
description: React 컴포넌트 및 훅 구현 — 프로젝트 패턴 준수
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, mcp__claude_ai_DevExpressDocs__devexpress_docs_search, mcp__claude_ai_DevExpressDocs__devexpress_docs_get_content
---

# React Component Implementation

프로젝트 패턴에 맞는 React 컴포넌트/훅을 구현합니다.

## 구현 대상: $ARGUMENTS

## 구현 프로세스

### 1. 기존 패턴 분석
구현 전 반드시 유사한 기존 코드를 참조:

| 유형 | 참조 파일 |
|------|----------|
| 페이지 (DataGrid) | `src/pages/UsersPage.tsx` |
| 페이지 (대시보드) | `src/pages/DashboardPage.tsx` |
| 상세 페이지 (탭) | `src/pages/ProjectDetailPage.tsx` |
| 목록 (CRUD) | `src/pages/ProjectListPage.tsx` |
| Feature 뷰 | `src/features/gantt/GanttView.tsx` |
| 데이터 훅 | `src/hooks/useProjects.ts` |
| CRUD 훅 | `src/hooks/useProjectCrud.ts` |
| 관리 훅 | `src/hooks/useUserManagement.ts` |

### 2. 컴포넌트 구조

```tsx
import { useState, useCallback, useEffect } from 'react';
import { Button } from 'devextreme-react/button';
import { useAuthStore } from '@/lib/auth-store';
import './ComponentName.css';

export default function ComponentName() {
  // 1. Store hooks
  const profile = useAuthStore((s) => s.profile);

  // 2. Local state
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  // 3. Callbacks (memoized)
  const handleAction = useCallback(async () => {
    // ...
  }, [deps]);

  // 4. Effects
  useEffect(() => { /* fetch */ }, [deps]);

  // 5. Render
  if (loading) return <LoadingIndicator />;

  return (
    <div className="component-name">
      {/* DevExtreme components */}
    </div>
  );
}
```

### 3. 상태 관리 규칙
- **전역 상태**: Zustand store (`auth-store`, `pm-store`)
- **로컬 상태**: `useState` (폼, UI 토글, 임시 데이터)
- **서버 상태**: Custom hook with `useCallback` + `useEffect`
- **상태 선택**: `useAuthStore((s) => s.profile)` (selector로 리렌더 최소화)

### 4. DevExtreme 통합
- 컴포넌트 사용법 불확실 시 `devexpress_docs_search`로 공식 문서 확인
- 이벤트 핸들러 타입: DevExtreme에서 제공하는 event type 사용
- 커스텀 렌더링: `cellRender`, `contentRender` 등 render props 활용

### 5. CSS 파일
- 컴포넌트와 동일한 이름: `ComponentName.css`
- 최상위 클래스: `.component-name` (kebab-case)
- DevExtreme override: `.component-name .dx-widget` 패턴

### 6. 빌드 확인
구현 후 반드시:
```bash
npm run build  # 타입 에러 + 빌드 에러 확인
```
