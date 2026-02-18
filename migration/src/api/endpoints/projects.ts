import { ApiClient } from '../client.js';
import { paginateAll } from '../paginator.js';
import { Logger } from '../../utils/logger.js';
import type { TGProject, TGAccess, TGProjectChild } from '../../types/teamgantt.js';

export async function listProjects(client: ApiClient, logger: Logger): Promise<TGProject[]> {
  const statuses = ['Active', 'On Hold', 'Complete'];
  const allProjects: TGProject[] = [];

  for (const status of statuses) {
    let page = 1;
    let statusProjects: TGProject[] = [];

    while (true) {
      const response = await client.get<any>('/projects', { status, page });
      const data = response.data;
      const projects = data?.projects ?? data?.data ?? (Array.isArray(data) ? data : []);
      const total: number = data?.total ?? 0;

      statusProjects = statusProjects.concat(projects);
      logger.info(`Fetched ${status} projects page ${page}: ${projects.length} (${statusProjects.length}/${total})`);

      if (projects.length === 0 || statusProjects.length >= total) break;
      page++;
    }

    allProjects.push(...(statusProjects as TGProject[]));
    logger.info(`Total ${status} projects: ${statusProjects.length}`);
  }

  logger.info(`Fetched ${allProjects.length} projects total across all statuses`);
  return allProjects;
}

export async function getProject(
  client: ApiClient,
  projectId: string,
  logger: Logger,
): Promise<TGProject> {
  const response = await client.get<any>(`/projects/${projectId}`);
  const project = response.data?.data ?? response.data;
  logger.debug(`Fetched project: ${project.name}`);
  return project as TGProject;
}

export async function getProjectChildren(
  client: ApiClient,
  projectId: string,
  logger: Logger,
): Promise<TGProjectChild[]> {
  const response = await client.get<any>(`/projects/${projectId}/children`);
  const children = response.data?.data ?? response.data;
  return Array.isArray(children) ? children : [];
}

export async function getProjectAccesses(
  client: ApiClient,
  projectId: string,
  logger: Logger,
): Promise<TGAccess[]> {
  const response = await client.get<any>(`/projects/${projectId}/access`);
  const accesses = response.data?.data ?? response.data;
  return Array.isArray(accesses) ? accesses : [];
}

export async function getProjectBoards(
  client: ApiClient,
  projectId: string,
  logger: Logger,
): Promise<any[]> {
  const response = await client.get<any>(`/projects/${projectId}/boards`);
  const boards = response.data?.data ?? response.data;
  return Array.isArray(boards) ? boards : [];
}
