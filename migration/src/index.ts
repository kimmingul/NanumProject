import { resolve } from 'node:path';
import { getConfig } from './config.js';
import { Logger } from './utils/logger.js';
import { FileWriter } from './utils/file-writer.js';
import { ProgressTracker } from './utils/progress.js';
import { ApiClient } from './api/client.js';
import { CognitoAuth } from './api/cognito-auth.js';
import { runDiscovery, extractCompanyData } from './extractors/company-extractor.js';
import { extractProjects, extractProjectDetails } from './extractors/project-extractor.js';
import { extractTasks } from './extractors/task-extractor.js';
import { extractProjectComments } from './extractors/comment-extractor.js';
import { extractTimeTracking } from './extractors/time-extractor.js';
import { extractBoards } from './extractors/board-extractor.js';
import { extractDocuments } from './extractors/document-extractor.js';
import type { CliArgs } from './types/migration.js';

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    discoverOnly: args.includes('--discover-only'),
    verifyOnly: args.includes('--verify-only'),
    resume: args.includes('--resume'),
    skipDocuments: args.includes('--skip-documents'),
    entity: args.find(a => a.startsWith('--entity='))?.split('=')[1],
  };
}

async function main() {
  const config = getConfig();
  const cliArgs = parseArgs();
  const outputDir = resolve(config.OUTPUT_DIR);

  const logger = new Logger(
    config.LOG_LEVEL,
    resolve(outputDir, '_metadata', 'migration-log.json'),
  );

  const writer = new FileWriter(outputDir);
  const progress = new ProgressTracker(writer, cliArgs.resume);

  const cognitoAuth = new CognitoAuth(
    {
      region: config.COGNITO_REGION,
      userPoolId: config.COGNITO_USER_POOL_ID,
      clientId: config.COGNITO_CLIENT_ID,
      refreshToken: config.COGNITO_REFRESH_TOKEN,
    },
    logger,
  );

  const client = new ApiClient({
    baseUrl: config.TEAMGANTT_BASE_URL,
    cognitoAuth,
    maxConcurrency: config.MAX_CONCURRENCY,
    requestTimeoutMs: 30000,
    downloadTimeoutMs: 120000,
    logger,
  });

  logger.info('========================================');
  logger.info('TeamGantt Data Migration');
  logger.info('========================================');
  logger.info(`Base URL: ${config.TEAMGANTT_BASE_URL}`);
  logger.info(`Output: ${outputDir}`);
  logger.info(`Resume: ${cliArgs.resume}`);
  logger.info(`Skip Documents: ${cliArgs.skipDocuments}`);
  logger.info('');

  try {
    // Phase 1: Discovery
    const discovery = await runDiscovery(client, logger, writer, progress);

    if (cliArgs.discoverOnly) {
      logger.info('Discovery-only mode. Exiting.');
      printSummary(progress, logger);
      return;
    }

    // Phase 2: Company Data
    await extractCompanyData(client, discovery.companyId, logger, writer, progress);

    // Phase 3: Projects List
    const projects = await extractProjects(client, logger, writer, progress);

    // Phase 4: Project Details (fetch hierarchy, discover tasks)
    await extractProjectDetails(client, projects, logger, writer, progress);

    // Phase 5: Task Details
    await extractTasks(client, logger, writer, progress);

    // Extract project-level comments (task comments are extracted in task-extractor)
    await extractProjectComments(client, projects, logger, writer, progress);

    // Phase 6: Time Tracking
    await extractTimeTracking(client, logger, writer, progress);

    // Phase 7: Boards
    await extractBoards(client, logger, writer, progress);

    // Phase 8: Documents
    await extractDocuments(
      client,
      logger,
      writer,
      progress,
      cliArgs.skipDocuments || !config.DOWNLOAD_DOCUMENTS,
    );

    // Phase 9: Verification
    await runVerification(writer, progress, logger);

    logger.info('');
    logger.info('========================================');
    logger.info('Migration completed successfully!');
    logger.info('========================================');
    printSummary(progress, logger);
  } catch (err) {
    logger.error('Migration failed with fatal error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    progress.save();
    process.exit(1);
  }
}

async function runVerification(
  writer: FileWriter,
  progress: ProgressTracker,
  logger: Logger,
): Promise<void> {
  if (progress.isPhaseCompleted('verification')) {
    logger.info('Verification phase already completed, skipping');
    return;
  }

  progress.startPhase('verification');
  logger.info('=== Phase 9: Verification ===');

  const state = progress.getState();
  const errors = state.errors;

  const report = {
    timestamp: new Date().toISOString(),
    overall: errors.length === 0 ? 'pass' : 'warnings',
    summary: {
      projectsCompleted: state.completedProjectIds.length,
      tasksCompleted: state.completedTaskIds.length,
      tasksDiscovered: state.discoveredTaskIds.length,
      groupsDiscovered: state.discoveredGroupIds.length,
      documentsQueued: state.documentQueue.length,
      errorsCount: errors.length,
    },
    phases: state.phases,
    errors: errors.slice(0, 100), // Keep first 100 errors in report
  };

  writer.writeJson('verification/integrity-check.json', report);

  if (errors.length > 0) {
    logger.warn(`Verification found ${errors.length} errors during migration`);
  } else {
    logger.info('Verification passed: no errors found');
  }

  progress.completePhase('verification');
}

function printSummary(progress: ProgressTracker, logger: Logger): void {
  const state = progress.getState();
  logger.info('');
  logger.info('--- Migration Summary ---');

  for (const [name, phase] of Object.entries(state.phases)) {
    const status = phase.status.toUpperCase().padEnd(12);
    const items = phase.itemsTotal > 0 ? `${phase.itemsProcessed}/${phase.itemsTotal}` : '-';
    logger.info(`  ${name.padEnd(16)} ${status} ${items}`);
  }

  logger.info('');
  logger.info(`  Total errors: ${state.errors.length}`);
  logger.info(`  Projects completed: ${state.completedProjectIds.length}`);
  logger.info(`  Tasks completed: ${state.completedTaskIds.length}`);
  logger.info(`  Documents queued: ${state.documentQueue.length}`);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
