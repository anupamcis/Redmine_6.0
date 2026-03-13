import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getProjectVersions,
  createVersion,
  updateVersion,
  deleteVersion,
  closeCompletedVersions
} from '../../api/projectSettingsAdapter';
import { Plus, Edit2, Trash2, X, Save, Lock, Search, RotateCcw } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function VersionsTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterName, setFilterName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    effective_date: '',
    status: 'open',
    sharing: 'none'
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'locked', label: 'Locked' },
    { value: 'closed', label: 'Closed' }
  ];

  const sharingOptions = [
    { value: 'none', label: 'Not shared' },
    { value: 'descendants', label: 'With subprojects' },
    { value: 'hierarchy', label: 'With project hierarchy' },
    { value: 'tree', label: 'With project tree' },
    { value: 'system', label: 'With all projects' }
  ];

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    
    // Debounce filter changes to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadVersions();
    }, filterName ? 300 : 0); // 300ms delay for name filter, immediate for status
    
    return () => clearTimeout(timeoutId);
  }, [projectId, isAuthenticated, restoring, filterStatus, filterName]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectVersions(projectId, {
        version_status: filterStatus,
        version_name: filterName
      });
      setVersions(data.versions_data || []);
    } catch (err) {
      console.error('[VersionsTabContent] Error loading versions:', err);
      setError(err.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      description: '',
      effective_date: '',
      status: 'open',
      sharing: 'none'
    });
    setEditingVersion(null);
    setShowAddModal(true);
  };

  const handleEdit = (version) => {
    setFormData({
      name: version.name || '',
      description: version.description || '',
      effective_date: version.effective_date || '',
      status: version.status || 'open',
      sharing: version.sharing || 'none'
    });
    setEditingVersion(version);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const versionData = {
        name: formData.name,
        description: formData.description,
        effective_date: formData.effective_date || null,
        status: formData.status,
        sharing: formData.sharing
      };

      if (editingVersion) {
        await updateVersion(editingVersion.id, versionData);
      } else {
        await createVersion(projectId, versionData);
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingVersion(null);
      await loadVersions();
    } catch (err) {
      console.error('[VersionsTabContent] Error saving version:', err);
      setError(err.message || 'Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (version) => {
    if (!window.confirm(`Are you sure you want to delete version "${version.name}"?`)) return;
    
    try {
      setDeleting(version.id);
      setError(null);
      await deleteVersion(version.id);
      await loadVersions();
    } catch (err) {
      console.error('[VersionsTabContent] Error deleting version:', err);
      setError(err.message || 'Failed to delete version');
    } finally {
      setDeleting(null);
    }
  };

  const handleCloseCompleted = async () => {
    if (!window.confirm('Are you sure you want to close all completed versions?')) return;
    
    try {
      setError(null);
      await closeCompletedVersions(projectId);
      await loadVersions();
    } catch (err) {
      console.error('[VersionsTabContent] Error closing completed versions:', err);
      setError(err.message || 'Failed to close completed versions');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const formatSharing = (sharing) => {
    const option = sharingOptions.find(opt => opt.value === sharing);
    return option ? option.label : sharing;
  };

  const formatStatus = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
  };

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">Versions</h2>
          <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
            Manage project versions and releases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {versions.length > 0 && (
            <button
              onClick={handleCloseCompleted}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] text-xs hover:bg-[var(--theme-surface)] transition-colors"
            >
              <Lock size={14} />
              Close completed versions
            </button>
          )}
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            New version
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Version Name
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Search versions..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
            </div>
          </div>
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5 opacity-0 pointer-events-none">
              Clear
            </label>
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterName('');
              }}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] text-sm hover:bg-[var(--theme-surface)] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw size={14} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading versions…</div>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-[var(--theme-textSecondary)] text-sm">
            {filterStatus || filterName ? 'No versions found matching the current filters' : 'No versions found'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--theme-border)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Version</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Default</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Due date</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Sharing</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Issues</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr
                  key={version.id}
                  className={`border-b border-[var(--theme-border)] hover:bg-[var(--theme-surface)] transition-colors ${
                    version.status === 'closed' ? 'opacity-75' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-[var(--theme-text)]">
                    <div className="flex items-center gap-2">
                      {version.is_shared && (
                        <span className="text-[var(--theme-textSecondary)]" title="Shared version">
                          🔗
                        </span>
                      )}
                      <span className="font-medium">{version.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                    {version.is_default ? '✓' : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                    {formatDate(version.effective_date)}
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                    {version.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      version.status === 'open' 
                        ? 'bg-green-500/10 text-green-500' 
                        : version.status === 'locked'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {formatStatus(version.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                    {formatSharing(version.sharing)}
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                    {version.issue_count || 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!version.is_shared && (
                        <>
                          <button
                            onClick={() => handleEdit(version)}
                            className="p-1.5 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)] transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(version)}
                            disabled={deleting === version.id || !version.deletable}
                            className="p-1.5 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 size={14} />
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
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingVersion(null);
        }}
        title={editingVersion ? 'Edit Version' : 'New Version'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              required
            >
              {statusOptions.filter(opt => opt.value !== '').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Due date
            </label>
            <input
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--theme-textSecondary)] mb-1.5">
              Sharing
            </label>
            <select
              value={formData.sharing}
              onChange={(e) => setFormData({ ...formData, sharing: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
              {sharingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--theme-border)]">
            <button
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingVersion(null);
              }}
              className="px-4 py-1.5 text-sm rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

