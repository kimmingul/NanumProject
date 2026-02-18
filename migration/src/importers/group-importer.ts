import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import { batchInsert, logStep, readJson } from './utils.js';

interface TGChild {
  id: number;
  name: string;
  type: 'group' | 'task';
  project_id: number;
  parent_group_id?: number | null;
  parent_group_name?: string | null;
  wbs?: string;
  sort?: number;
  color?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  percent_complete?: number;
  children?: TGChild[];
}

/**
 * Import task groups from children.json files.
 * 2-pass approach: top-level groups first, then subgroups.
 */
export async function importGroups(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(4, 'Task Groups (2-pass)');

  const projectsDir = join(outputDir, 'projects');
  const dirs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Collect all groups from all projects
  const topGroups: Record<string, unknown>[] = [];
  const subGroups: { row: Record<string, unknown>; parentTgId: number }[] = [];
  const topGroupTgIds: number[] = [];
  const subGroupTgIds: number[] = [];

  for (const dirName of dirs) {
    const childrenPath = join(projectsDir, dirName, 'children.json');
    if (!existsSync(childrenPath)) continue;

    const projectTgId = Number(dirName);
    const projectUuid = mapper.get('project', projectTgId);
    if (!projectUuid) continue;

    const children = readJson<TGChild[]>(childrenPath);

    for (const child of children) {
      if (child.type !== 'group') continue;
      if (mapper.has('group', child.id)) continue;

      // Top-level group
      topGroups.push({
        tenant_id: config.IMPORT_TENANT_ID,
        tg_id: child.id,
        project_id: projectUuid,
        parent_id: null,
        item_type: 'group',
        name: child.name,
        wbs: child.wbs ?? null,
        sort_order: child.sort ?? 0,
        color: child.color ?? null,
        start_date: child.start_date ?? null,
        end_date: child.end_date ?? null,
        days: child.days ?? null,
        percent_complete: child.percent_complete ?? 0,
        is_milestone: false,
        is_active: true,
      });
      topGroupTgIds.push(child.id);

      // Check for subgroups among this group's children
      if (child.children) {
        for (const subChild of child.children) {
          if (subChild.type !== 'group') continue;
          if (mapper.has('group', subChild.id)) continue;

          subGroups.push({
            row: {
              tenant_id: config.IMPORT_TENANT_ID,
              tg_id: subChild.id,
              project_id: projectUuid,
              // parent_id will be set after pass 1
              item_type: 'group',
              name: subChild.name,
              wbs: subChild.wbs ?? null,
              sort_order: subChild.sort ?? 0,
              color: subChild.color ?? null,
              start_date: subChild.start_date ?? null,
              end_date: subChild.end_date ?? null,
              days: subChild.days ?? null,
              percent_complete: subChild.percent_complete ?? 0,
              is_milestone: false,
              is_active: true,
            },
            parentTgId: child.id,
          });
          subGroupTgIds.push(subChild.id);
        }
      }
    }
  }

  // Pass 1: Insert top-level groups
  console.log(`Pass 1: ${topGroups.length} top-level groups`);
  if (topGroups.length > 0) {
    await batchInsert(supabase, 'project_items', topGroups, config.IMPORT_BATCH_SIZE, 'project_items (groups/top)');

    // Fetch back UUIDs
    const { data: inserted, error } = await supabase
      .from('project_items')
      .select('id, tg_id')
      .in('tg_id', topGroupTgIds);

    if (error) {
      console.error('Failed to fetch inserted top groups:', error.message);
      return;
    }

    for (const row of inserted ?? []) {
      if (row.tg_id != null) {
        mapper.set('group', row.tg_id, row.id);
      }
    }
    console.log(`Mapped ${inserted?.length ?? 0} top-level group IDs`);
  }

  // Pass 2: Insert subgroups (now parent_group_id is available)
  console.log(`Pass 2: ${subGroups.length} subgroups`);
  if (subGroups.length > 0) {
    const subGroupRows: Record<string, unknown>[] = [];

    for (const { row, parentTgId } of subGroups) {
      const parentUuid = mapper.get('group', parentTgId);
      if (!parentUuid) {
        console.warn(`Skipping subgroup ${row.tg_id}: parent group ${parentTgId} not mapped`);
        continue;
      }
      row.parent_id = parentUuid;
      subGroupRows.push(row);
    }

    if (subGroupRows.length > 0) {
      await batchInsert(supabase, 'project_items', subGroupRows, config.IMPORT_BATCH_SIZE, 'project_items (groups/sub)');

      // Fetch back UUIDs for subgroups
      const { data: inserted, error } = await supabase
        .from('project_items')
        .select('id, tg_id')
        .in('tg_id', subGroupTgIds);

      if (error) {
        console.error('Failed to fetch inserted subgroups:', error.message);
        return;
      }

      for (const row of inserted ?? []) {
        if (row.tg_id != null) {
          mapper.set('group', row.tg_id, row.id);
        }
      }
      console.log(`Mapped ${inserted?.length ?? 0} subgroup IDs`);
    }
  }

  console.log(`Total groups mapped: ${mapper.getEntityCount('group')}`);
}
