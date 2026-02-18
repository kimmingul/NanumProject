import { ApiClient } from '../api/client.js';
import { listBoards } from '../api/endpoints/boards.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';

export async function extractBoards(
  client: ApiClient,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<void> {
  if (progress.isPhaseCompleted('boards')) {
    logger.info('Boards phase already completed, skipping');
    return;
  }

  progress.startPhase('boards');
  logger.info('=== Phase 7: Boards ===');

  try {
    const boards = await listBoards(client, logger);
    writer.writeJson('boards/_index.json', boards);
    logger.info(`Extracted ${boards.length} boards`);
    progress.updatePhaseProgress('boards', boards.length, boards.length);
  } catch (err) {
    logger.error('Failed to fetch boards', {
      error: err instanceof Error ? err.message : String(err),
    });
    progress.addError({
      phase: 'boards',
      endpoint: '/boards',
      message: err instanceof Error ? err.message : String(err),
    });
  }

  progress.completePhase('boards');
}
