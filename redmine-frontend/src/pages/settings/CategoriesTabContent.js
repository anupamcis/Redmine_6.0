import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getIssueCategories,
  createIssueCategory,
  updateIssueCategory,
  deleteIssueCategory,
  getProjectSettings
} from '../../api/projectSettingsAdapter';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function CategoriesTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    assigned_to_id: ''
  });

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadCategories();
  }, [projectId, isAuthenticated, restoring]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load categories
      const categoriesData = await getIssueCategories(projectId);
      setCategories(categoriesData || []);
      
      // Load assignable users from project settings
      const settingsData = await getProjectSettings(projectId, 'categories');
      if (settingsData.assignable_users) {
        setAssignableUsers(settingsData.assignable_users || []);
      }
    } catch (err) {
      console.error('[CategoriesTabContent] Error loading categories:', err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', assigned_to_id: '' });
    setShowAddModal(true);
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name || '',
      assigned_to_id: category.assigned_to_id ? category.assigned_to_id.toString() : ''
    });
    setEditingCategory(category.id);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setError(null);
      // Build category data - only include assigned_to_id if it has a value
      const categoryData = {
        name: formData.name.trim()
      };
      
      // Handle assigned_to_id - always include it in the request
      // Convert to integer if present, or send empty string to clear (Rails will convert to nil)
      if (formData.assigned_to_id && formData.assigned_to_id !== '') {
        const userId = parseInt(formData.assigned_to_id, 10);
        if (!isNaN(userId) && userId > 0) {
          categoryData.assigned_to_id = userId;
        } else {
          // Invalid user ID, send empty string to clear
          categoryData.assigned_to_id = '';
        }
      } else {
        // No user selected, send empty string to clear the assignment
        categoryData.assigned_to_id = '';
      }

      console.log('[CategoriesTabContent] Saving category data:', categoryData);

      if (editingCategory) {
        await updateIssueCategory(editingCategory, categoryData);
      } else {
        await createIssueCategory(projectId, categoryData);
      }

      setShowAddModal(false);
      setEditingCategory(null);
      setFormData({ name: '', assigned_to_id: '' });
      await loadCategories();
    } catch (err) {
      console.error('[CategoriesTabContent] Error saving category:', err);
      setError(err.message || `Failed to ${editingCategory ? 'update' : 'create'} category`);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      setError(null);
      await deleteIssueCategory(categoryId);
      await loadCategories();
    } catch (err) {
      console.error('[CategoriesTabContent] Error deleting category:', err);
      setError(err.message || 'Failed to delete category');
    }
  };

  const handleCancel = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setFormData({ name: '', assigned_to_id: '' });
    setError(null);
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
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Task categories</h2>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading categories…</div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-textSecondary)] text-sm">
          No categories found
        </div>
      ) : (
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">
                    Task category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border)]">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-[var(--theme-surface)] transition-colors">
                    <td className="px-4 py-3 text-[var(--theme-text)]">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                      {category.assigned_to_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] transition-colors text-xs"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors text-xs"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={showAddModal || editingCategory !== null}
        onClose={handleCancel}
        title={editingCategory ? 'Edit category' : 'New category'}
      >
        <div className="space-y-4">
          {/* Category Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Task category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder="Enter category name"
              required
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Assigned To
            </label>
            <select
              value={formData.assigned_to_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
              <option value="">—</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 transition-opacity"
            >
              <Save size={14} />
              {editingCategory ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

