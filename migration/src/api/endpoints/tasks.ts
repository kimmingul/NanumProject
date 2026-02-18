import { ApiClient } from '../client.js';
import { Logger } from '../../utils/logger.js';
import type { TGTask, TGChecklist, TGDocument, TGComment } from '../../types/teamgantt.js';

export async function getTask(
  client: ApiClient,
  taskId: string,
  logger: Logger,
): Promise<TGTask> {
  const response = await client.get<any>(`/tasks/${taskId}`);
  const task = response.data?.data ?? response.data;
  return task as TGTask;
}

export async function getTaskChecklist(
  client: ApiClient,
  taskId: string,
  logger: Logger,
): Promise<TGChecklist[]> {
  try {
    const response = await client.get<any>(`/tasks/${taskId}/checklist`);
    const checklist = response.data?.data ?? response.data;
    return Array.isArray(checklist) ? checklist : [];
  } catch {
    logger.debug(`No checklist for task ${taskId}`);
    return [];
  }
}

export async function getTaskDocuments(
  client: ApiClient,
  taskId: string,
  logger: Logger,
): Promise<TGDocument[]> {
  try {
    const response = await client.get<any>(`/tasks/${taskId}/documents`);
    const docs = response.data?.data ?? response.data;
    return Array.isArray(docs) ? docs : [];
  } catch {
    logger.debug(`No documents for task ${taskId}`);
    return [];
  }
}

export async function getTaskComments(
  client: ApiClient,
  taskId: string,
  logger: Logger,
): Promise<TGComment[]> {
  try {
    const response = await client.get<any>(`/tasks/${taskId}/comments`);
    const comments = response.data?.data ?? response.data;
    return Array.isArray(comments) ? comments : [];
  } catch {
    logger.debug(`No comments for task ${taskId}`);
    return [];
  }
}
