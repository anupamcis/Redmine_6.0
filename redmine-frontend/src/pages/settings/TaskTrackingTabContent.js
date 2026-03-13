import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getProjectSettings,
  updateProjectSettings
} from '../../api/projectSettingsAdapter';
import { Save, FileText, Settings } from 'lucide-react';

export default function TaskTrackingTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [trackers, setTrackers] = useState([]);
  const [defaultVersionOptions, setDefaultVersionOptions] = useState([]);
  const [defaultAssignedToOptions, setDefaultAssignedToOptions] = useState([]);
  
  const [formData, setFormData] = useState({
    tracker_ids: [],
    default_version_id: '',
    default_assigned_to_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadSettings();
  }, [projectId, isAuthenticated, restoring]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectSettings(projectId, 'issues');
      
      // Set trackers
      const trackersData = data.trackers_data || [];
      setTrackers(trackersData);
      const selectedTrackerIds = trackersData.filter(t => t.selected).map(t => t.id);
      
      // Set default options
      setDefaultVersionOptions(data.default_version_options || []);
      setDefaultAssignedToOptions(data.default_assigned_to_options || []);
      
      // Set form data
      setFormData({
        tracker_ids: selectedTrackerIds,
        default_version_id: data.project?.default_version_id || '',
        default_assigned_to_id: data.project?.default_assigned_to_id || ''
      });
    } catch (err) {
      console.error('[TaskTrackingTabContent] Error loading settings:', err);
      setError(err.message || 'Failed to load task tracking settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackerToggle = (trackerId) => {
    setFormData(prev => {
      const currentIds = prev.tracker_ids || [];
      const newIds = currentIds.includes(trackerId)
        ? currentIds.filter(id => id !== trackerId)
        : [...currentIds, trackerId];
      return { ...prev, tracker_ids: newIds };
    });
  };

  const handleSelectAllTrackers = (checked) => {
    if (checked) {
      const allTrackerIds = trackers.map(t => t.id);
      setFormData(prev => ({ ...prev, tracker_ids: allTrackerIds }));
    } else {
      setFormData(prev => ({ ...prev, tracker_ids: [] }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Build update data - Rails expects arrays for tracker_ids
      // If empty, send empty array (Rails will handle it)
      const updateData = {
        tracker_ids: formData.tracker_ids.length > 0 ? formData.tracker_ids : [],
        default_version_id: formData.default_version_id || null,
        default_assigned_to_id: formData.default_assigned_to_id || null
      };
      
      console.log('[TaskTrackingTabContent] Saving data:', updateData);
      await updateProjectSettings(projectId, updateData);
      setSuccess('Successful update.');
      setTimeout(() => setSuccess(null), 3000);
      await loadSettings();
    } catch (err) {
      console.error('[TaskTrackingTabContent] Error saving settings:', err);
      setError(err.message || 'Failed to save task tracking settings');
    } finally {
      setSaving(false);
    }
  };

  const allTrackersSelected = trackers.length > 0 && trackers.every(t => formData.tracker_ids.includes(t.id));

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }


  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[var(--theme-text)] mb-4">Settings</h2>

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
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading settings…</div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4 mb-4">
            {/* Trackers Section */}
            {trackers.length > 0 && (
              <fieldset className="mb-4">
                <legend className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text)] mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allTrackersSelected}
                      onChange={(e) => handleSelectAllTrackers(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    Trackers
                  </label>
                </legend>
                <div className="flex flex-wrap gap-4">
                  {trackers.map((tracker) => (
                    <label key={tracker.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tracker_ids.includes(tracker.id)}
                        onChange={() => handleTrackerToggle(tracker.id)}
                        className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      />
                      <span className="text-sm text-[var(--theme-text)]">{tracker.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Default Settings */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--theme-border)]">
              {/* Default Version */}
              <div>
                <label htmlFor="default_version_id" className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Default version
                </label>
                <select
                  id="default_version_id"
                  value={formData.default_version_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_version_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                  <option value="">none</option>
                  {defaultVersionOptions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Assigned To */}
              <div>
                <label htmlFor="default_assigned_to_id" className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Default assigned to
                </label>
                <select
                  id="default_assigned_to_id"
                  value={formData.default_assigned_to_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_assigned_to_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                  <option value="">none</option>
                  {defaultAssignedToOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

