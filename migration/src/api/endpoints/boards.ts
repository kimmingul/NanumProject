import { ApiClient } from '../client.js';
import { paginateAll } from '../paginator.js';
import { Logger } from '../../utils/logger.js';
import type { TGBoard } from '../../types/teamgantt.js';

export async function listBoards(
  client: ApiClient,
  logger: Logger,
): Promise<TGBoard[]> {
  return paginateAll<TGBoard>(client, '/boards', logger);
}

export async function getBoard(
  client: ApiClient,
  boardId: string,
  logger: Logger,
): Promise<TGBoard> {
  const response = await client.get<any>(`/boards/${boardId}`);
  const board = response.data?.data ?? response.data;
  return board as TGBoard;
}
