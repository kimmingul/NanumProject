import { ApiClient, ApiClientError } from '../api/client.js';
import {
  listProjects,
  getProject,
  getProjectChildren,
  getProjectAccesses,
  getProjectBoards,
} from '../api/endpoints/projects.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';
import type { TGProject, TGProjectChild } from '../types/teamgantt.js';

/**
 * Recursively collect all task and group IDs from project children hierarchy.
 */
function collectIdsFromChildren(
  children: TGProjectChild[],
  taskIds: string[],
  groupIds: string[],
): void {
  for (const child of children) {
    if (child.type === 'task') {
      taskIds.push(String(child.id));
    } else if (child.type === 'group') {
      groupIds.push(String(child.id));
    }
    if (child.children && child.children.length > 0) {
      collectIdsFromChildren(child.children, taskIds, groupIds);
    }
  }
}

export async function extractProjects(
  client: ApiClient,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<TGProject[]> {
  if (progress.isPhaseCompleted('projects')) {
    logger.info('Projects list phase already completed, skipping');
    return [];
  }

  progress.startPhase('projects');
  logger.info('=== Phase 3: Projects List ===');

  const projects = await listProjects(client, logger);
  writer.writeJson('projects/_index.json', projects);

  logger.info(`Found ${projects.length} projects`);
  progress.updatePhaseProgress('projects', projects.length, projects.length);
  progress.completePhase('projects');

  return projects;
}

export async function extractProjectDetails(
  client: ApiClient,
  projects: TGProject[],
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<void> {
  if (progress.isPhaseCompleted('projectDetails')) {
    logger.info('Project details phase already completed, skipping');
    return;
  }

  progress.startPhase('projectDetails', projects.length);
  logger.info(`=== Phase 4: Project Details (${projects.length} projects) ===`);

  let processed = 0;

  for (const project of projects) {
    const projectId = String(project.id);

    if (progress.isProjectCompleted(projectId)) {
      processed++;
      continue;
    }

    logger.info(`Processing project ${processed + 1}/${projects.length}: ${project.name} (${projectId})`);

    try {
      // Fetch project details
      const details = await getProject(client, projectId, logger);
      writer.writeJson(`projects/${projectId}/project.json`, details);

      // Fetch project children (hierarchy)
      const children = await getProjectChildren(client, projectId, logger);
      writer.writeJson(`projects/${projectId}/children.json`, children);

      // Collect task and group IDs from hierarchy
      const taskIds: string[] = [];
      const groupIds: string[] = [];
      collectIdsFromChildren(children, taskIds, groupIds);
      progress.addDiscoveredTasks(taskIds);
      progress.addDiscoveredGroups(groupIds);
      logger.info(`  Found ${taskIds.length} tasks, ${groupIds.length} groups in project`);

      // Fetch project accesses
      try {
        const accesses = await getProjectAccesses(client, projectId, logger);
        writer.writeJson(`projects/${projectId}/accesses.json`, accesses);
      } catch (err) {
        handleEntityError(err, 'project-access', projectId, `/projects/${projectId}/access`, logger, progress);
      }

      // Fetch project boards
      try {
        const boards = await getProjectBoards(client, projectId, logger);
        if (boards.length > 0) {
          writer.writeJson(`projects/${projectId}/boards/_index.json`, boards);
        }
      } catch (err) {
        handleEntityError(err, 'project-boards', projectId, `/projects/${projectId}/boards`, logger, progress);
      }

      progress.addCompletedProject(projectId);
    } catch (err) {
      handleEntityError(err, 'project', projectId, `/projects/${projectId}`, logger, progress);
    }

    processed++;
    progress.updatePhaseProgress('projectDetails', processed, projects.length);
  }

  progress.completePhase('projectDetails');
  logger.info(`Project details extraction completed. ${processed} projects processed.`);
}

function handleEntityError(
  err: unknown,
  phase: string,
  entityId: string,
  endpoint: string,
  logger: Logger,
  progress: ProgressTracker,
): void {
  const statusCode = err instanceof ApiClientError ? err.statusCode : undefined;
  const message = err instanceof Error ? err.message : String(err);

  if (statusCode === 403 || statusCode === 404) {
    logger.warn(`Skipping ${phase} ${entityId}: ${message}`);
  } else {
    logger.error(`Error extracting ${phase} ${entityId}: ${message}`);
  }

  progress.addError({ phase, entityId, endpoint, statusCode, message });
}
