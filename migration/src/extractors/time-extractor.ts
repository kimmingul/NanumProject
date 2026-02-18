import { ApiClient } from '../api/client.js';
import { listTimeBlocks } from '../api/endpoints/time-tracking.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';

export async function extractTimeTracking(
  client: ApiClient,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<void> {
  if (progress.isPhaseCompleted('timeTracking')) {
    logger.info('Time tracking phase already completed, skipping');
    return;
  }

  progress.startPhase('timeTracking');
  logger.info('=== Phase 6: Time Tracking ===');

  try {
    const timeBlocks = await listTimeBlocks(client, logger);
    writer.writeJson('time-tracking/time-blocks.json', timeBlocks);
    logger.info(`Extracted ${timeBlocks.length} time blocks`);
    progress.updatePhaseProgress('timeTracking', timeBlocks.length, timeBlocks.length);
  } catch (err) {
    logger.error('Failed to fetch time blocks', {
      error: err instanceof Error ? err.message : String(err),
    });
    progress.addError({
      phase: 'timeTracking',
      endpoint: '/times',
      message: err instanceof Error ? err.message : String(err),
    });
  }

  progress.completePhase('timeTracking');
}
