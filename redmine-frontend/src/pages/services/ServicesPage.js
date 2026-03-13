import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServicesData, assignServicesToProject, getCompanyByEmail, connectCompanyToProject } from '../../api/servicesAdapter';
import { FileText, Plus, Link as LinkIcon, RefreshCw } from 'lucide-react';
import NewProjectModal from '../../components/projects/NewProjectModal';

// Debounce utility
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ServicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'client'
  
  // Data from API
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [groupedServiceDetails, setGroupedServiceDetails] = useState([]);
  const [projects, setProjects] = useState([]);
  const [groupedProjects, setGroupedProjects] = useState({});
  const [projectType, setProjectType] = useState('None');
  const [services, setServices] = useState([]);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectParentId, setNewProjectParentId] = useState(null);
  
  // Client tab state
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState(null);
  const [clientProjects, setClientProjects] = useState([]);
  const [clientGroupedProjects, setClientGroupedProjects] = useState({});
  const [selectedClientProject, setSelectedClientProject] = useState('');
  const [loadingClient, setLoadingClient] = useState(false);

  // Debounced values to reduce API calls
  const debouncedSelectedCompany = useDebounce(selectedCompany, 300);
  const debouncedSelectedSupervisor = useDebounce(selectedSupervisor, 300);
  const debouncedSelectedServices = useDebounce(selectedServices, 300);
  const debouncedSelectedProject = useDebounce(selectedProject, 300);

  // Memoized loadServicesData function
  const loadServicesData = useCallback(async (params = {}, preserveProjectSelection = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getServicesData(params);
      
      if (data.error) {
        setError(data.error);
        setCompanies([]);
        return;
      }

      if (data.companies) {
        setCompanies(data.companies);
      }
      
      if (data.selected_company) {
        setSelectedCompany(String(data.selected_company.id));
      }
      
      if (data.supervisors) {
        setSupervisors(data.supervisors);
      }
      
      if (data.grouped_service_details) {
        setGroupedServiceDetails(data.grouped_service_details);
      }
      
      if (data.projects) {
        setProjects(data.projects);
      }
      
      if (data.grouped_projects) {
        setGroupedProjects(data.grouped_projects);
      }
      
      // Only update selectedProject if:
      // 1. We're not preserving the selection (preserveProjectSelection = false)
      // 2. AND the API returned a selected_project
      // 3. AND we don't already have a selectedProject in state
      if (!preserveProjectSelection) {
        if (data.selected_project) {
          // Use identifier if available, otherwise use ID
          const projectValue = data.selected_project.identifier || String(data.selected_project.id);
          setSelectedProject(projectValue);
        } else if (!selectedProject && params.client_project) {
          // If API didn't return selected_project but we passed client_project, use that
          setSelectedProject(params.client_project);
        }
      }
      
      if (data.project_type) {
        setProjectType(data.project_type);
      }
      
      if (data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('[ServicesPage] Error loading services:', err);
      setError(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  // Consolidated useEffect for initial load - only load companies
  useEffect(() => {
    let mounted = true;
    let abortController = new AbortController();
    
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Only fetch companies on initial load - much faster
        // Timeout is now handled in getServicesData function
        const data = await getServicesData({}, abortController.signal);
        
        if (!mounted) return;
        
        // Clear any previous errors on successful fetch
        setError(null);
        
        if (data.error) {
          setError(data.error);
          setCompanies([]);
          return;
        }

        if (data.companies) {
          setCompanies(data.companies);
        }
      } catch (err) {
        if (!mounted) return;
        if (err.name === 'AbortError' || err.message.includes('timeout')) {
          // Don't show error immediately - request might still be processing
          // Only show error if we truly have no data after a delay
          setTimeout(() => {
            if (mounted) {
              setError('Request is taking longer than expected. Please wait...');
            }
          }, 10000); // Wait 10 seconds before showing error
          // Note: Error will be cleared automatically when data arrives
          return;
        }
        console.error('[ServicesPage] Error loading initial data:', err);
        // Set error - it will be cleared when data arrives
        setError(err.message || 'Failed to load services');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []); // Only run once on mount

  // Consolidated useEffect for company changes
  useEffect(() => {
    // Skip if this is the initial load (companies haven't loaded yet)
    if (companies.length === 0 && !debouncedSelectedCompany) {
      return;
    }
    
    if (debouncedSelectedCompany) {
      loadServicesData({ selected_client_company: debouncedSelectedCompany });
    } else {
      setSupervisors([]);
      setGroupedServiceDetails([]);
      setProjects([]);
      setGroupedProjects({});
      setSelectedServices([]);
      setSelectedProject('');
      setProjectType('None');
    }
  }, [debouncedSelectedCompany, loadServicesData, companies.length]);

  // Consolidated useEffect for supervisor changes
  useEffect(() => {
    if (debouncedSelectedCompany && debouncedSelectedSupervisor) {
      loadServicesData({
        selected_client_company: debouncedSelectedCompany,
        supervisor: debouncedSelectedSupervisor
      });
    } else if (debouncedSelectedCompany) {
      loadServicesData({ selected_client_company: debouncedSelectedCompany });
    }
  }, [debouncedSelectedSupervisor, debouncedSelectedCompany, loadServicesData]);

  // Consolidated useEffect for services changes
  useEffect(() => {
    if (debouncedSelectedCompany && debouncedSelectedServices.length > 0) {
      // Preserve project selection when services change
      const currentProject = selectedProject;
      loadServicesData({
        selected_client_company: debouncedSelectedCompany,
        supervisor: debouncedSelectedSupervisor || '',
        services: debouncedSelectedServices,
        client_project: currentProject || undefined
      }, true); // Preserve project selection
    } else if (debouncedSelectedCompany) {
      setProjects([]);
      setGroupedProjects({});
      setSelectedProject('');
      setProjectType('None');
    }
  }, [debouncedSelectedServices, debouncedSelectedCompany, debouncedSelectedSupervisor, selectedProject, loadServicesData]);

  // Consolidated useEffect for project changes
  useEffect(() => {
    if (debouncedSelectedCompany && debouncedSelectedServices.length > 0 && debouncedSelectedProject) {
      // Reload data to get updated project_type when project is selected
      loadServicesData({
        selected_client_company: debouncedSelectedCompany,
        supervisor: debouncedSelectedSupervisor || '',
        services: debouncedSelectedServices,
        client_project: debouncedSelectedProject
      }, true); // Preserve the project selection
    }
  }, [debouncedSelectedProject, debouncedSelectedCompany, debouncedSelectedServices, debouncedSelectedSupervisor, loadServicesData]);

  const handleCompanyChange = useCallback((e) => {
    const companyId = e.target.value;
    setSelectedCompany(companyId);
    setSelectedSupervisor('');
    setSelectedServices([]);
    setSelectedProject('');
    setProjectType('None');
  }, []);

  const handleSupervisorChange = useCallback((e) => {
    setSelectedSupervisor(e.target.value);
    setSelectedServices([]);
    setSelectedProject('');
    setProjectType('None');
  }, []);

  const handleServiceChange = useCallback((e) => {
    const options = Array.from(e.target.selectedOptions);
    const serviceIds = options.map(option => option.value);
    setSelectedServices(serviceIds);
    setSelectedProject('');
    setProjectType('None');
  }, []);

  const handleProjectChange = useCallback((e) => {
    const projectValue = e.target.value;
    setSelectedProject(projectValue);
  }, []);

  const handleAssignToProject = useCallback(async () => {
    if (!selectedProject || selectedServices.length === 0) {
      setError('Please select a project and services');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Find project by identifier to get the ID
      const project = projects.find(p => String(p.identifier) === selectedProject || String(p.id) === selectedProject);
      if (!project) {
        setError('Project not found');
        setLoading(false);
        return;
      }
      
      await assignServicesToProject(String(project.id), selectedServices);
      
      setSuccess('Services assigned to project successfully');
      setTimeout(() => {
        // Navigate to project settings
        navigate(`/projects/${project.identifier}/settings?tab=assigned_service`);
      }, 1500);
    } catch (err) {
      console.error('[ServicesPage] Error assigning services:', err);
      setError(err.message || 'Failed to assign services to project');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedServices, projects, navigate]);

  const handleClear = useCallback(() => {
    setSelectedCompany('');
    setSelectedSupervisor('');
    setSelectedServices([]);
    setSelectedProject('');
    setProjectType('None');
    loadServicesData();
  }, [loadServicesData]);

  const handleNewProject = useCallback(() => {
    setNewProjectParentId(null);
    setNewProjectModalOpen(true);
  }, []);

  const handleNewSubproject = useCallback(() => {
    // Find project by identifier to get the ID
    const project = projects.find(p => String(p.identifier) === selectedProject || String(p.id) === selectedProject);
    setNewProjectParentId(project ? String(project.id) : selectedProject);
    setNewProjectModalOpen(true);
  }, [projects, selectedProject]);

  // Client tab handlers
  const handleGetCompany = useCallback(async () => {
    if (!clientEmail.trim()) {
      setError('Please enter a client email');
      return;
    }

    try {
      setLoadingClient(true);
      setError(null);
      setSuccess(null);
      const data = await getCompanyByEmail(clientEmail.trim());
      
      if (data.found && data.company) {
        setClientCompany(data.company);
        setClientProjects(data.projects || []);
        setClientGroupedProjects(data.grouped_projects || {});
        setSelectedClientProject('');
      } else {
        setClientCompany(null);
        setClientProjects([]);
        setClientGroupedProjects({});
        setSelectedClientProject('');
        setError(data.error || `No company found for ${clientEmail} email id`);
      }
    } catch (err) {
      console.error('[ServicesPage] Error getting company:', err);
      setError(err.message || 'Failed to get company');
      setClientCompany(null);
      setClientProjects([]);
      setClientGroupedProjects({});
    } finally {
      setLoadingClient(false);
    }
  }, [clientEmail]);

  const handleConnectCompany = useCallback(async () => {
    if (!clientCompany || !selectedClientProject) {
      setError('Please select a project');
      return;
    }

    try {
      setLoadingClient(true);
      setError(null);
      setSuccess(null);
      
      const result = await connectCompanyToProject(clientCompany.erp_client_id, selectedClientProject);
      
      if (result.success) {
        setSuccess(result.message || 'Company connected to project successfully');
        // Clear form after successful connection
        setTimeout(() => {
          setClientEmail('');
          setClientCompany(null);
          setClientProjects([]);
          setClientGroupedProjects({});
          setSelectedClientProject('');
        }, 2000);
      } else {
        setError('Failed to connect company to project');
      }
    } catch (err) {
      console.error('[ServicesPage] Error connecting company:', err);
      setError(err.message || 'Failed to connect company to project');
    } finally {
      setLoadingClient(false);
    }
  }, [clientCompany, selectedClientProject]);

  // Memoized options builders
  const buildClientProjectOptions = useMemo(() => {
    if (!clientGroupedProjects || Object.keys(clientGroupedProjects).length === 0) {
      // Fallback to flat projects list if grouped_projects is not available
      if (clientProjects && clientProjects.length > 0) {
        return clientProjects.map((project) => (
          <option key={project.id} value={project.identifier || project.id}>
            {project.name}
          </option>
        ));
      }
      return [];
    }

    return Object.entries(clientGroupedProjects).map(([status, projectList]) => {
      if (!Array.isArray(projectList) || projectList.length === 0) {
        return null;
      }
      
      const projectOptions = projectList.map(([projectName, projectIdentifier]) => {
        // Find the project to get its ID
        const project = clientProjects.find(p => p.identifier === projectIdentifier || String(p.id) === String(projectIdentifier));
        return (
          <option key={projectIdentifier} value={projectIdentifier}>
            {projectName}
          </option>
        );
      });
      
      return (
        <optgroup key={status} label={status}>
          {projectOptions}
        </optgroup>
      );
    }).filter(Boolean);
  }, [clientGroupedProjects, clientProjects]);

  // Build options for grouped service details
  const buildServiceOptions = useMemo(() => {
    if (!groupedServiceDetails || groupedServiceDetails.length === 0) {
      return [];
    }

    return groupedServiceDetails.map(([supervisorName, services]) => {
      if (!Array.isArray(services) || services.length === 0) {
        return null;
      }
      
      const serviceOptions = services.map(([serviceName, serviceId, attributes]) => {
        const attr = attributes || {};
        // Determine service type based on attributes
        // transferred = Shared Service (pink)
        // project_basis = Project Basis (yellow/gray)
        // No transferred_by = Master Service (green)
        let serviceType = '';
        let className = '';
        
        if (attr.id === 'transferred') {
          serviceType = 'shared';
          className = 'service-shared';
        } else if (attr.id === 'project_basis') {
          serviceType = 'project-basis';
          className = 'service-project-basis';
        } else {
          // Master Service (no transferred_by)
          serviceType = 'master';
          className = 'service-master';
        }
        
        return (
          <option key={serviceId} value={serviceId} className={className} data-service-type={serviceType}>
            {serviceName}
          </option>
        );
      });
      
      return (
        <optgroup key={supervisorName} label={supervisorName}>
          {serviceOptions}
        </optgroup>
      );
    }).filter(Boolean);
  }, [groupedServiceDetails]);

  // Build options for grouped projects
  const buildProjectOptions = useMemo(() => {
    if (!groupedProjects || Object.keys(groupedProjects).length === 0) {
      // Fallback to flat projects list if grouped_projects is not available
      if (projects && projects.length > 0) {
        return projects.map((project) => (
          <option key={project.id} value={project.identifier || project.id}>
            {project.name}
          </option>
        ));
      }
      return [];
    }

    return Object.entries(groupedProjects).map(([status, projectList]) => {
      if (!Array.isArray(projectList) || projectList.length === 0) {
        return null;
      }
      
      const projectOptions = projectList.map(([projectName, projectIdentifier]) => {
        // Find the project to get its ID
        const project = projects.find(p => p.identifier === projectIdentifier || String(p.id) === String(projectIdentifier));
        return (
          <option key={projectIdentifier} value={projectIdentifier}>
            {projectName}
          </option>
        );
      });
      
      return (
        <optgroup key={status} label={status}>
          {projectOptions}
        </optgroup>
      );
    }).filter(Boolean);
  }, [groupedProjects, projects]);

  // Memoized selected company object
  const selectedCompanyObj = useMemo(() => {
    return selectedCompany ? companies.find(c => String(c.id) === selectedCompany) : null;
  }, [selectedCompany, companies]);

  return (
    <div className="flex-1 overflow-auto -m-6">
      <style>{`
        /* Service type color coding */
        .service-select option.service-shared {
          background-color: #FFB6C1 !important;
          color: #000 !important;
        }
        .service-select option.service-master {
          background-color: #90EE90 !important;
          color: #000 !important;
        }
        .service-select option.service-project-basis {
          background-color: #FFD700 !important;
          color: #000 !important;
        }
        /* For selected options */
        .service-select option.service-shared:checked,
        .service-select option.service-shared:focus {
          background-color: #FFB6C1 !important;
          color: #000 !important;
        }
        .service-select option.service-master:checked,
        .service-select option.service-master:focus {
          background-color: #90EE90 !important;
          color: #000 !important;
        }
        .service-select option.service-project-basis:checked,
        .service-select option.service-project-basis:focus {
          background-color: #FFD700 !important;
          color: #000 !important;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-[var(--theme-text)]">Services</h1>
          <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
            Connect ERP Services with Existing/New PMS Project
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-[var(--theme-border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'services'
                  ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                  : 'border-transparent text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]'
              }`}
            >
              Connect ERP Services with Existing/New PMS Project
            </button>
            <button
              onClick={() => setActiveTab('client')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'client'
                  ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                  : 'border-transparent text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]'
              }`}
            >
              Connect ERP Client With Existing PMS Project
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

        {loading && !companies.length ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
            <div className="text-[var(--theme-textSecondary)] text-sm">Loading services…</div>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-6 text-center text-[var(--theme-textSecondary)] text-sm">
            {error || 'No services available'}
          </div>
        ) : (
          <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-sm p-6">
            {activeTab === 'services' && (
              <div className="space-y-4">
                {/* Company Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                    Company:
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={handleCompanyChange}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    <option value="">select company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supervisor Dropdown */}
                {supervisors.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                      Supervisor:
                    </label>
                    <select
                      value={selectedSupervisor}
                      onChange={handleSupervisorChange}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                      <option value="">All...</option>
                      {supervisors.map((supervisor) => (
                        <option key={supervisor.employee_id} value={supervisor.employee_id}>
                          {supervisor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Services Multi-select */}
                {groupedServiceDetails && groupedServiceDetails.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-[var(--theme-text)]">
                        Services:
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelectedServices([])}
                        className="text-xs text-[var(--theme-primary)] hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                    <select
                      multiple
                      value={selectedServices}
                      onChange={handleServiceChange}
                      size={8}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] service-select"
                    >
                      {buildServiceOptions}
                    </select>
                    <p className="mt-1 text-xs text-[var(--theme-textSecondary)]">
                      Hold Ctrl/Cmd to select multiple services
                    </p>
                  </div>
                )}

                {/* No services message */}
                {selectedCompany && (!groupedServiceDetails || groupedServiceDetails.length === 0) && !loading && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600 dark:text-yellow-400">
                    <p className="font-medium mb-1">No services available</p>
                    <p className="text-xs">There are no services assigned to this company. Please check the ERP system or select a different company.</p>
                  </div>
                )}

                {/* Project Dropdown */}
                {selectedServices.length > 0 && projects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                      Project:
                    </label>
                    <select
                      value={selectedProject}
                      onChange={handleProjectChange}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                      <option value="">select project...</option>
                      {buildProjectOptions}
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedCompany && selectedServices.length > 0 && (
                  <div className="flex items-center gap-3 pt-4 border-t border-[var(--theme-border)]">
                    {projectType === 'NEW' && (
                      <button
                        onClick={handleNewProject}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90"
                      >
                        <Plus size={14} />
                        New Project
                      </button>
                    )}
                    
                    {projectType === 'SUB_AND_EXSITING_AND_NEW' && (
                      <>
                        <button
                          onClick={handleNewProject}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90"
                        >
                          <Plus size={14} />
                          New Project
                        </button>
                        {selectedProject && (
                          <>
                            <button
                              onClick={handleNewSubproject}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90"
                            >
                              <Plus size={14} />
                              New Subproject
                            </button>
                            <button
                              onClick={handleAssignToProject}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50"
                            >
                              <LinkIcon size={14} />
                              {loading ? 'Attaching...' : 'Attach to Project'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                    
                    {projectType === 'SUB_AND_EXSITING' && selectedProject && (
                      <>
                        <button
                          onClick={handleNewSubproject}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90"
                        >
                          <Plus size={14} />
                          New Subproject
                        </button>
                        <button
                          onClick={handleAssignToProject}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50"
                        >
                          <LinkIcon size={14} />
                          {loading ? 'Attaching...' : 'Attach to Project'}
                        </button>
                      </>
                    )}
                    
                    {projectType === 'PROJECT_BASIS' && (
                      <>
                        {projects.length === 0 && (
                          <button
                            onClick={handleNewProject}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90"
                          >
                            <Plus size={14} />
                            New Project
                          </button>
                        )}
                        {selectedProject && (
                          <button
                            onClick={handleAssignToProject}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50"
                          >
                            <LinkIcon size={14} />
                            {loading ? 'Attaching...' : 'Attach to Project'}
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={handleClear}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] text-sm hover:bg-[var(--theme-surface)]"
                    >
                      <RefreshCw size={14} />
                      Clear
                    </button>
                  </div>
                )}

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-[var(--theme-border)]">
                  <ul className="flex items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
                    <li className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded border border-[var(--theme-border)] bg-[#FFB6C1]"></span>
                      Shared Service
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded border border-[var(--theme-border)] bg-[#90EE90]"></span>
                      Master Service
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded border border-[var(--theme-border)] bg-[#FFD700]"></span>
                      Project Basis
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'client' && (
              <div className="space-y-4">
                {/* Client Email Input */}
                <div>
                  <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                    Enter client email:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGetCompany();
                        }
                      }}
                      placeholder="Enter client email"
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    <button
                      onClick={handleGetCompany}
                      disabled={loadingClient || !clientEmail.trim()}
                      className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingClient ? 'Loading...' : 'Get company and projects'}
                    </button>
                  </div>
                </div>

                {/* Company and Project Selection */}
                {clientCompany && (
                  <div className="space-y-4 pt-4 border-t border-[var(--theme-border)]">
                    {/* Company Name (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                        Company:
                      </label>
                      <input
                        type="text"
                        value={clientCompany.name}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] opacity-75 cursor-not-allowed"
                      />
                    </div>

                    {/* Project Selection */}
                    {clientProjects.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                          Project:
                        </label>
                        <select
                          value={selectedClientProject}
                          onChange={(e) => setSelectedClientProject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        >
                          <option value="">select project...</option>
                          {buildClientProjectOptions}
                        </select>
                      </div>
                    )}

                    {/* Connect Button */}
                    {selectedClientProject && (
                      <div className="pt-2">
                        <button
                          onClick={handleConnectCompany}
                          disabled={loadingClient}
                          className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingClient ? 'Connecting...' : 'Connect company'}
                        </button>
                      </div>
                    )}

                    {clientProjects.length === 0 && (
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600">
                        No unassigned projects found for this user.
                      </div>
                    )}
                  </div>
                )}

                {/* Error message for no company found */}
                {!clientCompany && clientEmail && !loadingClient && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                    No company found for {clientEmail} email id
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* New Project Modal */}
        <NewProjectModal
          isOpen={newProjectModalOpen}
          onClose={() => setNewProjectModalOpen(false)}
          selectedServices={selectedServices}
          selectedCompany={selectedCompanyObj}
          parentId={newProjectParentId}
        />
      </div>
    </div>
  );
}

