import { ApiClient } from '../api/client.js';
import { getCurrentUser, getCompanyUsers } from '../api/endpoints/users.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';
import type { TGCurrentUser } from '../types/teamgantt.js';

export interface DiscoveryResult {
  currentUser: TGCurrentUser;
  companyId: string;
}

export async function runDiscovery(
  client: ApiClient,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<DiscoveryResult> {
  if (progress.isPhaseCompleted('discovery')) {
    logger.info('Discovery phase already completed, loading cached result');
    const state = progress.getState();
    // Re-read from saved file
    return {
      currentUser: {} as TGCurrentUser,
      companyId: (state as any).companyId ?? '',
    };
  }

  progress.startPhase('discovery');
  logger.info('=== Phase 1: Discovery ===');

  const currentUser = await getCurrentUser(client, logger);

  // Try to extract company_id from various response formats
  const companies = (currentUser as any).companies;
  const companyId = String(
    currentUser.company_id ??
    (currentUser as any).company?.id ??
    (currentUser as any).companyId ??
    (Array.isArray(companies) && companies.length > 0 ? companies[0].id : '') ??
    '',
  );

  if (!companyId) {
    logger.warn('Could not extract company_id from current_user response. Full response saved for inspection.');
  }

  writer.writeJson('_metadata/api-discovery.json', {
    currentUser,
    companyId,
    discoveredAt: new Date().toISOString(),
  });

  // Store companyId in state for resume
  (progress.getState() as any).companyId = companyId;
  progress.completePhase('discovery');
  logger.info(`Discovery completed. Company ID: ${companyId || '(not found)'}`);

  return { currentUser, companyId };
}

export async function extractCompanyData(
  client: ApiClient,
  companyId: string,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
): Promise<void> {
  if (progress.isPhaseCompleted('company')) {
    logger.info('Company phase already completed, skipping');
    return;
  }

  progress.startPhase('company');
  logger.info('=== Phase 2: Company Data ===');

  if (!companyId) {
    logger.warn('No company ID available, skipping company data extraction');
    progress.completePhase('company');
    return;
  }

  try {
    const users = await getCompanyUsers(client, companyId, logger);
    writer.writeJson('company/users.json', users);
    logger.info(`Extracted ${users.length} users`);
    progress.updatePhaseProgress('company', users.length, users.length);
  } catch (err) {
    logger.error('Failed to fetch company users', {
      error: err instanceof Error ? err.message : String(err),
    });
    progress.addError({
      phase: 'company',
      endpoint: `/companies/${companyId}/users`,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  progress.completePhase('company');
}
