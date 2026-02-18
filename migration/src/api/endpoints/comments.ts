import { ApiClient } from '../client.js';
import { paginateAll } from '../paginator.js';
import { Logger } from '../../utils/logger.js';
import type { TGComment } from '../../types/teamgantt.js';

export async function getComments(
  client: ApiClient,
  target: string,
  targetId: string,
  logger: Logger,
): Promise<TGComment[]> {
  try {
    return await paginateAll<TGComment>(client, `/${target}/${targetId}/comments`, logger);
  } catch {
    logger.debug(`No comments for ${target}/${targetId}`);
    return [];
  }
}
