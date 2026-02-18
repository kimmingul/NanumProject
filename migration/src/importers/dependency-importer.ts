import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import { batchInsert, logStep, normalizeDependencyType, readJson } from './utils.js';

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
  type: 'group' | 'task';
  dependencies?: {
    parents?: TGDependency[];
    children?: TGDependency[];
  };
  children?: TGChild[];
}

/**
 * Recursively collect all dependency objects from a children tree.
 * Uses a Set to deduplicate by dependency ID since the same dependency
 * appears in both the predecessor's "children" and the successor's "parents".
 */
function collectDependencies(
  children: TGChild[],
  depMap: Map<number, TGDependency>,
): void {
  for (const child of children) {
    if (child.type === 'task' && child.dependencies) {
      // Collect from both parents and children arrays
      for (const dep of child.dependencies.parents ?? []) {
        if (!depMap.has(dep.id)) {
          depMap.set(dep.id, dep);
        }
      }
      for (const dep of child.dependencies.children ?? []) {
        if (!depMap.has(dep.id)) {
          depMap.set(dep.id, dep);
        }
      }
    }
    if (child.children && child.children.length > 0) {
      collectDependencies(child.children, depMap);
    }
  }
}

/**
 * Import task dependencies from children.json files.
 */
export async function importDependencies(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(7, 'Task Dependencies');

  const projectsDir = join(outputDir, 'projects');
  const dirs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Global dedup map across all projects
  const allDeps = new Map<number, TGDependency>();

  for (const dirName of dirs) {
    const childrenPath = join(projectsDir, dirName, 'children.json');
    if (!existsSync(childrenPath)) continue;

    const children = readJson<TGChild[]>(childrenPath);
    collectDependencies(children, allDeps);
  }

  console.log(`Found ${allDeps.size} unique dependencies`);

  const depRows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const dep of allDeps.values()) {
    const predecessorUuid = mapper.get('task', dep.from_task_id);
    const successorUuid = mapper.get('task', dep.to_task_id);

    if (!predecessorUuid || !successorUuid) {
      skipped++;
      continue;
    }

    // Skip self-dependencies
    if (predecessorUuid === successorUuid) {
      skipped++;
      continue;
    }

    depRows.push({
      tenant_id: config.IMPORT_TENANT_ID,
      predecessor_id: predecessorUuid,
      successor_id: successorUuid,
      dependency_type: normalizeDependencyType(dep.type || 'FS'),
      lag_days: dep.lead_lag_time ?? 0,
    });
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} dependencies (unmapped tasks or self-refs)`);
  }

  if (depRows.length > 0) {
    await batchInsert(supabase, 'task_dependencies', depRows, config.IMPORT_BATCH_SIZE, 'task_dependencies');
  }
}
