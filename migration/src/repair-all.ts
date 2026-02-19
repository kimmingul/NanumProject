/**
 * Comprehensive Migration Repair Script
 *
 * Fixes all known issues from the migration audit:
 *   Phase 1 — Insert missing groups + rebuild ID map
 *   Phase 2 — Fix parent_id for groups and tasks
 *   Phase 3 — Re-import task_dependencies with project_id
 *   Phase 4 — Fix task updated_at / updated_by
 *   Phase 5 — Check checklists (report only if data missing)
 *
 * Usage:
 *   cd migration && npx tsx src/repair-all.ts
 *
 * Requires same .env as the original importer:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_TENANT_ID
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getImportConfig, getSupabaseAdmin, type ImportConfig } from './importers/supabase-admin.js';
import { IdMapper } from './importers/id-mapper.js';
import { batchInsert, readJson, normalizeDependencyType } from './importers/utils.js';

const OUTPUT_DIR = join(import.meta.dirname, '..', 'output');
const ID_MAP_PATH = join(OUTPUT_DIR, '_import', 'id-map.json');

// ─── Types ─────────────────────────────────────────────

interface TGDependency {
  id: number;
  project_id: number;
  from_task_id: number;
  to_task_id: number;
  type: string;
  lead_lag_time?: number;
}

interface TGChild {
  id: number;
  name: string;
  type: 'group' | 'subgroup' | 'task';
  project_id: number;
  parent_group_id?: number | null;
  wbs?: string;
  sort?: number;
  color?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  percent_complete?: number;
  updated_at?: string | null;
  updated_by?: number | null;
  dependencies?: {
    parents?: TGDependency[];
    children?: TGDependency[];
  };
  checklist_info?: { count: number; completed: number };
  children?: TGChild[];
}

interface GroupInfo {
  tgId: number;
  projectTgId: number;
  parentGroupTgId: number | null;
  name: string;
  wbs: string | null;
  sortOrder: number;
  color: string | null;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  percentComplete: number;
}

interface TaskParentInfo {
  taskTgId: number;
  parentGroupTgId: number;
}

interface DepInfo {
  id: number;
  projectTgId: number;
  fromTaskTgId: number;
  toTaskTgId: number;
  type: string;
  lagDays: number;
}

interface TaskTimestampInfo {
  taskTgId: number;
  updatedAt: string | null;
  updatedByTgId: number | null;
}

// ─── Data Collection ───────────────────────────────────

function collectAllData(mapper: IdMapper) {
  const projectsDir = join(OUTPUT_DIR, 'projects');
  const dirs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const groups: GroupInfo[] = [];
  const taskParents: TaskParentInfo[] = [];
  const deps = new Map<number, DepInfo>();
  const taskTimestamps: TaskTimestampInfo[] = [];
  let totalChecklistItems = 0;

  function walkTree(children: TGChild[], projectTgId: number): void {
    for (const child of children) {
      if (child.type === 'group' || child.type === 'subgroup') {
        groups.push({
          tgId: child.id,
          projectTgId,
          parentGroupTgId: child.parent_group_id ?? null,
          name: child.name,
          wbs: child.wbs ?? null,
          sortOrder: child.sort ?? 0,
          color: child.color ?? null,
          startDate: child.start_date ?? null,
          endDate: child.end_date ?? null,
          days: child.days ?? null,
          percentComplete: child.percent_complete ?? 0,
        });
      } else if (child.type === 'task') {
        if (child.parent_group_id) {
          taskParents.push({
            taskTgId: child.id,
            parentGroupTgId: child.parent_group_id,
          });
        }

        if (child.updated_at || child.updated_by) {
          taskTimestamps.push({
            taskTgId: child.id,
            updatedAt: child.updated_at ?? null,
            updatedByTgId: child.updated_by ?? null,
          });
        }

        if (child.checklist_info && child.checklist_info.count > 0) {
          totalChecklistItems += child.checklist_info.count;
        }

        // Collect dependencies (dedup by dep.id)
        if (child.dependencies) {
          for (const dep of child.dependencies.parents ?? []) {
            if (!deps.has(dep.id)) {
              deps.set(dep.id, {
                id: dep.id,
                projectTgId: dep.project_id || projectTgId,
                fromTaskTgId: dep.from_task_id,
                toTaskTgId: dep.to_task_id,
                type: dep.type,
                lagDays: dep.lead_lag_time ?? 0,
              });
            }
          }
          for (const dep of child.dependencies.children ?? []) {
            if (!deps.has(dep.id)) {
              deps.set(dep.id, {
                id: dep.id,
                projectTgId: dep.project_id || projectTgId,
                fromTaskTgId: dep.from_task_id,
                toTaskTgId: dep.to_task_id,
                type: dep.type,
                lagDays: dep.lead_lag_time ?? 0,
              });
            }
          }
        }
      }

      if (child.children && child.children.length > 0) {
        walkTree(child.children, projectTgId);
      }
    }
  }

  for (const dirName of dirs) {
    const childrenPath = join(projectsDir, dirName, 'children.json');
    if (!existsSync(childrenPath)) continue;

    const projectTgId = Number(dirName);
    if (!mapper.has('project', projectTgId)) continue;

    const children = readJson<TGChild[]>(childrenPath);
    walkTree(children, projectTgId);
  }

  return {
    groups,
    taskParents,
    deps: [...deps.values()],
    taskTimestamps,
    totalChecklistItems,
  };
}

// ─── Phase 1: Repair Groups ───────────────────────────

async function repairGroups(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  groups: GroupInfo[],
): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 1: Repair Groups');
  console.log('='.repeat(60));
  console.log(`Total groups in original data: ${groups.length}`);

  if (groups.length === 0) {
    console.log('No groups found. Skipping.');
    return;
  }

  // 1. Query existing groups from DB by tg_id
  const allTgIds = groups.map((g) => g.tgId);
  const existingGroups = new Map<number, string>(); // tg_id → uuid
  const CHUNK = 500;

  for (let i = 0; i < allTgIds.length; i += CHUNK) {
    const chunk = allTgIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('project_items')
      .select('id, tg_id')
      .eq('tenant_id', config.IMPORT_TENANT_ID)
      .eq('item_type', 'group')
      .in('tg_id', chunk);

    if (error) {
      console.error(`  Error querying groups chunk ${i}: ${error.message}`);
      continue;
    }
    for (const row of data ?? []) {
      if (row.tg_id != null) existingGroups.set(row.tg_id, row.id);
    }
  }

  console.log(`  Existing groups in DB: ${existingGroups.size}`);

  // 2. Update mapper with what already exists
  for (const [tgId, uuid] of existingGroups) {
    mapper.set('group', tgId, uuid);
  }

  // 3. Insert missing groups (BFS by depth to handle parent references)
  const missing = groups.filter((g) => !existingGroups.has(g.tgId));
  console.log(`  Missing groups to insert: ${missing.length}`);

  if (missing.length > 0) {
    const inserted = new Set(existingGroups.keys());
    let remaining = [...missing];
    let pass = 0;

    while (remaining.length > 0) {
      pass++;

      // Groups whose parent is already inserted or parent is null (root)
      const ready = remaining.filter(
        (g) => g.parentGroupTgId === null || inserted.has(g.parentGroupTgId),
      );

      if (ready.length === 0) {
        // Orphaned groups — insert with null parent to break the cycle
        console.warn(`  Pass ${pass}: ${remaining.length} orphaned groups, inserting with null parent`);
        for (const g of remaining) ready.push(g);
      }

      const rows = ready
        .filter((g) => g.name.trim().length > 0) // skip empty-name groups
        .map((g) => ({
        tenant_id: config.IMPORT_TENANT_ID,
        tg_id: g.tgId,
        project_id: mapper.get('project', g.projectTgId),
        parent_id: g.parentGroupTgId ? (mapper.get('group', g.parentGroupTgId) ?? null) : null,
        item_type: 'group',
        name: g.name,
        wbs: g.wbs,
        sort_order: g.sortOrder,
        color: g.color,
        start_date: g.startDate,
        end_date: g.endDate,
        days: g.days,
        percent_complete: g.percentComplete,
        is_milestone: false,
        is_active: true,
      }));

      console.log(`  Pass ${pass}: inserting ${rows.length} groups`);
      await batchInsert(supabase, 'project_items', rows, config.IMPORT_BATCH_SIZE, `groups/pass${pass}`);

      // Fetch back UUIDs
      const readyTgIds = ready.map((g) => g.tgId);
      for (let i = 0; i < readyTgIds.length; i += CHUNK) {
        const chunk = readyTgIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('project_items')
          .select('id, tg_id')
          .eq('item_type', 'group')
          .in('tg_id', chunk);

        if (error) {
          console.error(`  Error fetching inserted group IDs: ${error.message}`);
          continue;
        }
        for (const row of data ?? []) {
          if (row.tg_id != null) {
            mapper.set('group', row.tg_id, row.id);
            inserted.add(row.tg_id);
          }
        }
      }

      remaining = remaining.filter((g) => !inserted.has(g.tgId));
      if (ready.length === remaining.length && remaining.length > 0) break; // prevent infinite loop
    }
  }

  console.log(`  Total groups mapped: ${mapper.getEntityCount('group')}`);
}

// ─── Phase 2: Repair parent_id ─────────────────────────

async function repairParentIds(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  groups: GroupInfo[],
  taskParents: TaskParentInfo[],
): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 2: Repair parent_id (groups + tasks)');
  console.log('='.repeat(60));

  const CHUNK = 500;
  let updatedCount = 0;
  let skippedCount = 0;

  // 2a. Fix group parent_id (subgroups → parent group)
  const subGroups = groups.filter((g) => g.parentGroupTgId !== null);
  console.log(`  Subgroups needing parent_id: ${subGroups.length}`);

  // Group by parentGroupTgId for batch updates
  const groupsByParent = new Map<number, number[]>();
  for (const g of subGroups) {
    const key = g.parentGroupTgId!;
    if (!groupsByParent.has(key)) groupsByParent.set(key, []);
    groupsByParent.get(key)!.push(g.tgId);
  }

  for (const [parentTgId, childTgIds] of groupsByParent) {
    const parentUuid = mapper.get('group', parentTgId);
    if (!parentUuid) {
      skippedCount += childTgIds.length;
      continue;
    }

    for (let i = 0; i < childTgIds.length; i += CHUNK) {
      const chunk = childTgIds.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('project_items')
        .update({ parent_id: parentUuid })
        .in('tg_id', chunk);

      if (error) {
        console.error(`  Error updating group parent_id: ${error.message}`);
      } else {
        updatedCount += chunk.length;
      }
    }
  }
  console.log(`  Groups updated: ${updatedCount}, skipped: ${skippedCount}`);

  // 2b. Fix task parent_id (task → parent group)
  console.log(`  Tasks needing parent_id: ${taskParents.length}`);
  updatedCount = 0;
  skippedCount = 0;

  // Group by parentGroupTgId for batch updates
  const tasksByParent = new Map<number, number[]>();
  for (const { taskTgId, parentGroupTgId } of taskParents) {
    if (!tasksByParent.has(parentGroupTgId)) tasksByParent.set(parentGroupTgId, []);
    tasksByParent.get(parentGroupTgId)!.push(taskTgId);
  }

  for (const [parentTgId, taskTgIds] of tasksByParent) {
    const parentUuid = mapper.get('group', parentTgId);
    if (!parentUuid) {
      skippedCount += taskTgIds.length;
      continue;
    }

    for (let i = 0; i < taskTgIds.length; i += CHUNK) {
      const chunk = taskTgIds.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('project_items')
        .update({ parent_id: parentUuid })
        .in('tg_id', chunk);

      if (error) {
        console.error(`  Error updating task parent_id: ${error.message}`);
      } else {
        updatedCount += chunk.length;
      }
    }
  }
  console.log(`  Tasks updated: ${updatedCount}, skipped: ${skippedCount}`);
}

// ─── Phase 3: Repair Dependencies ──────────────────────

async function repairDependencies(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  deps: DepInfo[],
): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 3: Repair Task Dependencies');
  console.log('='.repeat(60));
  console.log(`  Total unique dependencies in original data: ${deps.length}`);

  // 1. Delete any existing broken dependencies for this tenant
  const { error: delErr } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('tenant_id', config.IMPORT_TENANT_ID);

  if (delErr) {
    console.error(`  Error deleting existing dependencies: ${delErr.message}`);
  } else {
    console.log('  Deleted existing (broken) dependencies');
  }

  // 2. Build dependency rows
  // Note: project_id column does NOT exist in the deployed task_dependencies table
  // (migration 002_pm.sql defined it but it was never applied)
  const depRows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const dep of deps) {
    const predecessorUuid = mapper.get('task', dep.fromTaskTgId);
    const successorUuid = mapper.get('task', dep.toTaskTgId);

    if (!predecessorUuid || !successorUuid) { skipped++; continue; }
    if (predecessorUuid === successorUuid) { skipped++; continue; }

    depRows.push({
      tenant_id: config.IMPORT_TENANT_ID,
      predecessor_id: predecessorUuid,
      successor_id: successorUuid,
      dependency_type: normalizeDependencyType(dep.type || 'FS'),
      lag_days: dep.lagDays,
    });
  }

  console.log(`  Dependencies to insert: ${depRows.length}, skipped: ${skipped}`);

  if (depRows.length > 0) {
    await batchInsert(supabase, 'task_dependencies', depRows, config.IMPORT_BATCH_SIZE, 'task_dependencies');
  }
}

// ─── Phase 4: Repair Task Timestamps ───────────────────

async function repairTaskTimestamps(
  supabase: SupabaseClient,
  mapper: IdMapper,
  _config: ImportConfig,
  timestamps: TaskTimestampInfo[],
): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 4: Repair Task Timestamps (updated_at)');
  console.log('='.repeat(60));

  const updatable = timestamps.filter((t) => t.updatedAt);
  console.log(`  Tasks with updated_at to fix: ${updatable.length}`);

  if (updatable.length === 0) {
    console.log('  Nothing to update.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  // Batch by processing in groups of 50 individual updates
  for (let i = 0; i < updatable.length; i += 50) {
    const batch = updatable.slice(i, i + 50);

    for (const { taskTgId, updatedAt } of batch) {
      const taskUuid = mapper.get('task', taskTgId);
      if (!taskUuid) { skipped++; continue; }

      const { error } = await supabase
        .from('project_items')
        .update({ updated_at: updatedAt })
        .eq('id', taskUuid);

      if (error) {
        console.error(`  Error updating task ${taskTgId}: ${error.message}`);
      } else {
        updated++;
      }
    }

    if (updatable.length > 100) {
      console.log(`  Progress: ${Math.min(i + 50, updatable.length)}/${updatable.length}`);
    }
  }

  console.log(`  Updated: ${updated}, skipped: ${skipped}`);
}

// ─── Phase 5: Checklist Report ─────────────────────────

function reportChecklists(totalChecklistItems: number): void {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 5: Checklist Status');
  console.log('='.repeat(60));

  // Check if any checklist.json files exist
  const tasksDir = join(OUTPUT_DIR, 'tasks');
  let found = 0;

  if (existsSync(tasksDir)) {
    const dirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const dir of dirs) {
      if (existsSync(join(tasksDir, dir.name, 'checklist.json'))) {
        found++;
      }
    }
  }

  if (totalChecklistItems > 0) {
    console.log(`  Original data references ${totalChecklistItems} checklist items`);
  }

  if (found === 0) {
    console.log('  No checklist.json files found in output/tasks/');
    console.log('  Checklist data was not extracted from TeamGantt API.');
    console.log('  This data cannot be recovered without re-running the extractor.');
  } else {
    console.log(`  Found ${found} checklist files — import not yet implemented.`);
  }
}

// ─── Main ──────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Comprehensive Migration Repair                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();

  const config = getImportConfig();
  const supabase = getSupabaseAdmin();
  const mapper = new IdMapper();

  if (existsSync(ID_MAP_PATH)) {
    mapper.load(ID_MAP_PATH);
  }

  console.log('Current ID Map:');
  console.log(mapper.summary());

  // Collect all data from original files
  console.log('\nScanning original children.json files...');
  const { groups, taskParents, deps, taskTimestamps, totalChecklistItems } =
    collectAllData(mapper);

  console.log(`  Groups found:      ${groups.length}`);
  console.log(`  Task→parent refs:  ${taskParents.length}`);
  console.log(`  Dependencies:      ${deps.length}`);
  console.log(`  Timestamp updates: ${taskTimestamps.length}`);
  console.log(`  Checklist items:   ${totalChecklistItems} (in original data)`);

  const startTime = Date.now();

  // Phase 1: Groups
  await repairGroups(supabase, mapper, config, groups);
  mapper.save(ID_MAP_PATH);
  console.log('  ID map saved.');

  // Phase 2: Parent IDs
  await repairParentIds(supabase, mapper, config, groups, taskParents);

  // Phase 3: Dependencies
  await repairDependencies(supabase, mapper, config, deps);

  // Phase 4: Timestamps
  await repairTaskTimestamps(supabase, mapper, config, taskTimestamps);

  // Phase 5: Checklists (report only)
  reportChecklists(totalChecklistItems);

  // Save final mapper
  mapper.save(ID_MAP_PATH);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('REPAIR COMPLETE');
  console.log('='.repeat(60));
  console.log(`Time: ${elapsed}s`);
  console.log();
  console.log('Final ID Mappings:');
  console.log(mapper.summary());
  console.log(`\nID map saved to: ${ID_MAP_PATH}`);
}

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
