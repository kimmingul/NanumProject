import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import { batchInsert, logStep, readJson } from './utils.js';

interface TGTimeBlock {
  id: number;
  task_id: number;
  project_id: number;
  user_id: number;
  type: string;
  start_time: string;
  end_time: string | null;
}

/**
 * Import time tracking entries.
 */
export async function importTimeEntries(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(10, 'Time Entries');

  const timeBlocksPath = join(outputDir, 'time-tracking', 'time-blocks.json');
  if (!existsSync(timeBlocksPath)) {
    console.log('No time-blocks.json found, skipping');
    return;
  }

  const timeBlocks = readJson<TGTimeBlock[]>(timeBlocksPath);
  console.log(`Found ${timeBlocks.length} time blocks`);

  const rows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const block of timeBlocks) {
    const projectUuid = mapper.get('project', block.project_id);
    const taskUuid = mapper.get('task', block.task_id);
    const userUuid = mapper.get('user', block.user_id);

    if (!projectUuid || !taskUuid || !userUuid) {
      skipped++;
      continue;
    }

    // Normalize type: TeamGantt uses 'punched' and 'entered'
    const entryType = block.type === 'entered' ? 'manual' : 'punched';

    // Calculate duration if both start and end are present
    let durationMinutes: number | null = null;
    if (block.start_time && block.end_time) {
      const startMs = new Date(block.start_time).getTime();
      const endMs = new Date(block.end_time).getTime();
      durationMinutes = Math.round((endMs - startMs) / 60000);
    }

    rows.push({
      tenant_id: config.IMPORT_TENANT_ID,
      tg_id: block.id,
      project_id: projectUuid,
      item_id: taskUuid,
      user_id: userUuid,
      entry_type: entryType,
      start_time: block.start_time,
      end_time: block.end_time ?? null,
      duration_minutes: durationMinutes,
      is_active: true,
    });
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} time entries (unmapped references)`);
  }

  if (rows.length > 0) {
    await batchInsert(supabase, 'time_entries', rows, config.IMPORT_BATCH_SIZE, 'time_entries');
  }
}
