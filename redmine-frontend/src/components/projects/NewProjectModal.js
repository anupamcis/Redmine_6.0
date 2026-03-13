import React, { useState, useEffect } from 'react';
import { getNewProjectData, createProject } from '../../api/projectsAdapter';
import { getProjectSettings, autocompleteTags } from '../../api/projectSettingsAdapter';
import Modal from '../ui/Modal';
import { FileText, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NewProjectModal({ 
  isOpen, 
  onClose, 
  selectedServices = [], 
  selectedCompany = null,
  parentId = null 
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    application_type: '',
    description: '',
    identifier: '',
    homepage: '',
    default_version_id: '',
    major_technology: '',
    tag_list: '',
    is_public: false,
    inherit_members: false
  });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [serviceDetails, setServiceDetails] = useState([]);
  const [company, setCompany] = useState(null);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [versions, setVersions] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [enabledModules, setEnabledModules] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    } else {
      // Reset form when modal closes
      setFormData({
        name: '',
        application_type: '',
        description: '',
        identifier: '',
        homepage: '',
        default_version_id: '',
        major_technology: '',
        tag_list: '',
        is_public: false,
        inherit_members: false
      });
      setTags([]);
      setTagInput('');
      setTagSuggestions([]);
      setShowTagSuggestions(false);
      setError(null);
    }
  }, [isOpen, selectedServices, selectedCompany, parentId]);

  const loadFormData = async () => {
    try {
      setLoadingForm(true);
      setError(null);

      const params = {};
      if (selectedServices.length > 0) {
        params.selected_service_ids = selectedServices.join(',');
      }
      if (selectedCompany) {
        // Extract company ID if it's an object, otherwise use it directly
        const companyId = typeof selectedCompany === 'object' && selectedCompany.id 
          ? selectedCompany.id 
          : selectedCompany;
        if (companyId) {
          params.selected_client_company = companyId;
        }
      }
      if (parentId) {
        params.parent_id = parentId;
      }

      const formDataResponse = await getNewProjectData(params);

      if (formDataResponse.service_details) {
        setServiceDetails(formDataResponse.service_details);
      } else if (selectedServices.length > 0) {
        // If services are selected but not in response, use the selected services
        setServiceDetails(selectedServices.map(id => ({ id, name: `Service ${id}` })));
      }
      
      if (formDataResponse.company) {
        setCompany(formDataResponse.company);
      } else if (selectedCompany) {
        // If company is passed as prop (object with id and name), use it
        if (typeof selectedCompany === 'object' && selectedCompany.id) {
          setCompany(selectedCompany);
        } else {
          // If it's just an ID, create a placeholder
          setCompany({ id: selectedCompany, name: 'Loading...' });
        }
      }
      
      if (formDataResponse.trackers) {
        setTrackers(formDataResponse.trackers);
      }
      if (formDataResponse.custom_fields) {
        setCustomFields(formDataResponse.custom_fields);
      }
      if (formDataResponse.enabled_modules) {
        setEnabledModules(formDataResponse.enabled_modules);
      }
      if (formDataResponse.application_types) {
        setApplicationTypes(formDataResponse.application_types);
      }
      if (formDataResponse.technologies) {
        setTechnologies(formDataResponse.technologies);
      }

      // Also try to get versions from settings if needed
      try {
        const settingsData = await getProjectSettings(null, { tab: 'info' });
        if (settingsData && settingsData.versions) {
          setVersions(settingsData.versions);
        }
      } catch (e) {
        console.warn('[NewProjectModal] Could not load versions from settings:', e);
      }
    } catch (err) {
      console.error('[NewProjectModal] Error loading form data:', err);
      setError(err.message || 'Failed to load form data');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagInputChange = async (value) => {
    setTagInput(value);
    if (value.trim().length > 0) {
      try {
        const suggestions = await autocompleteTags(value.trim());
        const filteredSuggestions = suggestions.filter(s => !tags.includes(s));
        setTagSuggestions(filteredSuggestions);
        setShowTagSuggestions(true);
      } catch (err) {
        console.error('Error fetching tag suggestions:', err);
        setTagSuggestions([]);
        setShowTagSuggestions(false);
      }
    } else {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const handleSelectTagSuggestion = (suggestion) => {
    if (!tags.includes(suggestion)) {
      setTags([...tags, suggestion]);
    }
    setTagInput('');
    setTagSuggestions([]);
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const generateIdentifier = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    handleInputChange('name', name);
    
    // Auto-generate identifier if it's empty or matches the old name pattern
    if (!formData.identifier || formData.identifier === generateIdentifier(formData.name)) {
      handleInputChange('identifier', generateIdentifier(name));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.application_type) {
      setError('Application Type is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.identifier.trim()) {
      setError('Identifier is required');
      return false;
    }
    if (!/^[a-z][a-z0-9_-]*$/.test(formData.identifier)) {
      setError('Identifier must start with a lowercase letter and contain only lowercase letters, numbers, dashes, and underscores');
      return false;
    }
    if (formData.identifier.length > 100) {
      setError('Identifier must be 100 characters or less');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const projectData = {
        name: formData.name,
        description: formData.description,
        identifier: formData.identifier,
        homepage: formData.homepage || null,
        default_version_id: formData.default_version_id || null,
        application_type: formData.application_type || null,
        major_technology: formData.major_technology || null,
        tag_list: tags.join(', '),
        is_public: formData.is_public,
        inherit_members: formData.inherit_members
      };

      const params = {};
      if (selectedServices.length > 0) {
        params.selected_service_ids = selectedServices;
      }
      if (selectedCompany) {
        // Extract company ID if it's an object, otherwise use it directly
        const companyId = typeof selectedCompany === 'object' && selectedCompany.id 
          ? selectedCompany.id 
          : selectedCompany;
        if (companyId) {
          params.selected_client_company = String(companyId);
        }
      }
      if (parentId) {
        params.parent_id = String(parentId);
      }

      const result = await createProject(projectData, params);
      
      if (result.project) {
        onClose();
        // Navigate to project settings
        navigate(`/projects/${result.project.identifier}/settings`);
      } else {
        setError('Project created but no project data returned');
      }
    } catch (err) {
      console.error('[NewProjectModal] Error creating project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New project" size="2xl">
      {loadingForm ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading form...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500 flex items-center gap-2">
              <FileText size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              required
            />
          </div>

          {/* Application Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Application Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.application_type}
              onChange={(e) => handleInputChange('application_type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              required
            >
              <option value="">select application type...</option>
              {applicationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-y"
              required
            />
          </div>

          {/* Identifier */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Identifier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.identifier}
              onChange={(e) => handleInputChange('identifier', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              required
            />
            <p className="mt-1 text-xs text-[var(--theme-textSecondary)]">
              Length between 1 and 100 characters. Only lower case letters (a-z), numbers, dashes and underscores are allowed, must start with a lower case letter. Once saved, the identifier cannot be changed.
            </p>
          </div>

          {/* Home Page */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Home Page
            </label>
            <input
              type="text"
              value={formData.homepage}
              onChange={(e) => handleInputChange('homepage', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>

          {/* Company (read-only) */}
          {(company || (selectedCompany && typeof selectedCompany === 'object')) && (
            <div>
              <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                Company
              </label>
              <div className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]">
                {company ? company.name : (selectedCompany && selectedCompany.name ? selectedCompany.name : 'Loading company...')}
              </div>
            </div>
          )}

          {/* Default Version */}
          {versions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                Default version
              </label>
              <select
                value={formData.default_version_id}
                onChange={(e) => handleInputChange('default_version_id', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="">Select Version</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Technology */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Technology
            </label>
            <select
              value={formData.major_technology}
              onChange={(e) => handleInputChange('major_technology', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
              <option value="">select technology skill...</option>
              {technologies.map((tech) => (
                <option key={tech.value} value={tech.value}>
                  {tech.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 p-2 min-h-[42px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="hover:text-red-500 cursor-pointer"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ add tag"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onFocus={() => {
                  if (tagInput.trim().length > 0 && tagSuggestions.length > 0) {
                    setShowTagSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicking on them
                  setTimeout(() => setShowTagSuggestions(false), 200);
                }}
                className="flex-1 min-w-[100px] px-2 py-1 bg-transparent border-0 outline-none text-[var(--theme-text)] text-sm placeholder:text-[var(--theme-textSecondary)]"
              />
            </div>
            {/* Tag Suggestions Dropdown */}
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {tagSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectTagSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--theme-primary)]/10 text-[var(--theme-text)] text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Services */}
          {(serviceDetails.length > 0 || selectedServices.length > 0) && (
            <div className="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]">
              <h3 className="text-sm font-medium text-[var(--theme-text)] mb-2">Selected Services</h3>
              <ul className="space-y-1">
                {serviceDetails.length > 0 ? (
                  serviceDetails.map((service) => (
                    <li key={service.id} className="text-sm text-[var(--theme-textSecondary)]">
                      {service.name}
                    </li>
                  ))
                ) : (
                  selectedServices.map((serviceId) => (
                    <li key={serviceId} className="text-sm text-[var(--theme-textSecondary)]">
                      Service {serviceId}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]">
              <h3 className="text-sm font-medium text-[var(--theme-text)] mb-2">Custom fields</h3>
              <div className="space-y-2">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`custom_field_${field.id}`}
                      className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                    <label htmlFor={`custom_field_${field.id}`} className="text-sm text-[var(--theme-text)]">
                      {field.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--theme-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] text-sm hover:bg-[var(--theme-surface)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

