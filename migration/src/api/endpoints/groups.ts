import { ApiClient } from '../client.js';
import { Logger } from '../../utils/logger.js';
import type { TGGroup, TGComment } from '../../types/teamgantt.js';

export async function getGroup(
  client: ApiClient,
  groupId: string,
  logger: Logger,
): Promise<TGGroup> {
  const response = await client.get<any>(`/groups/${groupId}`);
  const group = response.data?.data ?? response.data;
  return group as TGGroup;
}

export async function getGroupComments(
  client: ApiClient,
  groupId: string,
  logger: Logger,
): Promise<TGComment[]> {
  try {
    const response = await client.get<any>(`/groups/${groupId}/comments`);
    const comments = response.data?.data ?? response.data;
    return Array.isArray(comments) ? comments : [];
  } catch {
    logger.debug(`No comments for group ${groupId}`);
    return [];
  }
}
