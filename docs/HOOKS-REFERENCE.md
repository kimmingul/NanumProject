# Hooks 레퍼런스 (Hooks Reference)

> `src/hooks/` 디렉토리의 모든 커스텀 훅에 대한 상세 레퍼런스입니다.
>
> 관련 문서: [FRONTEND-ARCHITECTURE.md](./FRONTEND-ARCHITECTURE.md) | [DATABASE-GUIDE.md](./DATABASE-GUIDE.md) | [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 목차

| 카테고리 | 훅 |
|----------|-----|
| [Auth](#1-auth) | `useAuth` |
| [User](#2-user) | `useUserManagement`, `useTenantSettings` |
| [Project](#3-project) | `useProjects`, `useProject`, `useProjectCrud`, `useProjectMembers` |
| [Items](#4-items) | `useProjectItems`, `useItemLinks`, `useItemRelations` |
| [Features](#5-features) | `useComments`, `useChecklist`, `useTimeEntries`, `useDocuments`, `useActivityLog`, `useAuditLog` |
| [Dashboard](#6-dashboard) | `useDashboardData`, `useGlobalSearch` |
| [Notifications](#7-notifications) | `useNotifications` |
| [Utility](#8-utility) | `useAutoRefresh` |

---

## 1. Auth

### useAuth

```
src/hooks/useAuth.ts
```

메인 인증 훅. Supabase Auth 세션 관리와 프로필 로드를 담당합니다.

**시그니처**:

```typescript
function useAuth(): {
  user: AuthUser | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: LoginCredentials) => Promise<AuthTokenResponsePassword['data']>;
  signUp: (credentials: SignUpCredentials) => Promise<AuthResponse['data']>;
  signOut: () => Promise<void>;
  resetPassword: (request: PasswordResetRequest) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}
```

**설명**: 컴포넌트 마운트 시 `supabase.auth.getSession()`으로 초기 세션을 확인하고, `onAuthStateChange`로 인증 상태 변화를 실시간 감지합니다. 세션이 유효하면 `profiles` 테이블에서 사용자 프로필을 로드합니다.

**Supabase 테이블/API**:
- `supabase.auth.getSession()` — 초기 세션 확인
- `supabase.auth.onAuthStateChange()` — 상태 변화 리스너
- `profiles` 테이블 — `SELECT * WHERE user_id = :userId`
- `supabase.auth.signInWithPassword()` — 로그인
- `supabase.auth.signUp()` — 회원가입
- `supabase.auth.signOut()` — 로그아웃
- `supabase.auth.resetPasswordForEmail()` — 비밀번호 리셋 이메일
- `supabase.auth.updateUser()` — 비밀번호 변경

**사용 컴포넌트**:
- `ProtectedRoute` — `isAuthenticated`, `isLoading`
- `LoginPage` — `signIn`
- `SignUpPage` — `signUp`
- `ResetPasswordPage` — `resetPassword`, `updatePassword`
- `MyProfilePage` — `updatePassword`

**주의사항**:
- `onAuthStateChange` 콜백 내에서 Supabase 쿼리를 `await` 하면 데드락 발생 (Navigator Locks)
- `loadUserProfile()`은 콜백 외부에서 정의되어 `await` 가능
- `mounted` 플래그로 언마운트 후 상태 업데이트 방지

---

## 2. User

### useUserManagement

```
src/hooks/useUserManagement.ts
```

사용자 관리 기능 (프로필 수정, 아바타, 역할, 활성화/비활성화).

**시그니처**:

```typescript
function useUserManagement(): {
  updateProfile: (userId: string, data: { full_name?: string; role?: string }) => Promise<void>;
  uploadAvatar: (userId: string, file: File) => Promise<string>;
  removeAvatar: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  createUser: (email: string, fullName: string, role: string) => Promise<string>;
}
```

**설명**: 관리자 수준의 사용자 관리 작업을 제공합니다. 역할 변경과 사용자 생성은 SECURITY DEFINER RPC 함수를 통해 서버사이드에서 권한이 검증됩니다.

**Supabase 테이블/RPC**:
- `profiles` 테이블 — `UPDATE full_name WHERE user_id`
- RPC `update_user_role(p_user_id, p_new_role)` — 역할 변경 (admin 전용)
- RPC `deactivate_user(p_user_id)` — 비활성화
- RPC `reactivate_user(p_user_id)` — 재활성화
- RPC `create_tenant_user(p_email, p_full_name, p_role)` → `string` — 사용자 생성
- Storage `avatars` 버킷 — 업로드/삭제
- `supabase.auth.resetPasswordForEmail()` — 비밀번호 리셋 이메일

**사용 컴포넌트**:
- `MyProfilePage` — `uploadAvatar`, `removeAvatar`
- `admin/UsersSection` — `createUser`, `updateProfile`, `deactivateUser`, `reactivateUser`, `sendPasswordReset`

**주의사항**:
- `uploadAvatar`는 `profile?.tenant_id` guard 필요
- 아바타 URL에 `?t=${Date.now()}`를 추가하여 캐시 무효화
- `removeAvatar`는 Storage 파일 삭제 실패를 무시 (best-effort)

---

### useTenantSettings

```
src/hooks/useTenantSettings.ts
```

테넌트 조직 정보와 설정 관리.

**시그니처**:

```typescript
function useTenantSettings(): {
  tenant: Tenant | null;
  loading: boolean;
  fetchTenant: () => Promise<void>;
  updateTenant: (updates: { name?: string; domain?: string | null }) => Promise<void>;
  updateTenantSettings: (partial: Partial<TenantSettings>) => Promise<void>;
}
```

**설명**: 현재 테넌트의 기본 정보(이름, 도메인)와 설정(branding, features, security)을 조회/수정합니다. `updateTenantSettings`는 기존 설정과 deep-merge합니다.

**Supabase 테이블**:
- `tenants` — `SELECT * WHERE id = :tenantId` (단일 조회)
- `tenants` — `UPDATE name/domain/settings WHERE id = :tenantId`

**사용 컴포넌트**:
- `admin/OrganizationSection` — 조직명, 도메인 수정
- `admin/SecuritySection` — 보안 설정
- `admin/AppearanceSection` — 브랜딩 설정

**주의사항**:
- `updateTenantSettings`는 `branding`, `features`, `security` 키를 각각 별도로 shallow merge
- `tenantId`는 `useAuthStore`에서 가져옴

---

## 3. Project

### useProjects

```
src/hooks/useProjects.ts
```

프로젝트 목록 조회 (pm-store에 결과 저장).

**시그니처**:

```typescript
function useProjects(options?: {
  status?: ProjectStatus | 'all';
  search?: string;
  autoFetch?: boolean;
}): {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**설명**: 현재 테넌트의 활성 프로젝트 목록을 조회합니다. 결과는 `usePMStore`에 저장되어 여러 컴포넌트에서 공유됩니다. 별표 프로젝트가 상단에 정렬됩니다.

**Supabase 테이블**:
- `projects` — `SELECT * WHERE is_active=true ORDER BY is_starred DESC, name ASC`
- 선택적 필터: `status`, `name ILIKE %search%`

**사용 컴포넌트**:
- `ProjectListPage` — 전체 프로젝트 목록
- `ProjectSidebarList` — 사이드바 프로젝트 목록 (`status: 'active'`)
- `DashboardPage` — 프로젝트 필터 드롭다운

**주의사항**:
- `profile?.tenant_id` guard — RLS가 적용되지만 tenant_id가 없으면 쿼리 스킵
- `autoFetch` 옵션으로 자동 fetch 제어 (기본값: `true`)
- 결과가 pm-store에 저장되므로 같은 옵션의 여러 인스턴스는 마지막 결과를 공유

---

### useProject

```
src/hooks/useProject.ts
```

단일 프로젝트 상세 조회 (pm-store에 결과 저장).

**시그니처**:

```typescript
function useProject(projectId: string | undefined): {
  project: Project | null;
  loading: boolean;
  refetch: () => Promise<void>;
}
```

**설명**: 특정 프로젝트의 상세 정보를 조회하여 `usePMStore.activeProject`에 저장합니다. 언마운트 시 `activeProject`를 `null`로 리셋합니다.

**Supabase 테이블**:
- `projects` — `SELECT * WHERE id = :projectId` (단일 조회)

**사용 컴포넌트**:
- `TasksWorkspacePage` — 프로젝트 작업 공간

**주의사항**:
- `projectId`가 `undefined`이면 fetch 스킵
- `useEffect` cleanup에서 `setActiveProject(null)` 호출

---

### useProjectCrud

```
src/hooks/useProjectCrud.ts
```

프로젝트 CRUD 작업.

**시그니처**:

```typescript
interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  has_hours_enabled?: boolean;
  manager_id?: string;
}

interface UpdateProjectInput extends Partial<Omit<CreateProjectInput, 'manager_id'>> {
  is_starred?: boolean;
  is_active?: boolean;
  is_template?: boolean;
  manager_id?: string | null;
}

function useProjectCrud(): {
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (projectId: string, input: UpdateProjectInput) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  cloneFromTemplate: (templateId: string, name: string, startDate: string) => Promise<string>;
}
```

**설명**: 프로젝트 생성/수정/삭제(소프트)/템플릿 복제 기능을 제공합니다. 생성 시 자동으로 `project_members`에 생성자를 admin으로 추가합니다.

**Supabase 테이블/RPC**:
- `projects` — INSERT, UPDATE, UPDATE(`is_active=false`)
- `project_members` — INSERT (생성 시 auto-add)
- RPC `clone_project_from_template(p_template_id, p_name, p_start_date)` → `string`

**사용 컴포넌트**:
- `ProjectListPage` — 생성, 템플릿 복제, 별표 토글
- `TasksWorkspacePage` — 별표 토글
- `ProjectSidebarList` — 별표 토글
- `ProjectSettingsView` — 수정, 삭제

**주의사항**:
- `createProject`는 `profile?.tenant_id`와 `profile.user_id`가 필요
- `deleteProject`는 소프트 삭제 (`is_active = false`)
- `updateProject`는 `dbUpdate()` 유틸리티로 `undefined` 값 필터링

---

### useProjectMembers

```
src/hooks/useProjectMembers.ts
```

프로젝트 멤버 관리.

**시그니처**:

```typescript
function useProjectMembers(projectId: string | undefined): {
  members: ProjectMemberWithProfile[];
  loading: boolean;
  error: string | null;
  addMember: (userId: string, permission: MemberPermission) => Promise<void>;
  updateMemberPermission: (memberId: string, permission: MemberPermission) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 프로젝트 멤버 목록을 조회하고 프로필 정보를 enrichment합니다. 멤버 추가/권한 변경/제거(소프트) 기능을 제공합니다.

**Supabase 테이블**:
- `project_members` — `SELECT * WHERE project_id AND is_active=true`
- `profiles` — `SELECT user_id, full_name, email, avatar_url WHERE user_id IN (:ids)` (enrichment)
- `project_members` — INSERT (추가), UPDATE permission (권한 변경), UPDATE `is_active=false` (제거)

**사용 컴포넌트**:
- `ProjectSettingsView` — 멤버 관리 UI

**주의사항**:
- 두 번의 쿼리로 멤버 + 프로필을 조합 (Supabase foreign key join 대신)
- `removeMember`는 소프트 삭제 (`is_active = false`)

---

## 4. Items

### useProjectItems

```
src/hooks/useProjectItems.ts
```

프로젝트 아이템(태스크/그룹/마일스톤), 종속성, 리소스, 담당자, 코멘트 수 일괄 로드.

**시그니처**:

```typescript
function useProjectItems(projectId: string | undefined, paused?: boolean): {
  items: ProjectItem[];
  dependencies: TaskDependency[];
  resources: ProjectMemberResource[];  // { id: string; text: string }
  assignments: TaskAssignee[];
  commentCounts: Map<string, number>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**설명**: Gantt/Grid/Board 등 뷰에 필요한 모든 프로젝트 아이템 데이터를 한 번에 로드합니다. 4단계 순차 쿼리로 아이템 → 종속성 → 코멘트 수 → 리소스 이름을 가져옵니다.

**Supabase 테이블/RPC**:
- `project_items` — `SELECT * WHERE project_id AND is_active=true ORDER BY sort_order`
- `task_assignees` — `SELECT * WHERE project_id AND is_active=true`
- `project_members` — `SELECT user_id WHERE project_id AND is_active=true`
- `task_dependencies` — `SELECT * WHERE predecessor_id IN (:itemIds)`
- RPC `get_item_comment_counts(p_project_id)` → `{ item_id, comment_count }[]`
- `profiles` — `SELECT user_id, full_name WHERE user_id IN (:userIds)` (리소스 이름)

**사용 컴포넌트**:
- `GanttView` — 메인 데이터 소스
- `TasksView` — Grid 데이터
- `BoardView` — 보드 데이터
- `CalendarView` — 캘린더 데이터
- `RightPanel` — 선택된 태스크 컨텍스트

**주의사항**:
- 30초 자동 새로고침 (`useAutoRefresh`)
- `paused` 파라미터: `true`이면 자동 새로고침 중지 (TaskDetailPopup이 열려있을 때 사용)
- 1단계: items + assignees + members 병렬 → 2단계: dependencies → 3단계: comment counts → 4단계: resource names

---

### useItemLinks

```
src/hooks/useItemLinks.ts
```

아이템 간 의미적 링크 관리 (semantic links).

**시그니처**:

```typescript
function useItemLinks(projectId: string | undefined, itemId: string | undefined): {
  links: ItemLinkWithNames[];
  loading: boolean;
  addLink: (sourceId: string, targetId: string, linkType: LinkType) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 선택된 아이템의 양방향 링크(blocks, duplicates, relates_to 등)를 조회합니다. 소스/타겟 아이템 이름을 enrichment합니다.

**Supabase 테이블**:
- `item_links` — `SELECT * WHERE project_id AND (source_id=:itemId OR target_id=:itemId)`
- `project_items` — `SELECT id, name WHERE id IN (:ids)` (이름 enrichment)
- `item_links` — INSERT (추가), DELETE (삭제)

**사용 컴포넌트**:
- `tabs/RelationsTab` — 관계 탭 링크 섹션

**주의사항**:
- `item_links` 테이블은 Supabase generated types에 없어서 `(supabase as any).from('item_links')` 사용
- 양방향 조회: `source_id.eq.${itemId},target_id.eq.${itemId}`

---

### useItemRelations

```
src/hooks/useItemRelations.ts
```

아이템의 모든 관계를 통합 계산 (순수 연산, DB 호출 없음).

**시그니처**:

```typescript
interface RelationItem {
  id: string;
  name: string;
  item_type: string;
}

interface DependencyItem extends RelationItem {
  dependency_type: DependencyType;
  dependency_id: string;
}

interface LinkItem {
  id: string;
  linked_item_id: string;
  linked_item_name: string;
  link_type: string;
  direction: 'outgoing' | 'incoming';
}

function useItemRelations(
  itemId: string | undefined,
  items: ProjectItem[],
  dependencies: TaskDependency[],
  itemLinks: ItemLinkWithNames[],
): {
  parent: RelationItem | null;
  children: RelationItem[];
  predecessors: DependencyItem[];
  successors: DependencyItem[];
  links: LinkItem[];
}
```

**설명**: 이미 로드된 items, dependencies, itemLinks 데이터에서 특정 아이템의 모든 관계를 `useMemo`로 계산합니다. Supabase 호출이 없는 순수 파생 훅입니다.

**Supabase 테이블**: 없음 (입력 데이터에서 계산)

**사용 컴포넌트**:
- `tabs/RelationsTab` — 관계 탭의 전체 관계 표시

**주의사항**:
- `useMemo` 의존성: `[itemId, items, dependencies, itemLinks]`
- `parent`: `parent_id` 기반 트리 구조
- `predecessors`/`successors`: `task_dependencies` 기반 (`predecessor_id`/`successor_id`)
- `links`: `item_links` 기반 (양방향 direction 계산)

---

## 5. Features

### useComments

```
src/hooks/useComments.ts
```

코멘트 CRUD (프로젝트 또는 아이템 단위).

**시그니처**:

```typescript
interface CommentWithAuthor extends PMComment {
  author_name: string | null;
  author_email: string | null;
}

function useComments(
  projectId: string | undefined,
  targetType: CommentTarget = 'project',
  targetId?: string,
): {
  comments: CommentWithAuthor[];
  loading: boolean;
  error: string | null;
  addComment: (message: string, mentionedUserIds?: string[]) => Promise<void>;
  updateComment: (commentId: string, message: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 특정 프로젝트 또는 아이템의 코멘트를 조회/생성/수정/삭제합니다. 작성자 프로필 정보를 enrichment합니다. `@mention` 시 `mentioned_user_ids` 배열을 함께 저장합니다.

**Supabase 테이블**:
- `comments` — `SELECT * WHERE project_id AND target_type AND target_id AND is_active=true ORDER BY created_at DESC`
- `profiles` — `SELECT user_id, full_name, email WHERE user_id IN (:ids)` (enrichment)
- `comments` — INSERT (생성), UPDATE message (수정), UPDATE `is_active=false` (소프트 삭제)

**사용 컴포넌트**:
- `CommentsView` — 프로젝트 단위 코멘트 (targetType='project')
- `tabs/CommentsTab` — 아이템 단위 코멘트 (targetType='project_item')

**주의사항**:
- `targetId`가 없으면 `projectId`를 `effectiveTargetId`로 사용
- `mentioned_user_ids`를 통해 서버 트리거가 알림을 생성
- 소프트 삭제 (`is_active = false`)

---

### useChecklist

```
src/hooks/useChecklist.ts
```

체크리스트 아이템 관리.

**시그니처**:

```typescript
function useChecklist(itemId: string | undefined): {
  items: ChecklistItem[];
  loading: boolean;
  error: string | null;
  addItem: (name: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<ChecklistItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItem: (item: ChecklistItem) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 특정 프로젝트 아이템의 체크리스트를 관리합니다. 토글 시 완료 여부, 완료자, 완료 시각을 함께 업데이트합니다.

**Supabase 테이블**:
- `checklist_items` — `SELECT * WHERE item_id AND is_active=true ORDER BY sort_order`
- `checklist_items` — INSERT, UPDATE, UPDATE `is_active=false`

**사용 컴포넌트**:
- `tabs/ChecklistTab` — 체크리스트 탭

**주의사항**:
- `addItem`: 마지막 `sort_order + 1`로 자동 정렬
- `toggleItem`: `is_completed`, `completed_by`, `completed_at` 동시 업데이트
- `dbUpdate()` 유틸리티로 `undefined` 값 필터링

---

### useTimeEntries

```
src/hooks/useTimeEntries.ts
```

시간 기록 관리.

**시그니처**:

```typescript
interface TimeEntryWithDetails extends TimeEntry {
  task_name: string | null;
  user_name: string | null;
}

function useTimeEntries(
  projectId: string | undefined,
  filters?: { userId?: string; dateFrom?: string; dateTo?: string },
): {
  entries: TimeEntryWithDetails[];
  loading: boolean;
  error: string | null;
  addEntry: (entry: {
    item_id: string;
    start_time: string;
    end_time?: string;
    duration_minutes: number;
    note?: string;
  }) => Promise<void>;
  updateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 프로젝트의 시간 기록을 조회/생성/수정/삭제합니다. 태스크 이름과 사용자 이름을 enrichment합니다.

**Supabase 테이블**:
- `time_entries` — `SELECT * WHERE project_id AND is_active=true ORDER BY start_time DESC`
- `project_items` — `SELECT id, name WHERE id IN (:ids)` (태스크 이름)
- `profiles` — `SELECT user_id, full_name WHERE user_id IN (:ids)` (사용자 이름)
- `time_entries` — INSERT, UPDATE, UPDATE `is_active=false`

**사용 컴포넌트**:
- `TimeTrackingView` — 시간 추적 뷰

**주의사항**:
- 필터: `userId`, `dateFrom`, `dateTo` 선택적 적용
- `entry_type`은 항상 `'manual'`로 설정
- 소프트 삭제 (`is_active = false`)

---

### useDocuments

```
src/hooks/useDocuments.ts
```

문서/파일 관리 (업로드, 다운로드, 버전).

**시그니처**:

```typescript
interface DocumentWithVersion extends PMDocument {
  current_version: DocumentVersion | null;
  uploader_name: string | null;
}

function useDocuments(
  projectId: string | undefined,
  targetType: CommentTarget = 'project',
  targetId?: string,
): {
  documents: DocumentWithVersion[];
  loading: boolean;
  error: string | null;
  uploadFile: (file: File, description?: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  getVersions: (documentId: string) => Promise<DocumentVersion[]>;
  downloadFile: (version: DocumentVersion) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 프로젝트 또는 아이템의 문서를 관리합니다. 업로드 시 4단계 프로세스 (Storage 업로드 → document 생성 → version 생성 → current_version_id 업데이트)를 수행합니다.

**Supabase 테이블/Storage**:
- `documents` — `SELECT * WHERE project_id AND target_type AND target_id AND is_active=true`
- `document_versions` — `SELECT * WHERE id IN (:versionIds)` (현재 버전 enrichment)
- `profiles` — `SELECT user_id, full_name WHERE user_id IN (:ids)` (업로더 이름)
- Storage `documents` 버킷 — upload, download
- `documents` — INSERT, UPDATE `current_version_id`, UPDATE `is_active=false`
- `document_versions` — INSERT, SELECT (버전 목록)

**사용 컴포넌트**:
- `FilesView` — 파일 관리 뷰

**주의사항**:
- Storage 경로: `{tenant_id}/{project_id}/{timestamp}_{filename}`
- 다운로드 실패 시 `window.open()` fallback
- Blob → `URL.createObjectURL` → `<a download>` 패턴으로 파일 다운로드
- 소프트 삭제 (`is_active = false`)

---

### useActivityLog

```
src/hooks/useActivityLog.ts
```

프로젝트 활동 로그 조회.

**시그니처**:

```typescript
interface ActivityLogWithActor extends PMActivityLog {
  actor_name: string | null;
}

function useActivityLog(
  projectId: string | undefined,
  filters?: { action?: string; dateFrom?: string; dateTo?: string },
): {
  logs: ActivityLogWithActor[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**설명**: 특정 프로젝트의 활동 로그를 시간 역순으로 조회합니다. 행위자(actor) 이름을 enrichment합니다.

**Supabase 테이블**:
- `activity_log` — `SELECT * WHERE project_id ORDER BY created_at DESC`
- `profiles` — `SELECT user_id, full_name WHERE user_id IN (:ids)` (actor 이름)

**사용 컴포넌트**:
- `ActivityView` — 프로젝트 활동 뷰

**주의사항**:
- 필터: `action`, `dateFrom`, `dateTo` 선택적 적용
- 읽기 전용 훅 (수정/삭제 없음)

---

### useAuditLog

```
src/hooks/useAuditLog.ts
```

시스템 감사 로그 조회 (테넌트 전체).

**시그니처**:

```typescript
interface AuditLogWithUser extends AuditLog {
  user_email: string | null;
  user_name: string | null;
}

function useAuditLog(filters?: {
  action?: string;
  resource_type?: string;
  dateFrom?: string;
  dateTo?: string;
}): {
  logs: AuditLogWithUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**설명**: 테넌트 전체의 감사 로그를 시간 역순으로 조회합니다. 사용자 이메일과 이름을 enrichment합니다. `activity_log`와 달리 프로젝트가 아닌 시스템 수준의 로그입니다.

**Supabase 테이블**:
- `audit_logs` — `SELECT * ORDER BY created_at DESC`
- `profiles` — `SELECT user_id, email, full_name WHERE user_id IN (:ids)` (사용자 정보)

**사용 컴포넌트**:
- `AuditLogPage` — 감사 로그 페이지 (DataGrid)

**주의사항**:
- 필터: `action`, `resource_type`, `dateFrom`, `dateTo` 선택적 적용
- 프로젝트 ID 파라미터가 없음 (테넌트 전체 스코프)
- RLS가 tenant_id 기반으로 자동 격리

---

## 6. Dashboard

### useDashboardData

```
src/hooks/useDashboardData.ts
```

대시보드 페이지의 모든 데이터를 일괄 로드.

**시그니처**:

```typescript
interface DashboardKPI {
  overdueTasks: number;
  inProgressTasks: number;
  dueThisWeek: number;
  completionRate: number;
  myInProgress: number;
  myDueThisWeek: number;
}

interface DashboardData {
  kpi: DashboardKPI;
  myTasks: DashboardTaskItem[];
  overdueItems: DashboardTaskItem[];
  upcomingItems: DashboardTaskItem[];
  projectStatusCounts: ProjectStatusCount[];
  taskStatusCounts: TaskStatusCount[];
  activities: ActivityItem[];
  loading: { kpi: boolean; lists: boolean; charts: boolean; activity: boolean };
}

function useDashboardData(options?: {
  period?: string;      // 'this_week' | 'this_month' | 'last_30' | 'last_90' | 'this_year'
  projectId?: string;
}): DashboardData & { refetch: () => void }
```

**설명**: 4개 병렬 그룹으로 대시보드 데이터를 로드합니다:
1. **KPI**: 7개 카운트 쿼리 (지연, 진행중, 이번 주 마감, 전체, 완료, 내 진행중, 내 마감)
2. **Lists**: 내 태스크 (8개), 지연 항목 (6개), 다가오는 마감 (10개) + 프로젝트 이름 enrichment
3. **Charts**: 프로젝트 상태 분포, 태스크 상태 분포
4. **Activity**: 최근 10건 활동 로그 + actor/project 이름 enrichment

**Supabase 테이블**:
- `project_items` — 여러 집계 쿼리 (count, select)
- `task_assignees` — 내 태스크 (JOIN `project_items`)
- `projects` — 상태 분포, 이름 조회
- `activity_log` — 최근 활동
- `profiles` — actor 이름/아바타 enrichment

**사용 컴포넌트**:
- `DashboardPage` — 대시보드 위젯들에 분배

**주의사항**:
- `loading` 객체로 4개 영역별 독립적 로딩 상태 관리
- `profile?.tenant_id` guard
- 기간 필터: `getDateRange()` 헬퍼로 날짜 범위 계산
- 프로젝트 필터: 모든 쿼리에 `project_id` 조건 추가
- 내 태스크는 `task_assignees` 테이블에서 `user_id` 기반 조회

---

### useGlobalSearch

```
src/hooks/useGlobalSearch.ts
```

전역 검색 (프로젝트, 태스크, 사용자).

**시그니처**:

```typescript
interface SearchResultItem {
  id: string;
  type: 'project' | 'item' | 'user';
  name: string;
  secondary: string;
  icon: string;
  projectId?: string;
  itemType?: string;
}

function useGlobalSearch(): {
  query: string;
  setQuery: (q: string) => void;
  results: { projects: SearchResultItem[]; items: SearchResultItem[]; users: SearchResultItem[] };
  loading: boolean;
  flatResults: SearchResultItem[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  reset: () => void;
}
```

**설명**: 3개 테이블을 병렬 검색하여 통합 결과를 반환합니다. 300ms 디바운스와 stale response 폐기 로직이 포함됩니다.

**Supabase 테이블**:
- `projects` — `SELECT id, name, description WHERE tenant_id AND is_active AND (name ILIKE OR description ILIKE)` LIMIT 5
- `project_items` — `SELECT id, name, project_id, item_type WHERE tenant_id AND is_active AND name ILIKE` LIMIT 5
- `profiles` — `SELECT id, full_name, email WHERE tenant_id AND is_active AND (full_name ILIKE OR email ILIKE)` LIMIT 5
- `projects` — 추가 프로젝트 이름 조회 (아이템의 프로젝트가 검색 결과에 없을 때)

**사용 컴포넌트**:
- `GlobalSearch` — 전역 검색 다이얼로그

**주의사항**:
- 최소 2자 입력 필요
- `requestIdRef` 카운터로 stale 응답 폐기
- 디바운스: 300ms (`debounceRef`)
- `flatResults`: projects + items + users 순서로 플랫 배열

---

## 7. Notifications

### useNotifications

```
src/hooks/useNotifications.ts
```

사용자 알림 조회/관리.

**시그니처**:

```typescript
function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

**설명**: 현재 사용자의 최근 20건 알림을 조회합니다. 읽음/전체 읽음 처리를 RPC로 수행합니다. 30초 자동 새로고침으로 실시간에 가까운 알림을 제공합니다.

**Supabase 테이블/RPC**:
- `notifications` — `SELECT * WHERE user_id ORDER BY created_at DESC LIMIT 20`
- RPC `mark_notification_read(p_notification_id)` — 단일 읽음 처리
- RPC `mark_all_notifications_read()` — 전체 읽음 처리

**사용 컴포넌트**:
- `NotificationBell` — 알림 벨/드롭다운

**주의사항**:
- `profile?.user_id` guard (tenant_id가 아닌 user_id 기반)
- 30초 자동 새로고침 (`useAutoRefresh`)
- `markAsRead`/`markAllAsRead`는 optimistic update (서버 응답 전에 로컬 상태 먼저 업데이트)
- `unreadCount`는 `notifications.filter(n => !n.is_read).length`로 계산

---

## 8. Utility

### useAutoRefresh

```
src/hooks/useAutoRefresh.ts
```

주기적 데이터 새로고침 유틸리티.

**시그니처**:

```typescript
function useAutoRefresh(
  refetchFn: () => void | Promise<void>,
  intervalMs: number,
  enabled?: boolean,  // 기본값: true
): void
```

**설명**: `setInterval`로 주기적으로 `refetchFn`을 호출합니다. 탭이 비활성(`document.hidden`)일 때는 호출하지 않아 불필요한 네트워크 요청을 방지합니다.

**Supabase 테이블**: 없음 (유틸리티 훅)

**사용 컴포넌트**:
- `useProjectItems` — 30초 (`paused` 파라미터로 제어)
- `useNotifications` — 30초
- `DashboardPage` — 60초

**주의사항**:
- `refetchRef`로 최신 콜백 참조 유지 (stale closure 방지)
- `enabled = false` 또는 `intervalMs <= 0`이면 타이머 비활성
- 탭 비활성 감지: `document.hidden` 체크 (Page Visibility API)
- cleanup: `clearInterval`로 타이머 정리

---

## 공통 패턴 정리

### Supabase 데이터 Fetching 패턴

모든 데이터 훅이 따르는 공통 패턴:

```typescript
function useFeature(id: string | undefined) {
  const profile = useAuthStore((s) => s.profile);
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;                          // 파라미터 guard
    // if (!profile?.tenant_id) return;       // 테넌트 guard (필요 시)
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('table').select('*').eq('id', id);
      if (error) throw error;
      setData(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

### RPC 호출 패턴

```typescript
// void return
async function rpc(fn: string, params: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (
    fn: string, params: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>)(fn, params);
  if (error) throw error;
}

// with return value
async function rpcWithReturn<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string, params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, params);
  if (error) throw error;
  return data as T;
}
```

> Cast가 필요한 이유: Supabase generated types에서 `Functions: Record<string, never>`로 정의됨

### Enrichment 패턴

대부분의 조회 훅에서 `profiles` 테이블과 조인하여 사용자 이름/이메일을 추가합니다:

1. 메인 데이터 조회
2. `user_id` 목록 추출 (`[...new Set(rows.map(r => r.user_id))]`)
3. `profiles` 테이블에서 해당 user_id들의 프로필 조회
4. `Map<string, ProfileInfo>` 생성
5. 메인 데이터에 프로필 정보 merge

### 소프트 삭제 패턴

모든 삭제 작업은 소프트 삭제를 사용합니다:

```typescript
await supabase
  .from('table')
  .update({ is_active: false })
  .eq('id', itemId);
```

### exports

`src/hooks/index.ts`에서 re-export되는 훅 목록:

```typescript
export { useAuth } from './useAuth';
export { useProjects } from './useProjects';
export { useProject } from './useProject';
export { useProjectItems } from './useProjectItems';
export { useProjectCrud } from './useProjectCrud';
export { useComments } from './useComments';
export { useProjectMembers } from './useProjectMembers';
export { useDocuments } from './useDocuments';
export { useActivityLog } from './useActivityLog';
export { useAuditLog } from './useAuditLog';
export { useTimeEntries } from './useTimeEntries';
export { useChecklist } from './useChecklist';
export { useUserManagement } from './useUserManagement';
export { useItemLinks } from './useItemLinks';
export { useItemRelations } from './useItemRelations';
```

> `useDashboardData`, `useGlobalSearch`, `useNotifications`, `useAutoRefresh`, `useTenantSettings`는 개별 파일에서 직접 import해야 합니다.
