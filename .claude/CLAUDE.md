# NanumProject — Claude Code Guide

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript 5.9 (strict) |
| UI Components | DevExtreme 25.x (Fluent Blue Light theme) |
| Gantt | devexpress-gantt |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| State | Zustand — auth-store (localStorage persist), pm-store (in-memory) |
| Routing | React Router DOM 7.x |
| Build | Vite 7.x (dev port 5173) |
| Deploy | Vercel (auto-deploy on push to master) |
| Domain | https://pm.nanumspace.com |

## Commands

```bash
npm run dev        # Vite dev server (localhost:5173)
npm run build      # tsc -b && vite build (production)
npm run lint       # ESLint
npx tsc --noEmit   # Type check only
```

## Project Structure

```
src/
├── components/     # Shared UI (IDELayout, LeftPanel, RightPanel, ResizeHandle, ProtectedRoute)
├── pages/          # Route pages (Dashboard, Users, ProjectList, ProjectDetail, etc.)
├── features/       # Feature modules (gantt, tasks, board, calendar, comments, files, etc.)
├── hooks/          # Custom hooks (useAuth, useProjects, useProjectItems, useUserManagement, etc.)
├── lib/            # Core libraries (supabase.ts, auth-store.ts, pm-store.ts)
├── types/          # TypeScript types (pm.ts, database.ts, auth.ts, supabase.ts)
├── config/         # Configuration (Supabase keys, DevExtreme license)
└── routes/         # Router setup (IDELayout + Outlet nesting)
supabase/
├── migrations/     # SQL migrations (001–008)
└── DATABASE.md     # DB schema docs
docs/
├── ARCHITECTURE.md # System architecture
├── PROGRESS.md     # Development progress log
└── PRD.md          # Product requirements
```

## Code Conventions

### DevExtreme Components
- All buttons: `<Button>` from devextreme-react (never native `<button>`)
- Custom CSS class: use `className` prop (not `cssClass`)
- CSS selector pattern: `.dx-button.class-name`
- DataGrid: always set `keyExpr`, use `dataSource` with typed arrays
- SelectBox: use `items`, `value`, `onValueChanged`

### React Patterns
- Functional components with hooks only
- PascalCase for components, camelCase for hooks/utils
- Zustand for shared state (no prop drilling)
- `useCallback` for event handlers passed as props
- Guard data fetching with `profile?.tenant_id` (NOT `getSession()`)

### TypeScript
- Strict mode always
- Explicit return types on exported functions
- Avoid `any` — use `unknown` with type guards
- Interfaces for public APIs, types for unions/intersections

### CSS
- Component-scoped CSS files (e.g., `UsersPage.css`)
- DevExtreme overrides: `.container .dx-widget` specificity pattern
- Badge pattern: `.role-badge`, `.status-badge` with color variants

## Critical: Supabase Auth Deadlock

**NEVER `await` Supabase queries inside `onAuthStateChange` callbacks.**

```typescript
// DEADLOCK — never do this
supabase.auth.onAuthStateChange(async (_event, session) => {
  await supabase.from('profiles').select('*'); // ← deadlock
});

// CORRECT — fire-and-forget
supabase.auth.onAuthStateChange((_event, session) => {
  supabase.from('profiles').select('*').then(({ data }) => { /* ... */ });
});
```

Reason: Supabase queries call `_getAccessToken()` → `getSession()` → `await initializePromise` → deadlock with `navigator.locks`.

## Database Design

- **`project_items`** — unified table for group/task/milestone (parent_id tree, DevExtreme Gantt optimized)
- **RLS** — all tables tenant-isolated, `profiles.role` hierarchy: admin > manager > member > viewer
- **Tenant admin** — `role='admin'` accesses all projects without project_members entry
- **Soft delete** — `is_active` field (distinct from project `status`)
- **RPC functions** — admin-only operations use `SECURITY DEFINER` functions

See `supabase/DATABASE.md` for full schema.

## Deployment

- Push to `master` → Vercel auto-deploys
- Environment variables are build-time (Vite): change requires Redeploy
- Supabase URL Configuration: Site URL = `https://pm.nanumspace.com`, Redirect URLs include `http://localhost:5173/**`

## Documentation Updates

When adding features, update:
1. `docs/PROGRESS.md` — Phase entry
2. `docs/ARCHITECTURE.md` — if structure changes
3. `supabase/DATABASE.md` — if DB schema changes
