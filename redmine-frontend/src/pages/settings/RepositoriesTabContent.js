import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getRepositories,
  createRepository,
  updateRepository,
  deleteRepository,
  getProjectSettings
} from '../../api/projectSettingsAdapter';
import { Plus, Edit2, Trash2, X, Save, FileText } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function RepositoriesTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [availableScmTypes, setAvailableScmTypes] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    repository_scm: '',
    identifier: '',
    url: '',
    is_default: false
  });
  const [addingRepository, setAddingRepository] = useState(false);

  const [editingRepository, setEditingRepository] = useState(null);
  const [editForm, setEditForm] = useState({
    identifier: '',
    url: '',
    is_default: false
  });
  const [savingRepository, setSavingRepository] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [repositoryToDelete, setRepositoryToDelete] = useState(null);
  const [deletingRepository, setDeletingRepository] = useState(false);

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadRepositories();
  }, [projectId, isAuthenticated, restoring]);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load repositories
      const repositoriesData = await getRepositories(projectId);
      setRepositories(repositoriesData || []);
      
      // Load available SCM types from project settings
      const settingsData = await getProjectSettings(projectId, 'repositories');
      if (settingsData.available_scm_types) {
        setAvailableScmTypes(settingsData.available_scm_types || []);
      }
    } catch (err) {
      console.error('[RepositoriesTabContent] Error loading repositories:', err);
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setAddForm({
      repository_scm: availableScmTypes.length > 0 ? availableScmTypes[0].class : '',
      identifier: '',
      url: '',
      is_default: repositories.length === 0
    });
    setShowAddModal(true);
  };

  const handleEdit = (repository) => {
    setEditForm({
      identifier: repository.identifier || '',
      url: repository.url || '',
      is_default: repository.is_default || false
    });
    setEditingRepository(repository.id);
  };

  const handleSave = async () => {
    if (editingRepository) {
      // Update existing repository
      if (!editForm.url.trim()) {
        setError('Repository URL is required');
        return;
      }
      try {
        setSavingRepository(true);
        setError(null);
        const repositoryData = {
          identifier: editForm.identifier.trim() || null,
          url: editForm.url.trim(),
          is_default: editForm.is_default
        };
        await updateRepository(editingRepository, repositoryData);
        setSuccess('Repository updated successfully.');
        setTimeout(() => setSuccess(null), 3000);
        setEditingRepository(null);
        setEditForm({ identifier: '', url: '', is_default: false });
        await loadRepositories();
      } catch (err) {
        console.error('[RepositoriesTabContent] Error updating repository:', err);
        setError(err.message || 'Failed to update repository');
      } finally {
        setSavingRepository(false);
      }
    } else {
      // Create new repository
      if (!addForm.url.trim()) {
        setError('Repository URL is required');
        return;
      }
      if (!addForm.repository_scm) {
        setError('SCM type is required');
        return;
      }
      try {
        setAddingRepository(true);
        setError(null);
        const repositoryData = {
          repository_scm: addForm.repository_scm,
          identifier: addForm.identifier.trim() || null,
          url: addForm.url.trim(),
          is_default: addForm.is_default
        };
        await createRepository(projectId, repositoryData);
        setSuccess('Repository created successfully.');
        setTimeout(() => setSuccess(null), 3000);
        setShowAddModal(false);
        setAddForm({ repository_scm: '', identifier: '', url: '', is_default: false });
        await loadRepositories();
      } catch (err) {
        console.error('[RepositoriesTabContent] Error creating repository:', err);
        setError(err.message || 'Failed to create repository');
      } finally {
        setAddingRepository(false);
      }
    }
  };

  const handleDelete = (repository) => {
    setRepositoryToDelete(repository);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!repositoryToDelete) return;
    try {
      setDeletingRepository(true);
      setError(null);
      await deleteRepository(repositoryToDelete.id);
      setSuccess('Repository deleted successfully.');
      setTimeout(() => setSuccess(null), 3000);
      setShowDeleteModal(false);
      setRepositoryToDelete(null);
      await loadRepositories();
    } catch (err) {
      console.error('[RepositoriesTabContent] Error deleting repository:', err);
      setError(err.message || 'Failed to delete repository');
    } finally {
      setDeletingRepository(false);
    }
  };

  const handleCancel = () => {
    setShowAddModal(false);
    setEditingRepository(null);
    setAddForm({ repository_scm: '', identifier: '', url: '', is_default: false });
    setEditForm({ identifier: '', url: '', is_default: false });
  };

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Repositories</h2>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New repository
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500 flex items-center gap-2">
          <FileText size={14} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-500 flex items-center gap-2">
          <FileText size={14} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading repositories…</div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-textSecondary)] text-sm">
          No repositories found.
        </div>
      ) : (
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Identifier</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Main repository</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">SCM</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Repository</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border)]">
                {repositories.map((repository) => (
                  <tr key={repository.id} className="hover:bg-[var(--theme-surface)] transition-colors">
                    <td className="px-4 py-3 text-[var(--theme-text)]">
                      {editingRepository === repository.id ? (
                        <input
                          type="text"
                          value={editForm.identifier}
                          onChange={(e) => setEditForm({ ...editForm, identifier: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                          placeholder="Identifier (optional)"
                        />
                      ) : (
                        repository.identifier || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                      {editingRepository === repository.id ? (
                        <input
                          type="checkbox"
                          checked={editForm.is_default}
                          onChange={(e) => setEditForm({ ...editForm, is_default: e.target.checked })}
                          className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                      ) : (
                        repository.is_default ? '✓' : '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                      {repository.scm_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--theme-text)]">
                      {editingRepository === repository.id ? (
                        <input
                          type="text"
                          value={editForm.url}
                          onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                          placeholder="Repository URL"
                          required
                        />
                      ) : (
                        repository.url || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingRepository === repository.id ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={savingRepository}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--theme-primary)] text-white text-xs hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Save size={12} />
                              {savingRepository ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] text-xs hover:bg-[var(--theme-surface)] transition-colors"
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(repository)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] transition-colors text-xs"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(repository)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors text-xs"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Repository Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCancel}
        title="New repository"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              SCM <span className="text-red-500">*</span>
            </label>
            <select
              value={addForm.repository_scm}
              onChange={(e) => setAddForm({ ...addForm, repository_scm: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              required
            >
              <option value="">Select SCM type</option>
              {availableScmTypes.map((scm) => (
                <option key={scm.class} value={scm.class}>
                  {scm.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Identifier
            </label>
            <input
              type="text"
              value={addForm.identifier}
              onChange={(e) => setAddForm({ ...addForm, identifier: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="Identifier (optional)"
            />
            <p className="mt-1 text-xs text-[var(--theme-textSecondary)]">
              Leave blank for default repository
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Repository URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addForm.url}
              onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="Repository URL"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={addForm.is_default}
              onChange={(e) => setAddForm({ ...addForm, is_default: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
            <label htmlFor="is_default" className="text-sm font-medium text-[var(--theme-text)]">
              Main repository
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={addingRepository}
              className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingRepository ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Repository Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRepositoryToDelete(null);
        }}
        title="Delete repository"
      >
        {repositoryToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--theme-text)]">
              Are you sure you want to delete the repository "<strong>{repositoryToDelete.identifier || repositoryToDelete.url}</strong>"?
            </p>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-500">
              This action cannot be undone. All changesets and file changes associated with this repository will be deleted.
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setRepositoryToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingRepository}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingRepository ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


