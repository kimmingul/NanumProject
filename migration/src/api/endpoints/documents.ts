import { ApiClient } from '../client.js';
import { Logger } from '../../utils/logger.js';
import type { Readable } from 'node:stream';

export async function downloadDocument(
  client: ApiClient,
  docId: string,
  logger: Logger,
): Promise<{ stream: Readable; headers: Record<string, string> }> {
  logger.debug(`Downloading document ${docId}`);
  return client.getStream(`/downloads/${docId}`);
}
