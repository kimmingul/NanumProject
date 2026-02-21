import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { DataGrid } from 'devextreme-react/data-grid';
import { Column } from 'devextreme-react/data-grid';
import { Button } from 'devextreme-react/button';
import { Popup } from 'devextreme-react/popup';
import { useDocuments, type DocumentWithVersion } from '@/hooks/useDocuments';
import { useAuthStore } from '@/lib/auth-store';
import type { DocumentVersion } from '@/types';
import { DEFAULT_GRID_SETTINGS } from '@/lib/view-config-store';
import './FilesView.css';

export interface FileActions {
  upload: () => void;
}

interface FilesViewProps {
  projectId: string;
  actionsRef?: React.MutableRefObject<FileActions | undefined>;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function FilesView({ projectId, actionsRef }: FilesViewProps): ReactNode {
  const { documents, loading, error, uploadFile, deleteDocument, getVersions, downloadFile } =
    useDocuments(projectId);
  const profile = useAuthStore((s) => s.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose upload action to parent via ref
  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        upload: () => fileInputRef.current?.click(),
      };
    }
    return () => {
      if (actionsRef) actionsRef.current = undefined;
    };
  }, [actionsRef]);

  const [versionPopup, setVersionPopup] = useState<{
    visible: boolean;
    documentId: string;
    fileName: string;
    versions: DocumentVersion[];
  }>({ visible: false, documentId: '', fileName: '', versions: [] });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        for (let i = 0; i < files.length; i++) {
          await uploadFile(files[i]);
        }
      } catch (err) {
        console.error('Failed to upload file:', err);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadFile],
  );

  const handleShowVersions = useCallback(
    async (doc: DocumentWithVersion) => {
      try {
        const versions = await getVersions(doc.id);
        setVersionPopup({
          visible: true,
          documentId: doc.id,
          fileName: doc.current_version?.file_name || 'Unknown',
          versions,
        });
      } catch (err) {
        console.error('Failed to load versions:', err);
      }
    },
    [getVersions],
  );

  const handleDownload = useCallback(
    async (doc: DocumentWithVersion) => {
      if (!doc.current_version) return;
      try {
        await downloadFile(doc.current_version);
      } catch (err) {
        console.error('Failed to download file:', err);
      }
    },
    [downloadFile],
  );

  if (loading && documents.length === 0) {
    return (
      <div className="files-loading">
        <div className="loading-spinner" />
        <p>Loading files...</p>
      </div>
    );
  }

  return (
    <div className="files-view">
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {error && (
        <div className="files-error">
          <i className="dx-icon-warning" />
          <span>{error}</span>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="files-empty">
          <i className="dx-icon-doc" />
          <h3>No files yet</h3>
          <p>Upload files to share with your team.</p>
        </div>
      ) : (
        <DataGrid
          dataSource={documents}
          keyExpr="id"
          showBorders={true}
          showRowLines={DEFAULT_GRID_SETTINGS.showRowLines ?? true}
          showColumnLines={DEFAULT_GRID_SETTINGS.showColumnLines ?? false}
          rowAlternationEnabled={DEFAULT_GRID_SETTINGS.rowAlternationEnabled ?? true}
          hoverStateEnabled={true}
          columnAutoWidth={true}
          wordWrapEnabled={DEFAULT_GRID_SETTINGS.wordWrapEnabled ?? false}
        >
          <Column
            caption="File Name"
            minWidth={250}
            cellRender={(data: { data: DocumentWithVersion }) => {
              const doc = data.data;
              const version = doc.current_version;
              const ext = version?.file_name?.split('.').pop()?.toLowerCase() || '';
              const iconClass = getFileIcon(ext);
              return (
                <div className="file-name-cell">
                  <i className={`dx-icon-${iconClass}`} />
                  <span className="file-name-text">{version?.file_name || 'Unknown'}</span>
                </div>
              );
            }}
          />

          <Column
            caption="Size"
            width={100}
            cellRender={(data: { data: DocumentWithVersion }) => (
              <span>{formatFileSize(data.data.current_version?.file_size ?? null)}</span>
            )}
          />

          <Column
            caption="Version"
            width={80}
            alignment="center"
            cellRender={(data: { data: DocumentWithVersion }) => (
              <Button
                text={`v${data.data.current_version?.version_number ?? 1}`}
                stylingMode="text"
                hint="View version history"
                className="version-link"
                onClick={() => handleShowVersions(data.data)}
              />
            )}
          />

          <Column
            caption="Uploaded By"
            width={150}
            cellRender={(data: { data: DocumentWithVersion }) => (
              <span>{data.data.uploader_name || 'Unknown'}</span>
            )}
          />

          <Column
            caption="Date"
            width={140}
            cellRender={(data: { data: DocumentWithVersion }) => (
              <span>{new Date(data.data.created_at).toLocaleDateString()}</span>
            )}
          />

          <Column
            caption=""
            width={100}
            cellRender={(data: { data: DocumentWithVersion }) => {
              const doc = data.data;
              const isOwner = doc.created_by === profile?.user_id;
              return (
                <div className="file-actions">
                  <Button
                    icon="download"
                    stylingMode="text"
                    hint="Download"
                    onClick={() => handleDownload(doc)}
                    disabled={!doc.current_version}
                  />
                  {isOwner && (
                    <Button
                      icon="trash"
                      stylingMode="text"
                      hint="Delete"
                      onClick={() => deleteDocument(doc.id)}
                    />
                  )}
                </div>
              );
            }}
          />
        </DataGrid>
      )}

      {/* Version History Popup */}
      <Popup
        visible={versionPopup.visible}
        onHiding={() => setVersionPopup((prev) => ({ ...prev, visible: false }))}
        title={`Version History - ${versionPopup.fileName}`}
        width={600}
        height={400}
        showCloseButton={true}
      >
        <div className="version-history">
          {versionPopup.versions.length === 0 ? (
            <p className="version-empty">No versions found.</p>
          ) : (
            <div className="version-list">
              {versionPopup.versions.map((v) => (
                <div key={v.id} className="version-item">
                  <div className="version-info">
                    <span className="version-number">v{v.version_number}</span>
                    <span className="version-filename">{v.file_name}</span>
                    <span className="version-size">{formatFileSize(v.file_size)}</span>
                  </div>
                  <div className="version-meta">
                    <span>{new Date(v.created_at).toLocaleString()}</span>
                    {v.description && (
                      <span className="version-description">{v.description}</span>
                    )}
                  </div>
                  <Button
                    icon="download"
                    stylingMode="text"
                    hint="Download this version"
                    onClick={() => downloadFile(v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </div>
  );
}

function getFileIcon(ext: string): string {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const docExts = ['doc', 'docx', 'odt', 'rtf'];
  const sheetExts = ['xls', 'xlsx', 'csv', 'ods'];
  const presentExts = ['ppt', 'pptx', 'odp'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

  if (ext === 'pdf') return 'pdffile';
  if (imageExts.includes(ext)) return 'image';
  if (docExts.includes(ext)) return 'file';
  if (sheetExts.includes(ext)) return 'xlsxfile';
  if (presentExts.includes(ext)) return 'file';
  if (archiveExts.includes(ext)) return 'box';
  return 'doc';
}
