import { ApiClient } from './client.js';
import { Logger } from '../utils/logger.js';

interface PaginateOptions {
  perPage?: number;
  params?: Record<string, string | number>;
}

/**
 * Async generator that fetches all pages from a paginated endpoint.
 * Yields each page's data array.
 */
export async function* paginate<T = unknown>(
  client: ApiClient,
  path: string,
  logger: Logger,
  options: PaginateOptions = {},
): AsyncGenerator<T[], void, undefined> {
  const perPage = options.perPage ?? 100;
  const extraParams = options.params ?? {};
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await client.get<any>(path, {
      ...extraParams,
      page: page,
      per_page: perPage,
    });

    // Handle both { data: [...] } and direct array responses
    const items: T[] = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

    if (items.length === 0) {
      hasMore = false;
    } else {
      logger.debug(`Fetched page ${page} of ${path} (${items.length} items)`);
      yield items;
      page++;

      // If we got fewer items than requested, we've reached the end
      if (items.length < perPage) {
        hasMore = false;
      }
    }
  }
}

/**
 * Convenience function that collects all pages into a single array.
 */
export async function paginateAll<T = unknown>(
  client: ApiClient,
  path: string,
  logger: Logger,
  options: PaginateOptions = {},
): Promise<T[]> {
  const allItems: T[] = [];

  for await (const page of paginate<T>(client, path, logger, options)) {
    allItems.push(...page);
  }

  logger.info(`Fetched total ${allItems.length} items from ${path}`);
  return allItems;
}
