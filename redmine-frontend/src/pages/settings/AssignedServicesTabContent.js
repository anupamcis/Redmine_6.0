import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  getProjectSettings,
  removeServiceDetail,
  updateServiceDetailMaster
} from '../../api/projectSettingsAdapter';
import { Trash2, FileText, RefreshCw } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function AssignedServicesTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [services, setServices] = useState([]);
  const [serviceStatusOptions, setServiceStatusOptions] = useState(['All']);
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('service_status') || 'All');
  const [projectCompanyName, setProjectCompanyName] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [updatingMaster, setUpdatingMaster] = useState(false);
  const [removingService, setRemovingService] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [serviceToRemove, setServiceToRemove] = useState(null);

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadServices();
  }, [projectId, isAuthenticated, restoring, selectedStatus]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedStatus && selectedStatus !== 'All' ? { service_status: selectedStatus } : {};
      const data = await getProjectSettings(projectId, 'assigned_service', params);
      setServices(data.assigned_services_data || []);
      setServiceStatusOptions(data.service_status_options || ['All']);
      setProjectCompanyName(data.project_company_name);
      
      // Find current master service
      const masterService = (data.assigned_services_data || []).find(s => s.is_master);
      setSelectedMaster(masterService?.id || null);
    } catch (err) {
      console.error('[AssignedServicesTabContent] Error loading services:', err);
      setError(err.message || 'Failed to load assigned services');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    const newParams = new URLSearchParams(searchParams);
    if (status && status !== 'All') {
      newParams.set('service_status', status);
    } else {
      newParams.delete('service_status');
    }
    setSearchParams(newParams);
  };

  const handleMasterChange = async (serviceId) => {
    if (updatingMaster || serviceId === selectedMaster) return;
    
    try {
      setUpdatingMaster(true);
      setError(null);
      await updateServiceDetailMaster(projectId, serviceId);
      setSuccess('Master service updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
      setSelectedMaster(serviceId);
      await loadServices();
    } catch (err) {
      console.error('[AssignedServicesTabContent] Error updating master:', err);
      setError(err.message || 'Failed to update master service');
    } finally {
      setUpdatingMaster(false);
    }
  };

  const handleRemoveClick = (service) => {
    setServiceToRemove(service);
    setShowRemoveModal(true);
  };

  const confirmRemove = async () => {
    if (!serviceToRemove) return;
    
    try {
      setRemovingService(serviceToRemove.id);
      setError(null);
      await removeServiceDetail(serviceToRemove.id);
      setSuccess('Service removed successfully.');
      setTimeout(() => setSuccess(null), 3000);
      setShowRemoveModal(false);
      setServiceToRemove(null);
      await loadServices();
    } catch (err) {
      console.error('[AssignedServicesTabContent] Error removing service:', err);
      setError(err.message || 'Failed to remove service');
    } finally {
      setRemovingService(null);
    }
  };

  const getServiceTypeClass = (service) => {
    return service.service_type_class || 'project_basis';
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
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[var(--theme-text)] mb-4">Settings</h2>
        
        {/* Filters */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4 mb-4">
          <fieldset>
            <legend className="text-sm font-medium text-[var(--theme-text)] mb-2">Filters</legend>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="service_status" className="text-sm text-[var(--theme-text)]">
                  Status:
                </label>
                <select
                  id="service_status"
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                  {serviceStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              {projectCompanyName && (
                <span className="text-sm text-[var(--theme-text)] font-medium">
                  (Company: {projectCompanyName})
                </span>
              )}
            </div>
          </fieldset>
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
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading services…</div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-textSecondary)] text-sm">
          No services found.
        </div>
      ) : (
        <>
          <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Change Master</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Service Id</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Added By</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Service Type</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--theme-border)]">
                  {services.map((service) => {
                    const serviceTypeClass = getServiceTypeClass(service);
                    const isMaster = service.id === selectedMaster;
                    const canChangeMaster = service.can_change_master && !updatingMaster;
                    
                    return (
                      <tr 
                        key={service.id} 
                        id={serviceTypeClass}
                        className="hover:bg-[var(--theme-surface)] transition-colors"
                      >
                        <td className="px-4 py-3 text-center">
                          {canChangeMaster ? (
                            <input
                              type="radio"
                              name="master_service"
                              checked={isMaster}
                              onChange={() => handleMasterChange(service.id)}
                              disabled={updatingMaster}
                              className="w-4 h-4 text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                          ) : (
                            <span className="text-[var(--theme-textSecondary)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--theme-text)]">
                          {service.service_id}
                        </td>
                        <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                          {service.added_by || '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                          {service.service_type || '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                          {service.status || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {service.removable ? (
                            <button
                              onClick={() => handleRemoveClick(service)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:opacity-90 transition-opacity"
                            >
                              <Trash2 size={12} />
                              Remove Service
                            </button>
                          ) : (
                            <span className="text-[var(--theme-textSecondary)] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <ul className="flex items-center gap-6 mt-4 list-none">
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 border border-[var(--theme-border)] bg-transparent inline-block"></span>
              <span className="text-sm text-[var(--theme-textSecondary)]">Shared Service</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 border border-[var(--theme-border)] bg-transparent inline-block"></span>
              <span className="text-sm text-[var(--theme-textSecondary)]">Master Service</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 border border-[var(--theme-border)] bg-transparent inline-block"></span>
              <span className="text-sm text-[var(--theme-textSecondary)]">Project Basis</span>
            </li>
          </ul>
        </>
      )}

      {/* Remove Service Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setServiceToRemove(null);
        }}
        title="Remove Service"
      >
        {serviceToRemove && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--theme-text)]">
              Are you sure you want to remove the service "<strong>{serviceToRemove.service_id}</strong>" from this project?
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
              <button
                type="button"
                onClick={() => {
                  setShowRemoveModal(false);
                  setServiceToRemove(null);
                }}
                className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={removingService === serviceToRemove.id}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingService === serviceToRemove.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


