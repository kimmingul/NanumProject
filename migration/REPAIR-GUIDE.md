# Migration Repair Guide

TeamGantt → Supabase 마이그레이션 이후 발견된 데이터 무결성 문제의 감사(Audit) 결과와 복구 과정을 기록합니다.

---

## 1. 배경

2025년 초에 TeamGantt에서 Supabase로 전체 데이터를 마이그레이션했습니다.
마이그레이션 파이프라인은 7단계로 구성됩니다:

```
Users → Projects+Members → Groups(2-pass) → Tasks+Assignees → Dependencies → Comments → TimeEntries
```

마이그레이션 완료 후 간트 차트에서 **모든 태스크가 플랫(flat) 구조로 표시되는 문제**를 발견했고,
원본 데이터와 비교하여 종합 감사를 수행했습니다.

---

## 2. 감사(Audit) 결과

### 2.1 데이터 규모

| 항목 | 원본 (TeamGantt) | DB (Supabase) | id-map.json |
|------|-----------------|---------------|-------------|
| Projects | 368 | 368 | 368 |
| Users | 38 | 38 | 38 |
| Groups | 1,782 | 1,656 | **0** |
| Tasks | 15,272 | 15,272 | 15,272 |
| Dependencies | 90 (unique) | **0** | — |
| Comments | 43,873 | 43,873 | 43,873 |
| Documents | 550 | 550 | 550 |

### 2.2 발견된 문제

#### CRITICAL — 그룹 매핑 실패

**증상**: 간트 차트에서 모든 태스크가 플랫하게 표시됨 (계층 없음)

**원인 분석**:

```
group-importer.ts
├── Pass 1: top-level 그룹 INSERT → ✅ DB에 1,656개 삽입됨
├── Pass 1: SELECT ... WHERE tg_id IN (...) → UUID 조회
├── mapper.set('group', tgId, uuid)         → mapper에 저장
├── Pass 2: subgroup INSERT → ✅ 일부 성공
└── mapper.save(ID_MAP_PATH)                → ❌ id-map.json에 0개 저장됨
```

**근본 원인**: `group-importer.ts`가 그룹을 DB에는 성공적으로 삽입했으나,
UUID를 id-map.json에 저장하는 과정에서 매핑이 유실되었습니다.

**연쇄 효과**:
- `task-importer.ts`에서 `mapper.get('group', task.parent_group_id)` → 항상 `undefined`
- 모든 15,272개 태스크의 `parent_id`가 `null`로 설정
- 간트 차트에서 계층 구조가 완전히 소실

#### CRITICAL — task_dependencies 삽입 실패

**증상**: 간트 차트에서 태스크 간 의존성 화살표가 표시되지 않음

**원인 1 — dependency-importer.ts에서 project_id 누락**:
```typescript
// dependency-importer.ts (원본 코드)
depRows.push({
  tenant_id: config.IMPORT_TENANT_ID,
  predecessor_id: predecessorUuid,
  successor_id: successorUuid,
  dependency_type: normalizeDependencyType(dep.type || 'FS'),
  lag_days: dep.lead_lag_time ?? 0,
  // ❌ project_id 누락
});
```

**원인 2 — DB 스키마 불일치**:
- `002_pm.sql` 마이그레이션 파일에는 `project_id UUID NOT NULL`로 정의
- 실제 배포된 Supabase DB에는 `project_id` 컬럼이 **존재하지 않음**
- PostgREST 오류: `Could not find the 'project_id' column of 'task_dependencies' in the schema cache`

**결론**: `project_id` 컬럼 없이 삽입해야 함 (현재 DB 스키마 기준)

#### MEDIUM — task updated_at/updated_by 미임포트

- `task-importer.ts`가 `created_at`만 저장하고 `updated_at`, `updated_by`는 무시
- 원본 데이터 중 165건에 `updated_at` 값 존재

#### INFO — checklist 데이터 미추출

- 원본 데이터 `checklist_info.count` 합계: 1,806건
- `task-extractor.ts`가 TeamGantt API에서 체크리스트를 조회하지만, 모든 응답이 빈 배열
- `output/tasks/` 디렉토리에 `checklist.json` 파일 0개
- **복구 불가**: TeamGantt API 재접근 없이는 데이터 복구 불가

---

## 3. 복구 스크립트

### 3.1 파일 위치

```
migration/src/repair-all.ts    # 종합 복구 스크립트
```

### 3.2 실행 방법

```bash
cd migration
npm run repair
```

환경 변수 (`.env`):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
IMPORT_TENANT_ID=...
IMPORT_BATCH_SIZE=100
```

### 3.3 복구 단계

```
Phase 1: Repair Groups
├── DB에서 기존 그룹 조회 (tg_id 기준)
├── id-map.json에 누락된 그룹 UUID 매핑 복원
├── 원본 데이터에 있지만 DB에 없는 그룹 삽입 (BFS: 부모 먼저 → 자식)
└── 빈 이름 그룹 skip (project_items_name_check 제약조건)

Phase 2: Repair parent_id
├── 서브그룹 parent_id 수정 (그룹 간 계층)
└── 태스크 parent_id 수정 (태스크 → 부모 그룹)
    └── parentGroupTgId별 배치 UPDATE (.in('tg_id', [...]))

Phase 3: Repair Dependencies
├── 기존 (실패한) 의존성 DELETE
└── project_id 없이 재삽입 (실제 DB 스키마 기준)

Phase 4: Repair Timestamps
└── updated_at 값이 있는 태스크 165건 개별 UPDATE

Phase 5: Checklist Report
└── checklist.json 파일 존재 여부 확인 및 보고 (현재 복구 불가)
```

### 3.4 실행 결과

```
Phase 1: 1,656 existing + 123 inserted = 1,779 groups mapped (3 skipped: empty name)
Phase 2: 123 subgroups + 15,268 tasks parent_id updated (4 skipped: unmapped)
Phase 3: 89/89 dependencies inserted
Phase 4: 165/165 timestamps updated
Phase 5: 0 checklist files found (not recoverable)
```

### 3.5 멱등성(Idempotency)

스크립트는 **여러 번 실행해도 안전**합니다:
- Phase 1: `mapper.has('group', id)` 및 DB 조회로 중복 방지
- Phase 2: parent_id를 덮어쓰므로 재실행 시 동일 결과
- Phase 3: 기존 의존성을 삭제 후 재삽입 (UNIQUE 제약조건 위반 방지)
- Phase 4: updated_at 덮어쓰기

---

## 4. 알려진 잔여 이슈

### 4.1 task_dependencies.project_id 스키마 불일치

| 항목 | 값 |
|------|---|
| SQL 정의 (002_pm.sql) | `project_id UUID NOT NULL REFERENCES projects(id)` |
| 실제 배포 DB | `project_id` 컬럼 없음 |
| RLS 정책 | `project_id` 참조하는 정책이 적용 안 됨 |

**영향**:
- `task_dependencies` 테이블에 RLS 정책이 제대로 동작하지 않을 수 있음
- 현재는 service_role key로 데이터를 관리하므로 문제 없음
- 향후 RLS 기반 접근 제어가 필요하면 마이그레이션으로 컬럼 추가 필요

**수정 방법** (필요 시):
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE public.task_dependencies
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- 기존 행에 project_id 채우기 (predecessor의 project_id 기준)
UPDATE public.task_dependencies td
SET project_id = pi.project_id
FROM public.project_items pi
WHERE td.predecessor_id = pi.id;

-- NOT NULL 제약조건 추가
ALTER TABLE public.task_dependencies
  ALTER COLUMN project_id SET NOT NULL;

-- RLS 정책 재생성
-- (002_pm.sql의 정책 참조)
```

### 4.2 빈 이름 그룹 3개

원본 TeamGantt 데이터에 이름이 빈 문자열(`""`)인 그룹 3개가 존재합니다:
- tg_id: 22603515, 4893408, 4893407
- `project_items_name_check` CHECK 제약조건에 의해 삽입 불가
- 해당 그룹 하위 태스크는 parent_id가 null로 유지

### 4.3 체크리스트 데이터 유실

- TeamGantt API에서 체크리스트 데이터가 추출되지 않았음 (빈 응답)
- 총 1,806건의 체크리스트 항목이 원본에 존재하나 복구 불가
- TeamGantt API에 재접근 가능하면 `task-extractor.ts`를 재실행하여 추출 가능

### 4.4 미임포트 태스크 필드

| 필드 | 원본 존재 | DB 컬럼 | 임포트 여부 |
|------|----------|---------|-----------|
| `updated_at` | 165건 | `updated_at` | ✅ 복구됨 |
| `updated_by` | 165건 | 없음 | ❌ DB 컬럼 부재 |
| `expected_percent_complete` | 일부 | 없음 | ❌ DB 컬럼 부재 |
| `roj` (Return on Job) | 일부 | 없음 | ❌ DB 컬럼 부재 |

---

## 5. 원본 데이터 구조 참조

### children.json 계층 구조

```
project/
└── children.json
    ├── { type: "group", id: X, parent_group_id: null, children: [
    │     ├── { type: "task", id: Y, parent_group_id: X }
    │     ├── { type: "group", id: Z, parent_group_id: X, children: [
    │     │     └── { type: "task", id: W, parent_group_id: Z }
    │     │   ]}
    │   ]}
    └── { type: "task", id: V, parent_group_id: null }  // root-level task
```

### id-map.json 구조

```json
{
  "user":    { "366103": "uuid-..." },
  "project": { "4310261": "uuid-..." },
  "group":   { "34703801": "uuid-..." },
  "task":    { "160898913": "uuid-..." },
  "comment": { "12345": "uuid-..." },
  "document": { "67890": "uuid-..." }
}
```

TeamGantt의 정수 ID (`tg_id`) ↔ Supabase UUID 간의 양방향 매핑을 유지합니다.
`project_items.tg_id` 컬럼이 이 매핑의 DB 측 앵커입니다.

### 의존성(Dependency) 구조

```json
{
  "dependencies": {
    "parents": [{ "id": 123, "from_task_id": A, "to_task_id": B, "type": "FS" }],
    "children": [{ "id": 456, "from_task_id": B, "to_task_id": C, "type": "FS" }]
  }
}
```

동일 의존성이 predecessor의 `children`과 successor의 `parents`에 중복 등장합니다.
`dep.id` 기준으로 중복 제거합니다.
