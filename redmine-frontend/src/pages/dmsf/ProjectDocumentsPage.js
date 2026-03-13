import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getProjectDmsf } from '../../api/dmsfAdapter';
import { Folder, FileText, Link2, RefreshCw, Download, Mail as MailIcon, Trash2, Plus } from 'lucide-react';

function formatSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return value;
  }
}

export default function ProjectDocumentsPage() {
  const { projectId } = useParams();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ dmsf_folders: { dmsf_folders: [] }, dmsf_files: { dmsf_files: [] } });
  const [selectedIds, setSelectedIds] = useState({ folders: new Set(), files: new Set() });

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getProjectDmsf(projectId);
        if (!cancelled) {
          setData(result || {});
          setSelectedIds({ folders: new Set(), files: new Set() });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ProjectDocumentsPage] Error loading DMSF data:', err);
          setError(err.message || 'Failed to load documents');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId, isAuthenticated, restoring]);

  const anySelected = selectedIds.folders.size > 0 || selectedIds.files.size > 0;

  const folders = useMemo(() => {
    if (!data || !data.dmsf_folders) return [];
    return data.dmsf_folders.dmsf_folders || data.dmsf_folders || [];
  }, [data]);

  const files = useMemo(() => {
    if (!data || !data.dmsf_files) return [];
    return data.dmsf_files.dmsf_files || data.dmsf_files || [];
  }, [data]);

  const toggleFolder = (id) => {
    setSelectedIds(prev => {
      const folders = new Set(prev.folders);
      if (folders.has(id)) folders.delete(id); else folders.add(id);
      return { ...prev, folders };
    });
  };

  const toggleFile = (id) => {
    setSelectedIds(prev => {
      const files = new Set(prev.files);
      if (files.has(id)) files.delete(id); else files.add(id);
      return { ...prev, files };
    });
  };

  const clearSelection = () => {
    setSelectedIds({ folders: new Set(), files: new Set() });
  };

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--theme-bg)]">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[var(--theme-text)]">Documents</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-xs text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
              disabled
            >
              <Plus size={14} />
              New folder
            </button>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setData({ dmsf_folders: { dmsf_folders: [] }, dmsf_files: { dmsf_files: [] } });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-xs text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 flex items-center gap-2">
            <FileText size={14} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
            <div className="text-[var(--theme-textSecondary)] text-sm">Loading documents…</div>
          </div>
        ) : (
          <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-[var(--theme-border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wide">
                <FileText size={14} className="text-[var(--theme-primary)]" />
                <span>Documents</span>
                <span className="text-[10px] text-[var(--theme-textSecondary)] normal-case">
                  ({files.length} files, {folders.length} folders)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!anySelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] ${
                    anySelected
                      ? 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary)]/10'
                      : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Download size={12} />
                  Download
                </button>
                <button
                  type="button"
                  disabled={!anySelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] ${
                    anySelected
                      ? 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary)]/10'
                      : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <MailIcon size={12} />
                  Email
                </button>
                <button
                  type="button"
                  disabled={!anySelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] ${
                    anySelected
                      ? 'border-red-500/50 text-red-500 bg-red-500/5 hover:bg-red-500/10'
                      : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)] w-8">
                      <input
                        type="checkbox"
                        className="rounded border-[var(--theme-border)] bg-transparent"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds({
                              folders: new Set(folders.map(f => f.id)),
                              files: new Set(files.map(f => f.id)),
                            });
                          } else {
                            clearSelection();
                          }
                        }}
                        checked={
                          folders.length > 0 &&
                          files.length > 0 &&
                          selectedIds.folders.size === folders.length &&
                          selectedIds.files.size === files.length
                        }
                      />
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-[var(--theme-textSecondary)] w-8">Type</th>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)]">Title</th>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)] w-16">Ext</th>
                    <th className="px-4 py-2 text-right font-semibold text-[var(--theme-textSecondary)] w-24">Size</th>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)] w-56">Modified</th>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)] w-20">Ver.</th>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)]">Workflow</th>
                    <th className="px-4 py-2 text-left font-semibold text-[var(--theme-textSecondary)]">Author</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map(folder => (
                    <tr key={`folder-${folder.id}`} className="border-b border-[var(--theme-border)]/60 hover:bg-[var(--theme-surface)]">
                      <td className="px-4 py-1.5 align-middle">
                        <input
                          type="checkbox"
                          className="rounded border-[var(--theme-border)] bg-transparent"
                          checked={selectedIds.folders.has(folder.id)}
                          onChange={() => toggleFolder(folder.id)}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[var(--theme-primary)]/10">
                          <Folder size={14} className="text-[var(--theme-primary)]" />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-text)]">
                        {folder.title}
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">—</td>
                      <td className="px-4 py-1.5 text-right text-[var(--theme-textSecondary)]">—</td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">—</td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">—</td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">—</td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">—</td>
                    </tr>
                  ))}

                  {files.map(file => (
                    <tr key={`file-${file.id}`} className="border-b border-[var(--theme-border)]/60 hover:bg-[var(--theme-surface)]">
                      <td className="px-4 py-1.5 align-middle">
                        <input
                          type="checkbox"
                          className="rounded border-[var(--theme-border)] bg-transparent"
                          checked={selectedIds.files.has(file.id)}
                          onChange={() => toggleFile(file.id)}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[var(--theme-primary)]/8">
                          <FileText size={14} className="text-[var(--theme-textSecondary)]" />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-text)]">
                        {file.name}
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">
                        {file.extension || ''}
                      </td>
                      <td className="px-4 py-1.5 text-right text-[var(--theme-textSecondary)]">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">
                        {formatDateTime(file.modified_on)}
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">
                        {file.version || ''}
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">
                        {file.workflow || ''}
                      </td>
                      <td className="px-4 py-1.5 text-[var(--theme-textSecondary)]">
                        {file.author || ''}
                      </td>
                    </tr>
                  ))}

                  {folders.length === 0 && files.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-[var(--theme-textSecondary)] text-xs">
                        <div className="inline-flex flex-col items-center gap-2">
                          <Link2 size={18} className="text-[var(--theme-textSecondary)] opacity-60" />
                          <span>No documents found for this project.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


