import { ApiClient, ApiClientError } from '../api/client.js';
import { Logger } from '../utils/logger.js';
import { FileWriter } from '../utils/file-writer.js';
import { ProgressTracker } from '../utils/progress.js';
import { readFileSync, existsSync } from 'node:fs';

interface DocumentVersion {
  id: number;
  name: string;
  download_url: string;
  size: number;
  [key: string]: unknown;
}

interface DocumentMeta {
  id: number;
  versions: DocumentVersion[];
  [key: string]: unknown;
}

export async function extractDocuments(
  client: ApiClient,
  logger: Logger,
  writer: FileWriter,
  progress: ProgressTracker,
  skipDownload: boolean = false,
): Promise<void> {
  if (progress.isPhaseCompleted('documents')) {
    logger.info('Documents phase already completed, skipping');
    return;
  }

  const queue = progress.getDocumentQueue();

  if (queue.length === 0) {
    logger.info('No documents to download');
    progress.startPhase('documents', 0);
    progress.completePhase('documents');
    return;
  }

  if (skipDownload) {
    logger.info(`Skipping ${queue.length} document downloads (--skip-documents flag)`);
    progress.startPhase('documents', queue.length);
    progress.completePhase('documents');
    return;
  }

  progress.startPhase('documents', queue.length);
  logger.info(`=== Phase 8: Document Downloads (${queue.length} files) ===`);

  let downloaded = 0;
  let failed = 0;

  for (const doc of queue) {
    try {
      // Read the document metadata to get the actual download URL
      const metaPath = writer.getFullPath(`tasks/${doc.taskId}/documents/_index.json`);
      let downloadUrl: string | undefined;
      let actualFileName = doc.fileName;

      if (existsSync(metaPath)) {
        const metaRaw = readFileSync(metaPath, 'utf-8');
        const docs: DocumentMeta[] = JSON.parse(metaRaw);
        const docMeta = docs.find(d => String(d.id) === doc.docId);

        if (docMeta?.versions?.length) {
          // Use the latest version's download URL
          const latestVersion = docMeta.versions[docMeta.versions.length - 1];
          downloadUrl = latestVersion.download_url;
          if (latestVersion.name) {
            actualFileName = latestVersion.name;
          }
        }
      }

      if (!downloadUrl) {
        logger.warn(`No download URL found for document ${doc.docId}, skipping`);
        failed++;
        continue;
      }

      const { stream } = await client.getStreamFromUrl(downloadUrl, `doc/${doc.docId}`);

      // Sanitize filename
      const safeFileName = actualFileName.replace(/[<>:"/\\|?*]/g, '_');
      const relativePath = `tasks/${doc.taskId}/documents/files/${safeFileName}`;

      const sha256 = await writer.writeStream(relativePath, stream);

      logger.debug(`Downloaded: ${safeFileName} (SHA-256: ${sha256.substring(0, 16)}...)`);
      downloaded++;
    } catch (err) {
      const statusCode = err instanceof ApiClientError ? err.statusCode : undefined;
      const message = err instanceof Error ? err.message : String(err);

      logger.warn(`Failed to download document ${doc.docId} (${doc.fileName}): ${message}`);
      progress.addError({
        phase: 'documents',
        entityId: doc.docId,
        endpoint: `doc/${doc.docId}`,
        statusCode,
        message,
      });
      failed++;
    }

    if ((downloaded + failed) % 20 === 0) {
      logger.info(`  Documents progress: ${downloaded + failed}/${queue.length} (${downloaded} ok, ${failed} failed)`);
      progress.updatePhaseProgress('documents', downloaded + failed, queue.length);
    }
  }

  progress.updatePhaseProgress('documents', downloaded + failed, queue.length);
  progress.completePhase('documents');
  logger.info(`Document downloads completed. ${downloaded} downloaded, ${failed} failed.`);
}
