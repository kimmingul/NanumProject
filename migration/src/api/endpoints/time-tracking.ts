import { ApiClient } from '../client.js';
import { paginateAll } from '../paginator.js';
import { Logger } from '../../utils/logger.js';
import type { TGTimeBlock } from '../../types/teamgantt.js';

export async function listTimeBlocks(
  client: ApiClient,
  logger: Logger,
): Promise<TGTimeBlock[]> {
  return paginateAll<TGTimeBlock>(client, '/times', logger);
}
