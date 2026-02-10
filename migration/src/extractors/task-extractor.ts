import { ApiClient, ApiClientError } from '../api/client.js';
import {
  getTask,
  getTaskChecklist,
  getTaskDocuments,
  getTaskComments,
} from '../api/endpoints/tasks.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';

export async function extractTasks(
  client: ApiClient,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<void> {
  if (progress.isPhaseCompleted('tasks')) {
    logger.info('Tasks phase already completed, skipping');
    return;
  }

  const taskIds = progress.getState().discoveredTaskIds;

  if (taskIds.length === 0) {
    logger.warn('No tasks discovered. Skipping task extraction.');
    progress.startPhase('tasks', 0);
    progress.completePhase('tasks');
    return;
  }

  progress.startPhase('tasks', taskIds.length);
  logger.info(`=== Phase 5: Task Details (${taskIds.length} tasks) ===`);

  const allTasks: Array<{ id: string; name: string; project_id?: string }> = [];
  let processed = 0;

  for (const taskId of taskIds) {
    if (progress.isTaskCompleted(taskId)) {
      processed++;
      continue;
    }

    try {
      // Fetch task details
      const task = await getTask(client, taskId, logger);
      writer.writeJson(`tasks/${taskId}/task.json`, task);
      allTasks.push({ id: taskId, name: task.name, project_id: task.project_id });

      // Fetch checklist
      const checklist = await getTaskChecklist(client, taskId, logger);
      if (checklist.length > 0) {
        writer.writeJson(`tasks/${taskId}/checklist.json`, checklist);
      }

      // Fetch documents
      const documents = await getTaskDocuments(client, taskId, logger);
      if (documents.length > 0) {
        writer.writeJson(`tasks/${taskId}/documents/_index.json`, documents);
        // Add to download queue
        for (const doc of documents) {
          progress.addDocumentToQueue(
            String(doc.id),
            taskId,
            doc.file_name ?? doc.name ?? `doc_${doc.id}`,
          );
        }
      }

      // Fetch comments
      const comments = await getTaskComments(client, taskId, logger);
      if (comments.length > 0) {
        writer.writeJson(`comments/by-task/${taskId}.json`, comments);
      }

      progress.addCompletedTask(taskId);
    } catch (err) {
      const statusCode = err instanceof ApiClientError ? err.statusCode : undefined;
      const message = err instanceof Error ? err.message : String(err);

      if (statusCode === 403 || statusCode === 404) {
        logger.warn(`Skipping task ${taskId}: ${message}`);
      } else {
        logger.error(`Error extracting task ${taskId}: ${message}`);
      }

      progress.addError({
        phase: 'tasks',
        entityId: taskId,
        endpoint: `/tasks/${taskId}`,
        statusCode,
        message,
      });
    }

    processed++;

    // Log progress every 50 tasks
    if (processed % 50 === 0) {
      logger.info(`  Tasks progress: ${processed}/${taskIds.length}`);
      progress.updatePhaseProgress('tasks', processed, taskIds.length);
    }
  }

  // Write task index
  writer.writeJson('tasks/_index.json', allTasks);

  progress.updatePhaseProgress('tasks', processed, taskIds.length);
  progress.completePhase('tasks');
  progress.save(); // Force save for completed tasks
  logger.info(`Task extraction completed. ${processed} tasks processed.`);
}
