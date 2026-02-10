import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getImportConfig, getSupabaseAdmin } from './supabase-admin.js';
import { IdMapper } from './id-mapper.js';
import { importUsers } from './user-importer.js';
import { importProjects } from './project-importer.js';
import { importGroups } from './group-importer.js';
import { importTasks } from './task-importer.js';
import { importDependencies } from './dependency-importer.js';
import { importComments } from './comment-importer.js';
import { importTimeEntries } from './time-importer.js';

// =============================================
// CLI Arguments
// =============================================
const args = process.argv.slice(2);

const onlyArg = args.find((a) => a.startsWith('--only='));
const onlyStep = onlyArg ? onlyArg.split('=')[1] : null;
const isResume = args.includes('--resume');
const isDryRun = args.includes('--dry-run');

// =============================================
// Paths
// =============================================
const OUTPUT_DIR = join(import.meta.dirname, '..', '..', 'output');
const ID_MAP_PATH = join(OUTPUT_DIR, '_import', 'id-map.json');

// =============================================
// Main
// =============================================
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   TeamGantt → Supabase Importer                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();

  // Validate config
  const config = getImportConfig();
  console.log(`Supabase URL: ${config.SUPABASE_URL}`);
  console.log(`Tenant ID: ${config.IMPORT_TENANT_ID}`);
  console.log(`Batch Size: ${config.IMPORT_BATCH_SIZE}`);
  console.log(`Output Dir: ${OUTPUT_DIR}`);
  console.log();

  if (!existsSync(OUTPUT_DIR)) {
    console.error(`Output directory not found: ${OUTPUT_DIR}`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log('*** DRY RUN MODE — No data will be written ***');
    console.log();
  }

  // Initialize mapper
  const mapper = new IdMapper();

  if (isResume || onlyStep) {
    if (existsSync(ID_MAP_PATH)) {
      mapper.load(ID_MAP_PATH);
      console.log('Loaded existing ID mappings:');
      console.log(mapper.summary());
      console.log();
    } else if (isResume) {
      console.warn('No ID map file found for resume. Starting fresh.');
    }
  }

  // Get Supabase client
  const supabase = getSupabaseAdmin();

  // Define import steps
  const steps: { name: string; key: string; fn: () => Promise<void> }[] = [
    {
      name: 'Users',
      key: 'users',
      fn: () => importUsers(supabase, mapper, config, OUTPUT_DIR),
    },
    {
      name: 'Projects + Members',
      key: 'projects',
      fn: () => importProjects(supabase, mapper, config, OUTPUT_DIR),
    },
    {
      name: 'Task Groups',
      key: 'groups',
      fn: () => importGroups(supabase, mapper, config, OUTPUT_DIR),
    },
    {
      name: 'Tasks + Assignees',
      key: 'tasks',
      fn: () => importTasks(supabase, mapper, config, OUTPUT_DIR),
    },
    {
      name: 'Task Dependencies',
      key: 'dependencies',
      fn: () => importDependencies(supabase, mapper, config, OUTPUT_DIR),
    },
    {
      name: 'Comments + Documents',
      key: 'comments',
      fn: () => importComments(supabase, mapper, config, OUTPUT_DIR),
    },
    {
      name: 'Time Entries',
      key: 'time',
      fn: () => importTimeEntries(supabase, mapper, config, OUTPUT_DIR),
    },
  ];

  // Filter steps if --only is specified
  const stepsToRun = onlyStep
    ? steps.filter((s) => s.key === onlyStep)
    : steps;

  if (onlyStep && stepsToRun.length === 0) {
    console.error(`Unknown step: ${onlyStep}`);
    console.error(`Available steps: ${steps.map((s) => s.key).join(', ')}`);
    process.exit(1);
  }

  console.log(`Steps to run: ${stepsToRun.map((s) => s.name).join(' → ')}`);
  console.log();

  // Execute steps
  const startTime = Date.now();

  for (const step of stepsToRun) {
    try {
      await step.fn();

      // Save mapper after each step for resume
      mapper.save(ID_MAP_PATH);
      console.log(`✓ ${step.name} complete. ID map saved.`);
      console.log();
    } catch (error) {
      console.error(`✗ ${step.name} FAILED:`, error);

      // Save whatever we have so far
      mapper.save(ID_MAP_PATH);
      console.error('ID map saved (partial). Use --resume to continue.');
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Import Complete                                   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Time: ${elapsed}s`);
  console.log();
  console.log('Final ID Mappings:');
  console.log(mapper.summary());
  console.log();
  console.log(`ID map saved to: ${ID_MAP_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
