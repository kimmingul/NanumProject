import { ApiClient } from '../api/client.js';
import { getComments } from '../api/endpoints/comments.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';
import type { TGProject } from '../types/teamgantt.js';

/**
 * Extract project-level comments.
 * Task-level comments are already extracted in task-extractor.
 */
export async function extractProjectComments(
  client: ApiClient,
  projects: TGProject[],
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<void> {
  logger.info(`Extracting project-level comments for ${projects.length} projects`);

  for (const project of projects) {
    const projectId = String(project.id);
    try {
      const comments = await getComments(client, 'projects', projectId, logger);
      if (comments.length > 0) {
        writer.writeJson(`comments/by-project/${projectId}.json`, comments);
        logger.debug(`  ${comments.length} comments on project ${project.name}`);
      }
    } catch (err) {
      logger.warn(`Could not fetch comments for project ${projectId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
