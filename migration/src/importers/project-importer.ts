import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import {
  batchInsert,
  logStep,
  normalizeProjectStatus,
  normalizeMemberPermission,
  normalizeMemberStatus,
  normalizeViewType,
} from './utils.js';

interface TGAccess {
  id: number;
  user_id: number;
  permission: string;
  status: string;
  color?: string | null;
}

interface TGProject {
  id: number;
  name: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  chart_days?: number[];
  default_view?: string;
  is_template?: boolean;
  is_starred?: boolean;
  has_hours_enabled?: boolean;
  lock_milestone_dates?: boolean;
  allow_scheduling_on_holidays?: boolean;
  in_resource_management?: boolean;
  is_disabled?: boolean;
  created_date?: string;
  accesses?: TGAccess[];
}

export async function importProjects(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(2, 'Projects');

  const projectsDir = join(outputDir, 'projects');
  const dirs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`Found ${dirs.length} project directories`);

  const projectRows: Record<string, unknown>[] = [];
  const memberRows: Record<string, unknown>[] = [];
  const projectTgIds: number[] = [];

  for (const dirName of dirs) {
    const projectPath = join(projectsDir, dirName, 'project.json');
    if (!existsSync(projectPath)) continue;

    const project: TGProject = JSON.parse(readFileSync(projectPath, 'utf-8'));
    const tgId = project.id;

    // Skip if already mapped
    if (mapper.has('project', tgId)) continue;

    projectRows.push({
      tenant_id: config.IMPORT_TENANT_ID,
      tg_id: tgId,
      name: project.name,
      status: normalizeProjectStatus(project.status ?? 'active'),
      default_view: normalizeViewType(project.default_view ?? 'gantt'),
      start_date: project.start_date ?? null,
      end_date: project.end_date ?? null,
      work_days: project.chart_days ?? [1, 2, 3, 4, 5],
      is_template: project.is_template ?? false,
      is_starred: project.is_starred ?? false,
      has_hours_enabled: project.has_hours_enabled ?? false,
      lock_milestone_dates: project.lock_milestone_dates ?? false,
      allow_scheduling_on_holidays: project.allow_scheduling_on_holidays ?? false,
      in_resource_management: project.in_resource_management ?? false,
      is_active: !(project.is_disabled ?? false),
      created_at: project.created_date ?? new Date().toISOString(),
    });
    projectTgIds.push(tgId);
  }

  // Batch insert projects
  if (projectRows.length > 0) {
    await batchInsert(supabase, 'projects', projectRows, config.IMPORT_BATCH_SIZE, 'projects');

    // Fetch back inserted projects to get UUIDs via tg_id
    const { data: inserted, error } = await supabase
      .from('projects')
      .select('id, tg_id')
      .in('tg_id', projectTgIds);

    if (error) {
      console.error('Failed to fetch inserted projects:', error.message);
      return;
    }

    for (const row of inserted ?? []) {
      if (row.tg_id != null) {
        mapper.set('project', row.tg_id, row.id);
      }
    }
    console.log(`Mapped ${inserted?.length ?? 0} project IDs`);
  }

  // Now import members
  logStep(3, 'Project Members');

  for (const dirName of dirs) {
    const projectPath = join(projectsDir, dirName, 'project.json');
    if (!existsSync(projectPath)) continue;

    const project: TGProject = JSON.parse(readFileSync(projectPath, 'utf-8'));
    const projectUuid = mapper.get('project', project.id);
    if (!projectUuid) continue;

    for (const access of project.accesses ?? []) {
      const userUuid = mapper.get('user', access.user_id);
      if (!userUuid) {
        continue; // Skip members not in user mapping
      }

      memberRows.push({
        tenant_id: config.IMPORT_TENANT_ID,
        tg_id: access.id,
        project_id: projectUuid,
        user_id: userUuid,
        permission: normalizeMemberPermission(access.permission),
        status: normalizeMemberStatus(access.status),
        color: access.color ?? null,
        is_active: true,
      });
    }
  }

  if (memberRows.length > 0) {
    await batchInsert(supabase, 'project_members', memberRows, config.IMPORT_BATCH_SIZE, 'project_members');
  }
}
