import { ApiClient } from '../client.js';
import { paginateAll } from '../paginator.js';
import { Logger } from '../../utils/logger.js';
import type { TGCurrentUser, TGUser } from '../../types/teamgantt.js';

export async function getCurrentUser(client: ApiClient, logger: Logger): Promise<TGCurrentUser> {
  const response = await client.get<any>('/current_user');
  // The response might be { data: {...} } or just {...}
  const user = response.data?.data ?? response.data;
  logger.info(`Authenticated as: ${user.first_name} ${user.last_name} (${user.email_address})`);
  return user as TGCurrentUser;
}

export async function getCompanyUsers(
  client: ApiClient,
  companyId: string,
  logger: Logger,
): Promise<TGUser[]> {
  return paginateAll<TGUser>(client, `/companies/${companyId}/users`, logger);
}
