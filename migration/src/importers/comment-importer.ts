import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import { batchInsert, logStep, readJson } from './utils.js';

interface TGUser {
  id: number;
  email_address?: string;
  first_name?: string;
  last_name?: string;
}

interface TGAttachedDocument {
  id: number;
  document_id: number;
  name?: string;
  file_name?: string;
  size?: number;
  mime_type?: string;
  hash?: string;
  download_url?: string;
  description?: string;
  added_by?: TGUser;
  version_date?: string;
}

interface TGComment {
  id: number;
  message: string;
  target: 'task' | 'project';
  target_id: number;
  project_id: number;
  pin_date?: string | null;
  added_by?: TGUser;
  updated_by?: TGUser | null;
  added_date?: string;
  updated_at?: string;
  attached_documents?: TGAttachedDocument[];
}

/**
 * Import comments and attached document metadata.
 */
export async function importComments(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(8, 'Comments');

  const commentsDir = join(outputDir, 'comments');
  const commentRows: Record<string, unknown>[] = [];
  const commentTgIds: number[] = [];
  const documentData: {
    commentTgId: number;
    projectUuid: string;
    targetType: string;
    targetUuid: string;
    doc: TGAttachedDocument;
  }[] = [];

  // Process by-project comments
  const byProjectDir = join(commentsDir, 'by-project');
  if (existsSync(byProjectDir)) {
    const files = readdirSync(byProjectDir).filter((f) => f.endsWith('.json'));
    console.log(`Processing ${files.length} by-project comment files`);

    for (const file of files) {
      const filePath = join(byProjectDir, file);
      const comments = readJson<TGComment[]>(filePath);

      for (const comment of comments) {
        if (mapper.has('comment', comment.id)) continue;

        const projectUuid = mapper.get('project', comment.project_id);
        if (!projectUuid) continue;

        // target_id for project comments = project UUID
        const targetUuid = projectUuid;

        const createdByUuid = comment.added_by
          ? mapper.get('user', comment.added_by.id)
          : null;
        const updatedByUuid = comment.updated_by
          ? mapper.get('user', comment.updated_by.id)
          : null;

        commentRows.push({
          tenant_id: config.IMPORT_TENANT_ID,
          tg_id: comment.id,
          target_type: 'project',
          target_id: targetUuid,
          project_id: projectUuid,
          message: comment.message,
          is_pinned: comment.pin_date != null,
          pinned_at: comment.pin_date ?? null,
          is_active: true,
          created_by: createdByUuid ?? null,
          updated_by: updatedByUuid ?? null,
          created_at: comment.added_date ?? new Date().toISOString(),
          updated_at: comment.updated_at ?? comment.added_date ?? new Date().toISOString(),
        });
        commentTgIds.push(comment.id);

        // Collect attached documents
        if (comment.attached_documents) {
          for (const doc of comment.attached_documents) {
            documentData.push({
              commentTgId: comment.id,
              projectUuid,
              targetType: 'project',
              targetUuid,
              doc,
            });
          }
        }
      }
    }
  }

  // Process by-task comments
  const byTaskDir = join(commentsDir, 'by-task');
  if (existsSync(byTaskDir)) {
    const files = readdirSync(byTaskDir).filter((f) => f.endsWith('.json'));
    console.log(`Processing ${files.length} by-task comment files`);

    for (const file of files) {
      const filePath = join(byTaskDir, file);
      const comments = readJson<TGComment[]>(filePath);

      for (const comment of comments) {
        if (mapper.has('comment', comment.id)) continue;

        const projectUuid = mapper.get('project', comment.project_id);
        if (!projectUuid) continue;

        const taskUuid = mapper.get('task', comment.target_id);
        if (!taskUuid) continue;

        const createdByUuid = comment.added_by
          ? mapper.get('user', comment.added_by.id)
          : null;
        const updatedByUuid = comment.updated_by
          ? mapper.get('user', comment.updated_by.id)
          : null;

        commentRows.push({
          tenant_id: config.IMPORT_TENANT_ID,
          tg_id: comment.id,
          target_type: 'task',
          target_id: taskUuid,
          project_id: projectUuid,
          message: comment.message,
          is_pinned: comment.pin_date != null,
          pinned_at: comment.pin_date ?? null,
          is_active: true,
          created_by: createdByUuid ?? null,
          updated_by: updatedByUuid ?? null,
          created_at: comment.added_date ?? new Date().toISOString(),
          updated_at: comment.updated_at ?? comment.added_date ?? new Date().toISOString(),
        });
        commentTgIds.push(comment.id);

        // Collect attached documents
        if (comment.attached_documents) {
          for (const doc of comment.attached_documents) {
            documentData.push({
              commentTgId: comment.id,
              projectUuid,
              targetType: 'task',
              targetUuid: taskUuid,
              doc,
            });
          }
        }
      }
    }
  }

  // Batch insert comments
  console.log(`Found ${commentRows.length} comments to import`);
  if (commentRows.length > 0) {
    await batchInsert(supabase, 'comments', commentRows, config.IMPORT_BATCH_SIZE, 'comments');

    // Fetch back UUIDs in chunks
    console.log('Fetching comment UUIDs...');
    const chunkSize = 500;
    for (let i = 0; i < commentTgIds.length; i += chunkSize) {
      const chunk = commentTgIds.slice(i, i + chunkSize);
      const { data: inserted, error } = await supabase
        .from('comments')
        .select('id, tg_id')
        .in('tg_id', chunk);

      if (error) {
        console.error(`Failed to fetch comment IDs chunk ${i}:`, error.message);
        continue;
      }

      for (const row of inserted ?? []) {
        if (row.tg_id != null) {
          mapper.set('comment', row.tg_id, row.id);
        }
      }
    }
    console.log(`Mapped ${mapper.getEntityCount('comment')} comment IDs`);
  }

  // Import documents
  logStep(9, 'Documents (from comments)');

  if (documentData.length > 0) {
    console.log(`Found ${documentData.length} attached documents`);

    // Group by document_id to avoid duplicates
    const docGroupMap = new Map<number, {
      projectUuid: string;
      targetType: string;
      targetUuid: string;
      commentTgId: number;
      versions: TGAttachedDocument[];
    }>();

    for (const { commentTgId, projectUuid, targetType, targetUuid, doc } of documentData) {
      const docId = doc.document_id;
      if (!docGroupMap.has(docId)) {
        docGroupMap.set(docId, {
          projectUuid,
          targetType,
          targetUuid,
          commentTgId,
          versions: [],
        });
      }
      docGroupMap.get(docId)!.versions.push(doc);
    }

    const docRows: Record<string, unknown>[] = [];
    const docTgIds: number[] = [];

    for (const [docId, group] of docGroupMap) {
      if (mapper.has('document', docId)) continue;

      const commentUuid = mapper.get('comment', group.commentTgId);
      const createdByUuid = group.versions[0]?.added_by
        ? mapper.get('user', group.versions[0].added_by.id)
        : null;

      docRows.push({
        tenant_id: config.IMPORT_TENANT_ID,
        tg_id: docId,
        target_type: group.targetType,
        target_id: group.targetUuid,
        project_id: group.projectUuid,
        comment_id: commentUuid ?? null,
        is_active: true,
        created_by: createdByUuid ?? null,
      });
      docTgIds.push(docId);
    }

    if (docRows.length > 0) {
      await batchInsert(supabase, 'documents', docRows, config.IMPORT_BATCH_SIZE, 'documents');

      // Fetch back document UUIDs
      const chunkSize = 500;
      for (let i = 0; i < docTgIds.length; i += chunkSize) {
        const chunk = docTgIds.slice(i, i + chunkSize);
        const { data: inserted, error } = await supabase
          .from('documents')
          .select('id, tg_id')
          .in('tg_id', chunk);

        if (error) {
          console.error(`Failed to fetch document IDs chunk ${i}:`, error.message);
          continue;
        }

        for (const row of inserted ?? []) {
          if (row.tg_id != null) {
            mapper.set('document', row.tg_id, row.id);
          }
        }
      }
      console.log(`Mapped ${mapper.getEntityCount('document')} document IDs`);
    }

    // Insert document versions
    const versionRows: Record<string, unknown>[] = [];

    for (const [docId, group] of docGroupMap) {
      const documentUuid = mapper.get('document', docId);
      if (!documentUuid) continue;

      let versionNum = 1;
      for (const ver of group.versions) {
        const uploadedByUuid = ver.added_by
          ? mapper.get('user', ver.added_by.id)
          : null;

        versionRows.push({
          tenant_id: config.IMPORT_TENANT_ID,
          tg_id: ver.id,
          document_id: documentUuid,
          version_number: versionNum++,
          file_name: ver.file_name || ver.name || 'unknown',
          file_size: ver.size ?? null,
          mime_type: ver.mime_type ?? null,
          storage_path: ver.download_url || `tg://documents/${ver.id}`,
          file_hash: ver.hash ?? null,
          description: ver.description ?? null,
          uploaded_by: uploadedByUuid ?? null,
          created_at: ver.version_date ?? new Date().toISOString(),
        });
      }
    }

    if (versionRows.length > 0) {
      await batchInsert(supabase, 'document_versions', versionRows, config.IMPORT_BATCH_SIZE, 'document_versions');
      console.log(`Inserted ${versionRows.length} document versions`);
    }
  } else {
    console.log('No attached documents found');
  }
}
