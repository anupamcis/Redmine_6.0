import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getProjectSettings, updateProjectSettings, autocompleteTags } from '../../api/projectSettingsAdapter';
import { Settings, Save, FileText, Users, Tag, GitBranch, Folder, Clock, Link2, ListChecks } from 'lucide-react';
import Card from '../../components/ui/Card';
import CKEditor from '../../components/editor/CKEditor';
import MembersTabContent from './MembersTabContent';
import VersionsTabContent from './VersionsTabContent';
import CategoriesTabContent from './CategoriesTabContent';
import RepositoriesTabContent from './RepositoriesTabContent';
import ActivitiesTabContent from './ActivitiesTabContent';
import AssignedServicesTabContent from './AssignedServicesTabContent';
import TaskTrackingTabContent from './TaskTrackingTabContent';

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'info';
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [project, setProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [formData, setFormData] = useState({});
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadSettings();
  }, [projectId, isAuthenticated, restoring]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        identifier: project.identifier || '',
        description: project.description || '',
        homepage: project.homepage || '',
        default_version_id: project.default_version_id || '',
        application_type: project.application_type || '',
        major_technology: project.major_technology || '',
        is_public: project.is_public || false,
        inherit_members: project.inherit_members || false
      });
      
      // Set tags from project tag_list (only update if tag_list is present)
      if (project.tag_list != null && project.tag_list !== '') {
        const tagListString = String(project.tag_list).trim();
        if (tagListString) {
          const parsedTags = tagListString.split(',').map(t => t.trim()).filter(Boolean);
          console.log('[ProjectSettingsPage] useEffect - Parsed tags from project state:', parsedTags, 'from:', tagListString);
          setTags(parsedTags);
        }
      }
      // Don't clear tags here - let loadSettings handle initial loading
    }
  }, [project]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectSettings(projectId);
      // Filter out the Modules tab
      const filteredTabs = (data.tabs || []).filter(tab => tab.name !== 'modules');
      setTabs(filteredTabs);
      setProject(data.project || {});
      setVersions(data.versions || []);
      setApplicationTypes(data.application_types || []);
      setTechnologies(data.technologies || []);
      
      // Parse tags from tag_list string (comma-separated)
      const tagListString = (data.project?.tag_list != null) ? String(data.project.tag_list).trim() : '';
      if (tagListString) {
        const parsedTags = tagListString.split(',').map(t => t.trim()).filter(Boolean);
        console.log('[ProjectSettingsPage] Parsed tags from API:', parsedTags, 'from:', tagListString, 'raw:', data.project?.tag_list);
        setTags(parsedTags);
      } else {
        console.log('[ProjectSettingsPage] No tag_list or empty tag_list. Raw project data:', data.project);
        setTags([]);
      }
      
      // If modules tab is active, redirect to first available tab or 'info'
      if (activeTab === 'modules') {
        const firstTab = filteredTabs.length > 0 ? filteredTabs[0].name : 'info';
        setSearchParams({ tab: firstTab });
      } else if (filteredTabs.length > 0 && !activeTab) {
        setSearchParams({ tab: filteredTabs[0].name });
      }
    } catch (err) {
      console.error('[ProjectSettingsPage] Error loading settings:', err);
      setError(err.message || 'Failed to load project settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updateData = {
        name: formData.name,
        description: formData.description,
        homepage: formData.homepage,
        default_version_id: formData.default_version_id || null,
        application_type: formData.application_type || null,
        major_technology: formData.major_technology || null,
        tag_list: tags.join(', '),
        is_public: formData.is_public,
        inherit_members: formData.inherit_members
      };

      await updateProjectSettings(projectId, updateData);
      setSuccess('Project settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload settings to get updated data
      await loadSettings();
    } catch (err) {
      console.error('[ProjectSettingsPage] Error saving settings:', err);
      setError(err.message || 'Failed to update project settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle tag input with autocomplete
  const handleTagInputChange = async (value) => {
    setTagInput(value);
    
    if (value.trim().length > 0) {
      try {
        const suggestions = await autocompleteTags(value);
        // Filter out tags that are already added
        const filteredSuggestions = suggestions.filter(tag => 
          !tags.includes(tag) && tag.toLowerCase().includes(value.toLowerCase())
        );
        setTagSuggestions(filteredSuggestions);
        setShowTagSuggestions(filteredSuggestions.length > 0);
      } catch (err) {
        console.warn('[ProjectSettingsPage] Error fetching tag suggestions:', err);
        setTagSuggestions([]);
        setShowTagSuggestions(false);
      }
    } else {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  };

  const handleTagInputKeyDown = (e) => {
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

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  // Map tab names to icons (matching Reports page pattern)
  const getTabIcon = (tabName) => {
    const iconMap = {
      'info': FileText,
      'members': Users,
      'issues': ListChecks,
      'versions': GitBranch,
      'categories': Tag,
      'repositories': Folder,
      'time_tracking': Clock,
      'assigned_service': Link2,
      'activities': Clock
    };
    return iconMap[tabName] || Settings;
  };

  return (
    <div className="flex-1 min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] -m-6">
      <div className="flex h-full">
        {/* Vertical Sidebar Navigation - matching Reports page */}
        <div className="w-64 border-r border-[var(--theme-border)] bg-[var(--theme-cardBg)] flex flex-col">
          <div className="p-4 border-b border-[var(--theme-border)]">
            <div className="flex items-center gap-2 mb-1">
              <Settings size={20} className="text-[var(--theme-primary)]" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>
            {projectId && (
              <p className="text-xs text-[var(--theme-textSecondary)]">
                Project Settings
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {tabs.map((tab) => {
              const Icon = getTabIcon(tab.name);
              const isActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => setSearchParams({ tab: tab.name })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 flex items-center gap-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20'
                      : 'text-[var(--theme-text)] hover:bg-[var(--theme-surface)]'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* Header - matching dashboard style */}
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[var(--theme-text)] mb-2">
                {tabs.find(t => t.name === activeTab)?.label || 'Settings'}
              </h1>
              <p className="text-sm text-[var(--theme-textSecondary)]">
                {activeTab === 'info' 
                  ? 'Configure project settings and preferences.'
                  : `Manage ${tabs.find(t => t.name === activeTab)?.label.toLowerCase()} settings.`
                }
              </p>
            </header>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500 flex items-center gap-2">
                <FileText size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-500 flex items-center gap-2">
                <FileText size={16} />
                <span>{success}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
                <span>Loading settings…</span>
              </div>
            ) : (
              <>

                {/* Tab Content - using Card component and grid system */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Basic Information Card */}
                    <Card
                      title="Project"
                      action={
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={14} />
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      }
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div>
                          <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--theme-primary)]/20 bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                            required
                          />
                        </div>

                        {/* Application Type */}
                        {applicationTypes.length > 0 && (
                          <div>
                            <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                              Application Type
                            </label>
                            <select
                              value={formData.application_type}
                              onChange={(e) => handleInputChange('application_type', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-primary)]/20 bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                              required
                            >
                              <option value="">Select Application Type</option>
                              {applicationTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Identifier */}
                        <div>
                          <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                            Identifier
                          </label>
                          <input
                            type="text"
                            value={formData.identifier}
                            onChange={(e) => handleInputChange('identifier', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--theme-primary)]/20 bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={project?.identifier_frozen}
                            required
                          />
                          {project?.identifier_frozen && (
                            <p className="mt-1 text-xs text-[var(--theme-textSecondary)]">
                              Identifier cannot be changed after project creation
                            </p>
                          )}
                        </div>

                        {/* Home Page */}
                        <div>
                          <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                            Home Page
                          </label>
                          <input
                            type="text"
                            value={formData.homepage}
                            onChange={(e) => handleInputChange('homepage', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                          />
                        </div>

                        {/* Default Version */}
                        <div>
                          <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                            Default Version
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

                        {/* Technology */}
                        <div>
                          <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                            Technology
                          </label>
                          <select
                            value={formData.major_technology}
                            onChange={(e) => handleInputChange('major_technology', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                          >
                            <option value="">Select Technology</option>
                            {technologies.map((tech) => (
                              <option key={tech.value} value={tech.value}>
                                {tech.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Description - Full Width */}
                      <div className="mt-6">
                        <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
                          Description
                        </label>
                        <CKEditor
                          value={formData.description}
                          onChange={(data) => handleInputChange('description', data)}
                          placeholder="Enter project description (supports rich text and HTML)…"
                          disabled={saving}
                        />
                      </div>

                      {/* Tags - Full Width */}
                      <div className="mt-6 relative">
                        <label className="block text-xs text-[var(--theme-textSecondary)] mb-2">
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
                                onClick={() => setTags(tags.filter((_, i) => i !== index))}
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
                            onKeyDown={handleTagInputKeyDown}
                            onFocus={() => {
                              if (tagInput.trim().length > 0 && tagSuggestions.length > 0) {
                                setShowTagSuggestions(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowTagSuggestions(false), 200);
                            }}
                            className="flex-1 min-w-[100px] px-2 py-1 bg-transparent border-0 outline-none text-[var(--theme-text)] text-sm placeholder:text-[var(--theme-textSecondary)]"
                          />
                        </div>
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
                    </Card>
                  </div>
                )}

                {activeTab === 'members' && (
                  <MembersTabContent projectId={projectId} />
                )}

                {activeTab === 'versions' && (
                  <VersionsTabContent projectId={projectId} />
                )}

                {activeTab === 'categories' && (
                  <CategoriesTabContent projectId={projectId} />
                )}

                {activeTab === 'repositories' && (
                  <RepositoriesTabContent projectId={projectId} />
                )}

                {activeTab === 'activities' && (
                  <ActivitiesTabContent projectId={projectId} />
                )}

                {activeTab === 'assigned_service' && (
                  <AssignedServicesTabContent projectId={projectId} />
                )}

                {activeTab === 'issues' && (
                  <TaskTrackingTabContent projectId={projectId} />
                )}

                {activeTab && !['info', 'members', 'versions', 'categories', 'repositories', 'activities', 'assigned_service', 'issues'].includes(activeTab) && (
                  <Card>
                    <div className="text-center text-[var(--theme-textSecondary)] text-sm">
                      Content for {tabs.find(t => t.name === activeTab)?.label || activeTab} tab is coming soon...
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

