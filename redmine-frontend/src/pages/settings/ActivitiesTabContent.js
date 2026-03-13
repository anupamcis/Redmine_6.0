import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getProjectSettings,
  updateActivities,
  resetActivities
} from '../../api/projectSettingsAdapter';
import { Save, RotateCcw, FileText } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function ActivitiesTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activities, setActivities] = useState([]);
  const [modifiedActivities, setModifiedActivities] = useState({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadActivities();
  }, [projectId, isAuthenticated, restoring]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectSettings(projectId, 'activities');
      const activitiesData = data.activities_data || [];
      setActivities(activitiesData);
      // Initialize modified activities as empty
      setModifiedActivities({});
    } catch (err) {
      console.error('[ActivitiesTabContent] Error loading activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityToggle = (activityId, active) => {
    setModifiedActivities(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        active: active
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Build activities data for update
      // For system activities, we need to send parent_id to create project override
      // Only send activities that have been modified
      const activitiesData = {};
      
      Object.keys(modifiedActivities).forEach(activityId => {
        const activity = activities.find(a => a.id.toString() === activityId.toString());
        if (activity) {
          const newActiveState = modifiedActivities[activityId].active;
          
          activitiesData[activityId] = {
            active: newActiveState
          };
          
          // For system activities, include parent_id to create/update project override
          // This is required for the backend to know it's overriding a system activity
          if (activity.is_system) {
            activitiesData[activityId].parent_id = activity.id;
          }
        }
      });

      console.log('[ActivitiesTabContent] Sending activities data:', activitiesData);
      await updateActivities(projectId, activitiesData);
      setSuccess('Successful update.');
      setTimeout(() => setSuccess(null), 3000);
      setModifiedActivities({});
      await loadActivities();
    } catch (err) {
      console.error('[ActivitiesTabContent] Error saving activities:', err);
      setError(err.message || 'Failed to save activities');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      setError(null);
      await resetActivities(projectId);
      setSuccess('Activities reset successfully.');
      setTimeout(() => setSuccess(null), 3000);
      setShowResetModal(false);
      setModifiedActivities({});
      await loadActivities();
    } catch (err) {
      console.error('[ActivitiesTabContent] Error resetting activities:', err);
      setError(err.message || 'Failed to reset activities');
    } finally {
      setResetting(false);
    }
  };

  const getActivityActiveState = (activityId) => {
    if (modifiedActivities[activityId]?.active !== undefined) {
      return modifiedActivities[activityId].active;
    }
    const activity = activities.find(a => a.id.toString() === activityId.toString());
    return activity ? activity.active : false;
  };

  const hasChanges = Object.keys(modifiedActivities).length > 0;

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Settings</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] text-sm hover:bg-[var(--theme-surface)] transition-colors"
            title="Reset"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
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
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading activities…</div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-textSecondary)] text-sm">
          No activities found.
        </div>
      ) : (
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-center font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">System Activity</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activities.every(a => getActivityActiveState(a.id))}
                        onChange={(e) => {
                          activities.forEach(activity => {
                            handleActivityToggle(activity.id, e.target.checked);
                          });
                        }}
                        className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      />
                      Active
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border)]">
                {activities.map((activity) => {
                  const isActive = getActivityActiveState(activity.id);
                  return (
                    <tr key={activity.id} className="hover:bg-[var(--theme-surface)] transition-colors">
                      <td className="px-4 py-3 text-left text-[var(--theme-text)]">
                        {activity.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {activity.is_system ? (
                          <span className="inline-flex items-center justify-center w-5 h-5">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-[var(--theme-textSecondary)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => handleActivityToggle(activity.id, e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save button below table */}
      {!loading && activities.length > 0 && (
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset activities"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--theme-text)]">
            Are you sure you want to reset all project-specific activity overrides? This will remove all custom activity settings and restore the system defaults.
          </p>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-500">
            This action cannot be undone. All project-specific activity customizations will be lost.
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? 'Resetting...' : 'Reset'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

