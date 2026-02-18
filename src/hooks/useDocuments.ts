import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { PMDocument, DocumentVersion, CommentTarget } from '@/types';

export interface DocumentWithVersion extends PMDocument {
  current_version: DocumentVersion | null;
  uploader_name: string | null;
}

interface UseDocumentsResult {
  documents: DocumentWithVersion[];
  loading: boolean;
  error: string | null;
  uploadFile: (file: File, description?: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  getVersions: (documentId: string) => Promise<DocumentVersion[]>;
  downloadFile: (version: DocumentVersion) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDocuments(
  projectId: string | undefined,
  targetType: CommentTarget = 'project',
  targetId?: string,
): UseDocumentsResult {
  const [documents, setDocuments] = useState<DocumentWithVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);

  const effectiveTargetId = targetId || projectId;

  const fetchDocuments = useCallback(async () => {
    if (!projectId || !effectiveTargetId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch documents for this project/target
      const { data: docs, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('target_type', targetType)
        .eq('target_id', effectiveTargetId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!docs || docs.length === 0) {
        setDocuments([]);
        return;
      }

      // Fetch current versions for all documents
      const docRows = docs as PMDocument[];
      const versionIds = docRows
        .map((d) => d.current_version_id)
        .filter(Boolean) as string[];

      let versionMap = new Map<string, DocumentVersion>();
      if (versionIds.length > 0) {
        const { data: versions } = await supabase
          .from('document_versions')
          .select('*')
          .in('id', versionIds);

        if (versions) {
          versionMap = new Map(
            (versions as DocumentVersion[]).map((v) => [v.id, v]),
          );
        }
      }

      // Fetch uploader profiles
      const uploaderIds = [
        ...new Set(docRows.map((d) => d.created_by).filter(Boolean)),
      ] as string[];

      let profileMap = new Map<string, string>();
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uploaderIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: { user_id: string; full_name: string | null }) => [
              p.user_id,
              p.full_name || 'Unknown',
            ]),
          );
        }
      }

      const enriched: DocumentWithVersion[] = docs.map((d: Record<string, unknown>) => ({
        ...(d as unknown as PMDocument),
        current_version: d.current_version_id
          ? versionMap.get(d.current_version_id as string) ?? null
          : null,
        uploader_name: d.created_by ? profileMap.get(d.created_by as string) ?? null : null,
      }));

      setDocuments(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load documents';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, targetType, effectiveTargetId]);

  const uploadFile = useCallback(
    async (file: File, description?: string) => {
      if (!projectId || !effectiveTargetId || !profile) return;

      // 1) Upload to Supabase Storage
      const filePath = `${profile.tenant_id}/${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2) Create document record
      const { data: rawDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          tenant_id: profile.tenant_id,
          target_type: targetType,
          target_id: effectiveTargetId,
          project_id: projectId,
          created_by: profile.user_id,
        })
        .select()
        .single();

      if (docError) throw docError;
      const doc = rawDoc as PMDocument;

      // 3) Create version record
      const { data: rawVersion, error: verError } = await supabase
        .from('document_versions')
        .insert({
          tenant_id: profile.tenant_id,
          document_id: doc.id,
          version_number: 1,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          storage_path: filePath,
          description: description || null,
          uploaded_by: profile.user_id,
        })
        .select()
        .single();

      if (verError) throw verError;
      const version = rawVersion as DocumentVersion;

      // 4) Update document with current_version_id
      await supabase
        .from('documents')
        .update({ current_version_id: version.id })
        .eq('id', doc.id);

      await fetchDocuments();
    },
    [projectId, targetType, effectiveTargetId, profile, fetchDocuments],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const { error: delError } = await supabase
        .from('documents')
        .update({ is_active: false })
        .eq('id', documentId);

      if (delError) throw delError;
      await fetchDocuments();
    },
    [fetchDocuments],
  );

  const getVersions = useCallback(
    async (documentId: string): Promise<DocumentVersion[]> => {
      const { data, error: fetchError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (fetchError) throw fetchError;
      return (data as DocumentVersion[]) ?? [];
    },
    [],
  );

  const downloadFile = useCallback(
    async (version: DocumentVersion) => {
      // Try Supabase Storage download
      const { data, error: dlError } = await supabase.storage
        .from('documents')
        .download(version.storage_path);

      if (dlError) {
        // Fallback: try as direct URL
        window.open(version.storage_path, '_blank');
        return;
      }

      // Create download link from blob
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [],
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    uploadFile,
    deleteDocument,
    getVersions,
    downloadFile,
    refetch: fetchDocuments,
  };
}
