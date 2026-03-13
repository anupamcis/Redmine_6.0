import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Info } from 'lucide-react';
import {
  getHealthConfigAsPercentages,
  saveHealthConfigFromPercentages,
  resetHealthConfig
} from '../../utils/projectHealthConfig';

export default function DashboardSettingsModal({ isOpen, onClose }) {
  const [healthConfig, setHealthConfig] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = () => {
    setHealthConfig(getHealthConfigAsPercentages());
  };

  const handleSaveHealth = () => {
    if (saveHealthConfigFromPercentages(healthConfig)) {
      setSaveStatus('Health settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } else {
      setSaveStatus('Error saving health settings');
    }
  };

  const handleResetHealth = () => {
    if (window.confirm('Reset health settings to defaults?')) {
      resetHealthConfig();
      loadSettings();
      setSaveStatus('Health settings reset to defaults');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  if (!isOpen || !healthConfig) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-6 py-4">
          <h2 className="text-2xl font-bold text-[var(--theme-text)]">Dashboard Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--theme-text)]">
                <p className="font-medium mb-1">Customize project health classification</p>
                <p className="text-[var(--theme-textSecondary)]">
                  Adjust thresholds to match your team's standards. Changes apply immediately to all projects.
                </p>
              </div>
            </div>

            {/* Healthy Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--theme-text)] flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Healthy Projects
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Minimum Completion (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={healthConfig.healthy.minCompletion}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      healthy: { ...healthConfig.healthy, minCompletion: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Max Open/Closed Ratio
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={healthConfig.healthy.maxOpenClosedRatio}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      healthy: { ...healthConfig.healthy, maxOpenClosedRatio: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Moderate Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--theme-text)] flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                Moderate Projects
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Minimum Completion (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={healthConfig.moderate.minCompletion}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      moderate: { ...healthConfig.moderate, minCompletion: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Max Open/Closed Ratio
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={healthConfig.moderate.maxOpenClosedRatio}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      moderate: { ...healthConfig.moderate, maxOpenClosedRatio: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Inactivity Thresholds */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--theme-text)]">Inactivity Risk Levels (Days)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Low Risk</label>
                  <input
                    type="number"
                    min="0"
                    value={healthConfig.inactivity.low}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      inactivity: { ...healthConfig.inactivity, low: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Medium Risk</label>
                  <input
                    type="number"
                    min="0"
                    value={healthConfig.inactivity.medium}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      inactivity: { ...healthConfig.inactivity, medium: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">High Risk</label>
                  <input
                    type="number"
                    min="0"
                    value={healthConfig.inactivity.high}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      inactivity: { ...healthConfig.inactivity, high: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Critical</label>
                  <input
                    type="number"
                    min="0"
                    value={healthConfig.inactivity.critical}
                    onChange={(e) => setHealthConfig({
                      ...healthConfig,
                      inactivity: { ...healthConfig.inactivity, critical: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-border)]">
              <button
                onClick={handleResetHealth}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
              >
                <RotateCcw size={16} />
                Reset to Defaults
              </button>
              <button
                onClick={handleSaveHealth}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primaryDark)] transition-colors"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {saveStatus && (
          <div className="border-t border-[var(--theme-border)] px-6 py-3 bg-green-500/10">
            <p className="text-sm text-green-600 dark:text-green-400">{saveStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
}
