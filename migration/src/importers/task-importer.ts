import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import { batchInsert, logStep, readJson } from './utils.js';

interface TGResource {
  id: number;
  type_id: number;
  type: string;
  hours_per_day?: number;
  total_hours?: number;
  raci_roles?: string | null;
}

interface TGChild {
  id: number;
  name: string;
  type: 'group' | 'task';
  project_id: number;
  parent_group_id?: number | null;
  wbs?: string;
  sort?: number;
  color?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  percent_complete?: number;
  estimated_hours?: number;
  actual_hours?: number;
  is_critical?: boolean | null;
  slack?: number | null;
  is_starred?: boolean;
  is_time_tracking_enabled?: boolean;
  is_estimated_hours_enabled?: boolean;
  created_at?: string | null;
  custom_field_values?: unknown | null;
  resources?: TGResource[];
  children?: TGChild[];
}

/**
 * Recursively extract all tasks from a children tree.
 */
function collectTasks(children: TGChild[], tasks: TGChild[]): void {
  for (const child of children) {
    if (child.type === 'task') {
      tasks.push(child);
    }
    // Groups may contain nested tasks or subgroups with tasks
    if (child.children && child.children.length > 0) {
      collectTasks(child.children, tasks);
    }
  }
}

/**
 * Import tasks and task assignees from children.json files.
 */
export async function importTasks(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(5, 'Tasks');

  const projectsDir = join(outputDir, 'projects');
  const dirs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const taskRows: Record<string, unknown>[] = [];
  const taskTgIds: number[] = [];
  const assigneeData: { taskTgId: number; projectUuid: string; resource: TGResource }[] = [];

  for (const dirName of dirs) {
    const childrenPath = join(projectsDir, dirName, 'children.json');
    if (!existsSync(childrenPath)) continue;

    const projectTgId = Number(dirName);
    const projectUuid = mapper.get('project', projectTgId);
    if (!projectUuid) continue;

    const children = readJson<TGChild[]>(childrenPath);
    const tasks: TGChild[] = [];
    collectTasks(children, tasks);

    for (const task of tasks) {
      if (mapper.has('task', task.id)) continue;

      // Determine group_id from parent_group_id
      const groupUuid = task.parent_group_id
        ? mapper.get('group', task.parent_group_id)
        : null;

      // Determine if milestone (days=0 or start_date==end_date with days<=1)
      const isMilestone =
        task.days === 0 ||
        (task.start_date != null &&
          task.end_date != null &&
          task.start_date === task.end_date &&
          (task.days ?? 1) <= 1);

      taskRows.push({
        tenant_id: config.IMPORT_TENANT_ID,
        tg_id: task.id,
        project_id: projectUuid,
        group_id: groupUuid ?? null,
        name: task.name,
        wbs: task.wbs ?? null,
        sort_order: task.sort ?? 0,
        color: task.color ?? null,
        start_date: task.start_date ?? null,
        end_date: task.end_date ?? null,
        days: task.days ?? null,
        is_milestone: isMilestone,
        percent_complete: task.percent_complete ?? 0,
        estimated_hours: task.estimated_hours ?? 0,
        actual_hours: task.actual_hours ?? 0,
        is_estimated_hours_enabled: task.is_estimated_hours_enabled ?? false,
        is_critical: task.is_critical ?? null,
        slack: task.slack ?? null,
        is_time_tracking_enabled: task.is_time_tracking_enabled ?? false,
        is_starred: task.is_starred ?? false,
        custom_fields: task.custom_field_values ?? '{}',
        is_active: true,
        created_at: task.created_at ?? new Date().toISOString(),
      });
      taskTgIds.push(task.id);

      // Collect assignee data for later
      if (task.resources) {
        for (const resource of task.resources) {
          if (resource.type !== 'user') continue;
          assigneeData.push({
            taskTgId: task.id,
            projectUuid,
            resource,
          });
        }
      }
    }
  }

  // Batch insert tasks
  console.log(`Found ${taskRows.length} tasks to import`);
  if (taskRows.length > 0) {
    await batchInsert(supabase, 'tasks', taskRows, config.IMPORT_BATCH_SIZE, 'tasks');

    // Fetch back inserted tasks in chunks (Supabase IN clause has limits)
    console.log('Fetching task UUIDs...');
    const chunkSize = 500;
    for (let i = 0; i < taskTgIds.length; i += chunkSize) {
      const chunk = taskTgIds.slice(i, i + chunkSize);
      const { data: inserted, error } = await supabase
        .from('tasks')
        .select('id, tg_id')
        .in('tg_id', chunk);

      if (error) {
        console.error(`Failed to fetch task IDs chunk ${i}:`, error.message);
        continue;
      }

      for (const row of inserted ?? []) {
        if (row.tg_id != null) {
          mapper.set('task', row.tg_id, row.id);
        }
      }
    }
    console.log(`Mapped ${mapper.getEntityCount('task')} task IDs`);
  }

  // Now import assignees
  logStep(6, 'Task Assignees');

  const assigneeRows: Record<string, unknown>[] = [];

  for (const { taskTgId, projectUuid, resource } of assigneeData) {
    const taskUuid = mapper.get('task', taskTgId);
    if (!taskUuid) continue;

    const userUuid = mapper.get('user', resource.type_id);
    if (!userUuid) {
      continue; // Skip if user not mapped
    }

    // Extract first RACI role if present
    let raciRole: string | null = null;
    if (resource.raci_roles) {
      const roles = resource.raci_roles.split(',').map((r) => r.trim().toUpperCase());
      if (roles.length > 0 && ['R', 'A', 'C', 'I'].includes(roles[0])) {
        raciRole = roles[0];
      }
    }

    assigneeRows.push({
      tenant_id: config.IMPORT_TENANT_ID,
      tg_id: resource.id,
      task_id: taskUuid,
      user_id: userUuid,
      project_id: projectUuid,
      hours_per_day: resource.hours_per_day ?? 0,
      total_hours: resource.total_hours ?? 0,
      raci_role: raciRole,
      is_active: true,
    });
  }

  console.log(`Found ${assigneeRows.length} task assignees to import`);
  if (assigneeRows.length > 0) {
    await batchInsert(supabase, 'task_assignees', assigneeRows, config.IMPORT_BATCH_SIZE, 'task_assignees');
  }
}
