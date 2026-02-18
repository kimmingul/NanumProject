import type { SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

/**
 * Insert rows in batches with progress logging
 */
export async function batchInsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  batchSize: number = 100,
  label?: string,
): Promise<number> {
  const tag = label ?? table;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      console.error(`[${tag}] Batch ${i / batchSize + 1} error:`, error.message);
      // Try inserting one by one for this batch to identify the problem row
      for (const row of batch) {
        const { error: singleError } = await supabase.from(table).insert(row);
        if (singleError) {
          console.error(`[${tag}] Single row error:`, singleError.message, JSON.stringify(row).slice(0, 200));
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    if (rows.length > batchSize) {
      console.log(`[${tag}] ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }
  }

  console.log(`[${tag}] Done: ${inserted}/${rows.length} inserted`);
  return inserted;
}

/**
 * Convert TeamGantt status string to DB enum value
 */
export function normalizeProjectStatus(status: string): string {
  const map: Record<string, string> = {
    'Active': 'active',
    'active': 'active',
    'Complete': 'complete',
    'complete': 'complete',
    'On Hold': 'on_hold',
    'on_hold': 'on_hold',
    'Archived': 'archived',
    'archived': 'archived',
  };
  return map[status] ?? 'active';
}

/**
 * Convert TeamGantt member status to DB enum value
 */
export function normalizeMemberStatus(status: string): string {
  const map: Record<string, string> = {
    'Accepted': 'accepted',
    'accepted': 'accepted',
    'Pending': 'pending',
    'pending': 'pending',
    'Declined': 'declined',
    'declined': 'declined',
  };
  return map[status] ?? 'pending';
}

/**
 * Convert TeamGantt permission to DB enum value
 */
export function normalizeMemberPermission(permission: string): string {
  const map: Record<string, string> = {
    'admin': 'admin',
    'edit': 'edit',
    'own_progress': 'own_progress',
    'view': 'view',
  };
  return map[permission] ?? 'view';
}

/**
 * Convert TeamGantt dependency type to DB enum value
 */
export function normalizeDependencyType(type: string): string {
  return type.toLowerCase() as string;
}

/**
 * Convert TeamGantt view type to DB enum value
 */
export function normalizeViewType(view: string): string {
  const map: Record<string, string> = {
    'gantt': 'gantt',
    'table': 'list',
    'board': 'board',
    'calendar': 'calendar',
    'list': 'list',
  };
  return map[view] ?? 'gantt';
}

/**
 * Read JSON file
 */
export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

/**
 * Log step header
 */
export function logStep(step: number, name: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Step ${step}: ${name}`);
  console.log('='.repeat(60));
}
