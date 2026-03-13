import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  createIssue,
  updateIssue,
  getIssue,
  getProjectTrackers,
  getIssueStatuses,
  getIssuePriorities,
  getProjectMembers,
  getIssues,
  getProjectVersions,
  getProjectMilestones,
  uploadFile,
  deleteAttachment,
  getProjectIssueCategories
} from '../../api/redmineTasksAdapter';
import { getAuthHeader } from '../../api/redmineAdapter';
import { fetchTaskSuccess } from '../../store/taskSlice';
import { ChevronLeft, Save, Search, Upload, X, Download } from 'lucide-react';
import CKEditor from '../../components/editor/CKEditor';

export default function TaskFormPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectName, taskId } = useParams();
  const isEdit = !!taskId;
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    tracker_id: '',
    status_id: '',
    priority_id: '',
    assigned_to_id: '',
    category_id: '',
    due_date: '',
    start_date: '',
    estimated_hours: '',
    done_ratio: 0,
    parent_issue_id: '',
    is_private: false,
    fixed_version_id: '',
    fixed_milestone_id: '',
    files: []
  });
  const [trackers, setTrackers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [members, setMembers] = useState([]);
  const [versions, setVersions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allMilestones, setAllMilestones] = useState([]); // Store all milestones
  const [filteredMilestones, setFilteredMilestones] = useState([]); // Filtered by version
  const [parentIssues, setParentIssues] = useState([]);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [error, setError] = useState(null);
  const parentDropdownRef = useRef(null);

  useEffect(() => {
    // Load all required data (milestones will be loaded when version is selected)
    Promise.all([
      getProjectTrackers(projectName),
      getIssueStatuses(),
      getIssuePriorities(),
      getProjectMembers(projectName),
      getIssues(projectName, { limit: 100, status_id: '*' }), // For parent task selection
      getProjectVersions(projectName), // Get versions (not shared, only current project)
      getProjectIssueCategories(projectName)
    ]).then(([trackersData, statusesData, prioritiesData, membersData, issuesData, versionsData, categoriesData]) => {
      console.log('[TaskFormPage] Loaded priorities:', prioritiesData);
      setTrackers(trackersData);
      setStatuses(statusesData);
      setPriorities(prioritiesData);
      setMembers(membersData);
      setParentIssues(issuesData.issues || []);
      setCategories(categoriesData);
      
      // Validate and filter versions - versions should NOT have version_id field (that's for milestones)
      const validVersions = (versionsData || []).filter(v => {
        // Versions from Redmine API have: id, name, project, status, etc.
        // They should NOT have version_id (that's a milestone field)
        return v && v.id && v.name && !v.hasOwnProperty('version_id');
      });
      console.log('[TaskFormPage] Raw versions data:', versionsData);
      console.log('[TaskFormPage] Valid versions (filtered):', validVersions.length, validVersions);
      setVersions(validVersions);
      
      // Don't load milestones on initial load - they will be loaded when version is selected
      setAllMilestones([]);
      setFilteredMilestones([]);
    }).catch(err => {
      console.error('[TaskFormPage] Error loading form data:', err);
      // Set empty arrays on error to prevent showing wrong data
      // Don't fail completely if milestones fail - they're optional
      setVersions([]);
      setCategories([]);
      setAllMilestones([]);
      setFilteredMilestones([]);
    });
    
    if (isEdit && taskId) {
      getIssue(taskId).then(data => {
        const issue = data.issue;
        const versionId = issue.fixed_version?.id || '';
        setFormData({
          subject: issue.subject || '',
          description: issue.description || '',
          tracker_id: issue.tracker?.id || '',
          status_id: issue.status?.id || '',
          priority_id: issue.priority?.id || '',
          assigned_to_id: issue.assigned_to?.id || '',
          category_id: issue.category?.id || '',
          due_date: issue.due_date || '',
          start_date: issue.start_date || '',
          estimated_hours: issue.estimated_hours || '',
          done_ratio: typeof issue.done_ratio === 'number' ? issue.done_ratio : 0,
          parent_issue_id: issue.parent?.id || '',
          is_private: issue.is_private || false,
          fixed_version_id: versionId,
          fixed_milestone_id: issue.fixed_milestone?.id || '',
          files: []
        });
        setExistingAttachments(issue.attachments || []);
        dispatch(fetchTaskSuccess(issue));
      }).catch(err => {
        setError(err.message);
      });
    }
  }, [projectName, taskId, isEdit, dispatch]);

  // Load milestones when version is set in edit mode
  useEffect(() => {
    if (isEdit && formData.fixed_version_id && allMilestones.length === 0) {
      const versionId = parseInt(formData.fixed_version_id, 10);
      if (versionId) {
        console.log('[TaskFormPage] Loading milestones for version in edit mode:', versionId);
        getProjectMilestones(projectName, versionId)
          .then(milestonesData => {
            const validMilestones = (milestonesData || []).filter(m => {
              return m && m.id && (m.name || m.title) && (m.version_id !== undefined && m.version_id !== null);
            });
            console.log('[TaskFormPage] Loaded milestones for edit mode:', validMilestones);
            setAllMilestones(validMilestones);
            setFilteredMilestones(validMilestones);
          })
          .catch(err => {
            console.error('[TaskFormPage] Error loading milestones in edit mode:', err);
          });
      }
    }
  }, [isEdit, formData.fixed_version_id, projectName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Log formData to debug
      console.log('[TaskFormPage] Form data before processing:', formData);
      const payload = {
        project_id: projectName,
        subject: formData.subject,
        description: formData.description || ''
      };

      // Only include fields that have values (check for non-empty strings)
      if (formData.tracker_id && formData.tracker_id !== '') {
        const trackerId = parseInt(formData.tracker_id, 10);
        if (!isNaN(trackerId)) {
          payload.tracker_id = trackerId;
        }
      }
      
      // Priority - always include if set (required by Redmine)
      if (formData.priority_id) {
        const priorityIdStr = String(formData.priority_id).trim();
        if (priorityIdStr !== '' && priorityIdStr !== '0') {
          const priorityId = parseInt(priorityIdStr, 10);
          if (!isNaN(priorityId) && priorityId > 0) {
            payload.priority_id = priorityId;
            console.log('[TaskFormPage] Priority ID set:', priorityId, 'from value:', formData.priority_id);
          } else {
            console.warn('[TaskFormPage] Invalid priority_id value:', formData.priority_id, 'parsed as:', priorityId);
          }
        } else {
          console.warn('[TaskFormPage] Priority ID is empty or zero:', formData.priority_id);
        }
      } else {
        console.warn('[TaskFormPage] Priority ID not set in formData');
      }
      
      if (formData.assigned_to_id && formData.assigned_to_id !== '') {
        const assignedToId = parseInt(formData.assigned_to_id, 10);
        if (!isNaN(assignedToId)) {
          payload.assigned_to_id = assignedToId;
        }
      }

      if (formData.category_id && formData.category_id !== '') {
        const categoryId = parseInt(formData.category_id, 10);
        if (!isNaN(categoryId)) {
          payload.category_id = categoryId;
        }
      }
      
      if (formData.start_date && formData.start_date.trim() !== '') {
        payload.start_date = formData.start_date;
      }
      
      if (formData.due_date && formData.due_date.trim() !== '') {
        payload.due_date = formData.due_date;
      }
      
      const estimatedHours = parseHoursInput(formData.estimated_hours);
      if (estimatedHours !== null) {
        payload.estimated_hours = estimatedHours;
      }
      
      if (formData.parent_issue_id && formData.parent_issue_id !== '') {
        const parentId = parseInt(formData.parent_issue_id, 10);
        if (!isNaN(parentId)) {
          payload.parent_issue_id = parentId;
        }
      }

      if (typeof formData.done_ratio === 'number') {
        const ratio = Math.min(100, Math.max(0, parseInt(formData.done_ratio, 10) || 0));
        payload.done_ratio = ratio;
      }

      // Always include is_private (boolean) - explicitly set to true or false
      payload.is_private = Boolean(formData.is_private);

      if (formData.status_id) {
        const statusId = parseInt(formData.status_id, 10);
        if (!isNaN(statusId)) {
          payload.status_id = statusId;
        }
      }

      // Handle version if provided
      if (formData.fixed_version_id && formData.fixed_version_id !== '') {
        const versionId = parseInt(formData.fixed_version_id, 10);
        if (!isNaN(versionId)) {
          payload.fixed_version_id = versionId;
        }
      }

      // Handle milestone if provided
      if (formData.fixed_milestone_id && formData.fixed_milestone_id !== '') {
        const milestoneId = parseInt(formData.fixed_milestone_id, 10);
        if (!isNaN(milestoneId)) {
          payload.fixed_milestone_id = milestoneId;
        }
      }

      // Delete removed attachments (only in edit mode)
      if (isEdit && deletedAttachmentIds.length > 0) {
        console.log('[TaskFormPage] Deleting', deletedAttachmentIds.length, 'attachment(s)...');
        for (const attachmentId of deletedAttachmentIds) {
          try {
            console.log('[TaskFormPage] Deleting attachment:', attachmentId);
            await deleteAttachment(attachmentId);
            console.log('[TaskFormPage] Successfully deleted attachment:', attachmentId);
          } catch (err) {
            console.error('[TaskFormPage] Failed to delete attachment:', attachmentId, err);
            const errorMsg = err.message || err.toString() || 'Unknown error';
            setError(`Failed to delete attachment: ${errorMsg}`);
            setLoading(false);
            return;
          }
        }
      }

      // Handle file uploads - upload files first to get tokens
      if (selectedFiles.length > 0) {
        console.log('[TaskFormPage] Uploading', selectedFiles.length, 'file(s)...');
        const uploadTokens = [];

        for (const file of selectedFiles) {
          try {
            console.log('[TaskFormPage] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
            const upload = await uploadFile(file);
            if (upload && upload.token) {
              uploadTokens.push({
                token: upload.token,
                filename: upload.filename || file.name,
                content_type: upload.content_type || file.type
              });
              console.log('[TaskFormPage] Successfully uploaded:', file.name, 'Token:', upload.token);
            } else {
              throw new Error('Upload succeeded but no token received');
            }
          } catch (err) {
            console.error('[TaskFormPage] Failed to upload file:', file.name, err);
            const errorMsg = err.message || err.toString() || 'Unknown error';
            setError(`Failed to upload file "${file.name}": ${errorMsg}`);
            setLoading(false);
            return;
          }
        }
        
        if (uploadTokens.length > 0) {
          payload.uploads = uploadTokens;
          console.log('[TaskFormPage] Added', uploadTokens.length, 'upload token(s) to payload');
        } else {
          console.warn('[TaskFormPage] No upload tokens collected despite files being selected');
        }
      }

      console.log('[TaskFormPage] Form data before submit:', formData);
      console.log('[TaskFormPage] Submitting payload:', JSON.stringify(payload, null, 2));

      if (isEdit) {
        await updateIssue(taskId, payload);
      } else {
        const result = await createIssue(payload);
        navigate(`/projects/${projectName}/tasks/${result.issue.id}`);
        return;
      }
      
      navigate(`/projects/${projectName}/tasks/${taskId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'done_ratio') {
      const ratio = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
      setFormData(prev => ({ ...prev, done_ratio: ratio }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'fixed_version_id') {
      const versionId = value ? parseInt(value, 10) : null;
      console.log('[TaskFormPage] Version changed to:', versionId);

      if (versionId) {
        setLoadingMilestones(true);
        getProjectMilestones(projectName, versionId)
          .then(milestonesData => {
            const validMilestones = (milestonesData || []).filter(m => {
              const isValid = m && m.id && (m.name || m.title) && (m.version_id !== undefined && m.version_id !== null);
              if (!isValid) {
                console.warn('[TaskFormPage] Invalid milestone filtered out:', m);
              }
              return isValid;
            });
            console.log('[TaskFormPage] Loaded milestones for version', versionId, ':', validMilestones);
            setAllMilestones(validMilestones);
            setFilteredMilestones(validMilestones);
            setLoadingMilestones(false);

            setFormData(prevData => {
              if (
                prevData.fixed_milestone_id &&
                !validMilestones.find(m => parseInt(m.id, 10) === parseInt(prevData.fixed_milestone_id, 10))
              ) {
                return { ...prevData, fixed_milestone_id: '' };
              }
              return prevData;
            });
          })
          .catch(err => {
            console.error('[TaskFormPage] Error loading milestones:', err);
            setAllMilestones([]);
            setFilteredMilestones([]);
            setLoadingMilestones(false);
          });
      } else {
        console.log('[TaskFormPage] No version selected, clearing milestones');
        setAllMilestones([]);
        setFilteredMilestones([]);
        setFormData(prevData => ({ ...prevData, fixed_milestone_id: '' }));
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const filteredParentIssues = parentIssues.filter(issue => 
    issue.subject.toLowerCase().includes(parentSearchTerm.toLowerCase()) ||
    issue.id.toString().includes(parentSearchTerm)
  );

  const selectedParentIssue = parentIssues.find(issue => issue.id.toString() === formData.parent_issue_id);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(event.target)) {
        setShowParentDropdown(false);
      }
    };

    if (showParentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showParentDropdown]);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--theme-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/${projectName}/tasks${isEdit ? `/${taskId}` : ''}`)}
            className="p-2 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-text)] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-[var(--theme-text)]">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}

          {isEdit ? (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            {/* Left column */}
            <div className="space-y-6">
              <section className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] p-6 space-y-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      Project
                    </label>
                    <div className="mt-2 px-4 py-2 border border-dashed border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)]">
                      {projectName}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="tracker_id" className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      Tracker
                    </label>
                    <select
                      id="tracker_id"
                      name="tracker_id"
                      value={formData.tracker_id}
                      onChange={handleChange}
                      className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                      <option value="">Select tracker</option>
                      {trackers.map(tracker => (
                        <option key={tracker.id} value={tracker.id}>{tracker.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-[var(--theme-border)] rounded-xl bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    placeholder="What needs to be done?"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Description
                  </label>
                  <CKEditor
                    value={formData.description}
                    onChange={(data) => {
                      setFormData(prev => ({ ...prev, description: data }));
                    }}
                    placeholder="Add more context just like ClickUp detail panel…"
                    disabled={loading}
                  />
                </div>

              </section>

              <section className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--theme-text)]">Attachments</h3>
                  <span className="text-xs text-[var(--theme-textSecondary)]">Max 10 MB each</span>
                </div>
                
                {/* Upload Area */}
                <label className="flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-[var(--theme-border)] rounded-xl bg-[var(--theme-inputBg)] text-[var(--theme-text)] cursor-pointer hover:bg-[var(--theme-surface)] hover:border-[var(--theme-primary)] transition-all group">
                  <Upload size={32} className="text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-primary)] transition-colors" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--theme-text)]">Click to upload or drag and drop</p>
                    <p className="text-xs text-[var(--theme-textSecondary)] mt-1">PDF, DOC, XLS, PNG, JPG up to 10MB</p>
                  </div>
                  <input type="file" multiple onChange={handleFileChange} className="hidden" />
                </label>

                {/* Existing Attachments */}
                {existingAttachments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      Uploaded Files ({existingAttachments.length})
                    </h4>
                    <div className="space-y-2">
                      {existingAttachments.map((attachment) => (
                        <div 
                          key={attachment.id} 
                          className="flex items-center justify-between px-4 py-3 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] hover:border-[var(--theme-primary)] transition-all group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--theme-text)] truncate">{attachment.filename}</p>
                              <p className="text-xs text-[var(--theme-textSecondary)] mt-0.5">
                                {(attachment.filesize / 1024).toFixed(1)} KB • {attachment.author?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={attachment.content_url}
                              download={attachment.filename}
                              className="p-2 rounded-lg hover:bg-[var(--theme-cardBg)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)] transition-colors"
                              title="Download"
                            >
                              <Download size={16} />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete "${attachment.filename}"?`)) {
                                  setDeletedAttachmentIds(prev => [...prev, attachment.id]);
                                  setExistingAttachments(prev => prev.filter(a => a.id !== attachment.id));
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--theme-textSecondary)] hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Files to Upload */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      New Files ({selectedFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between px-4 py-3 bg-blue-500/5 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--theme-text)] truncate">{file.name}</p>
                              <p className="text-xs text-[var(--theme-textSecondary)] mt-0.5">
                                {(file.size / 1024).toFixed(1)} KB • Ready to upload
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--theme-textSecondary)] hover:text-red-500 transition-colors flex-shrink-0"
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <section className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--theme-text)]">Task properties</h3>
                  <span className="text-xs text-[var(--theme-textSecondary)]">ClickUp style</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Status</label>
                    <select
                      id="status_id"
                      name="status_id"
                      value={formData.status_id}
                      onChange={handleChange}
                      className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                      <option value="">Select status</option>
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Priority</label>
                      <select
                        id="priority_id"
                        name="priority_id"
                        value={formData.priority_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority_id: e.target.value }))}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      >
                        <option value="">Select priority</option>
                        {priorities.map(priority => (
                          <option key={priority.id} value={String(priority.id)}>{priority.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Assigned to</label>
                      <select
                        id="assigned_to_id"
                        name="assigned_to_id"
                        value={formData.assigned_to_id}
                        onChange={handleChange}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      >
                        <option value="">Unassigned</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Category</label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] p-6 space-y-4 shadow-sm">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Version</label>
                      <select
                        id="fixed_version_id"
                        name="fixed_version_id"
                        value={formData.fixed_version_id || ''}
                        onChange={handleChange}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      >
                        <option value="">Select version</option>
                        {versions && versions.length > 0 ? (
                          versions.map(version => (
                            <option key={version.id} value={version.id}>
                              {version.name || `Version ${version.id}`}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No versions available</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Milestone/Sprint</label>
                      <select
                        id="fixed_milestone_id"
                        name="fixed_milestone_id"
                        value={formData.fixed_milestone_id || ''}
                        onChange={handleChange}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                        disabled={!formData.fixed_version_id || loadingMilestones}
                      >
                        <option value="">
                          {loadingMilestones
                            ? 'Loading milestones...'
                            : formData.fixed_version_id
                              ? 'Select milestone'
                              : 'Select a version first'}
                        </option>
                        {filteredMilestones && filteredMilestones.length > 0 ? (
                          filteredMilestones.map(milestone => (
                            <option key={milestone.id} value={milestone.id}>
                              {milestone.name || milestone.title || `Milestone ${milestone.id}`}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            {formData.fixed_version_id && !loadingMilestones ? 'No milestones available' : ''}
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="relative" ref={parentDropdownRef}>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      Parent task
                    </label>
                    <div className="mt-2 relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)] pointer-events-none" />
                      <input
                        type="text"
                        value={selectedParentIssue ? `#${selectedParentIssue.id} · ${selectedParentIssue.subject}` : parentSearchTerm}
                        onChange={(e) => {
                          setParentSearchTerm(e.target.value);
                          setShowParentDropdown(true);
                          if (!e.target.value) {
                            setFormData(prev => ({ ...prev, parent_issue_id: '' }));
                          }
                        }}
                        onFocus={() => setShowParentDropdown(true)}
                        placeholder="Search parent task…"
                        className="w-full pl-10 pr-10 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                      />
                      {selectedParentIssue && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, parent_issue_id: '' }));
                            setParentSearchTerm('');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--theme-surface)] rounded"
                        >
                          <X size={16} className="text-[var(--theme-textSecondary)]" />
                        </button>
                      )}
                      {showParentDropdown && parentSearchTerm && (
                        <div className="absolute z-50 w-full mt-2 bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {filteredParentIssues.length > 0 ? (
                            filteredParentIssues.map(issue => (
                              <div
                                key={issue.id}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, parent_issue_id: issue.id.toString() }));
                                  setParentSearchTerm('');
                                  setShowParentDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-[var(--theme-surface)] cursor-pointer text-[var(--theme-text)]"
                              >
                                <div className="font-medium">#{issue.id} · {issue.subject}</div>
                                {issue.status && (
                                  <div className="text-xs text-[var(--theme-textSecondary)]">{issue.status.name}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-[var(--theme-textSecondary)] text-sm">No tasks found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Start date</label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Due date</label>
                      <input
                        type="date"
                        id="due_date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleChange}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">Estimated time (hours)</label>
                      <input
                        type="text"
                        id="estimated_hours"
                        name="estimated_hours"
                        value={formData.estimated_hours}
                        onChange={handleChange}
                        className="mt-2 w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">% Done</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          name="done_ratio"
                          min="0"
                          max="100"
                          step="5"
                          value={formData.done_ratio}
                          onChange={handleChange}
                          className="flex-1 accent-[var(--theme-primary)]"
                        />
                        <span className="w-12 text-right text-sm font-medium text-[var(--theme-text)]">
                          {formData.done_ratio}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--theme-text)]">Privacy</p>
                    <p className="text-xs text-[var(--theme-textSecondary)]">Match Redmine’s private toggle</p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_private"
                      name="is_private"
                      checked={formData.is_private}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    <span className="text-sm text-[var(--theme-text)]">Private</span>
                  </label>
                </div>
              </section>
            </div>
          </div>
          ) : (
            <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-6 space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  placeholder="Enter task subject"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                  Description
                </label>
                <CKEditor
                  value={formData.description}
                  onChange={(data) => {
                    setFormData(prev => ({ ...prev, description: data }));
                  }}
                  placeholder="Enter task description"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="tracker_id" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Tracker
                  </label>
                  <select
                    id="tracker_id"
                    name="tracker_id"
                    value={formData.tracker_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    <option value="">Select tracker</option>
                    {trackers.map(tracker => (
                      <option key={tracker.id} value={tracker.id}>{tracker.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="priority_id" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Priority
                  </label>
                  <select
                    id="priority_id"
                    name="priority_id"
                    value={formData.priority_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    <option value="">Select priority</option>
                    {priorities.map(priority => (
                      <option key={priority.id} value={String(priority.id)}>{priority.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="fixed_version_id" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Version
                  </label>
                  <select
                    id="fixed_version_id"
                    name="fixed_version_id"
                    value={formData.fixed_version_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    <option value="">Select version</option>
                    {versions && versions.length > 0 ? (
                      versions.map(version => (
                        <option key={version.id} value={version.id}>
                          {version.name || `Version ${version.id}`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No versions available</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="fixed_milestone_id" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                  Milestone
                </label>
                <select
                  id="fixed_milestone_id"
                  name="fixed_milestone_id"
                  value={formData.fixed_milestone_id || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  disabled={!formData.fixed_version_id || loadingMilestones}
                >
                  <option value="">
                    {loadingMilestones
                      ? 'Loading milestones...'
                      : formData.fixed_version_id
                        ? 'Select milestone'
                        : 'Select a version first'}
                  </option>
                  {filteredMilestones && filteredMilestones.length > 0 ? (
                    filteredMilestones.map(milestone => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name || milestone.title || `Milestone ${milestone.id}`}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {formData.fixed_version_id && !loadingMilestones ? 'No milestones available for this version' : ''}
                    </option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="assigned_to_id" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Assigned To
                  </label>
                  <select
                    id="assigned_to_id"
                    name="assigned_to_id"
                    value={formData.assigned_to_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    <option value="">Unassigned</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative" ref={parentDropdownRef}>
                  <label htmlFor="parent_issue_id" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Parent Task
                  </label>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)] pointer-events-none" />
                    <input
                      type="text"
                      value={selectedParentIssue ? `#${selectedParentIssue.id} - ${selectedParentIssue.subject}` : parentSearchTerm}
                      onChange={(e) => {
                        setParentSearchTerm(e.target.value);
                        setShowParentDropdown(true);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, parent_issue_id: '' }));
                        }
                      }}
                      onFocus={() => setShowParentDropdown(true)}
                      placeholder="Search parent task..."
                      className="w-full pl-10 pr-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    {selectedParentIssue && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, parent_issue_id: '' }));
                          setParentSearchTerm('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--theme-surface)] rounded"
                      >
                        <X size={16} className="text-[var(--theme-textSecondary)]" />
                      </button>
                    )}
                  </div>
                  {showParentDropdown && parentSearchTerm && (
                    <div className="absolute z-50 w-full mt-1 bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredParentIssues.length > 0 ? (
                        filteredParentIssues.map(issue => (
                          <div
                            key={issue.id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, parent_issue_id: issue.id.toString() }));
                              setParentSearchTerm('');
                              setShowParentDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-[var(--theme-surface)] cursor-pointer text-[var(--theme-text)]"
                          >
                            <div className="font-medium">#{issue.id} - {issue.subject}</div>
                            {issue.status && (
                              <div className="text-xs text-[var(--theme-textSecondary)]">{issue.status.name}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-[var(--theme-textSecondary)] text-sm">No tasks found</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="estimated_hours" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    id="estimated_hours"
                    name="estimated_hours"
                    value={formData.estimated_hours}
                    onChange={handleChange}
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_private"
                  name="is_private"
                  checked={formData.is_private}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
                <label htmlFor="is_private" className="text-sm font-medium text-[var(--theme-text)] cursor-pointer">
                  Private
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                  Files
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] cursor-pointer hover:bg-[var(--theme-surface)] transition-colors">
                    <Upload size={18} />
                    <span>Choose files to upload</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                {existingAttachments.length > 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--theme-border)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)] mb-2">
                      Existing attachments
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {existingAttachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.content_url || attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-text)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
                        >
                          <span>{attachment.filename}</span>
                          <Download size={14} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between px-4 py-2 bg-[var(--theme-surface)] rounded-lg border border-[var(--theme-border)]">
                          <span className="text-sm text-[var(--theme-text)]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 hover:bg-[var(--theme-cardBg)] rounded"
                          >
                            <X size={16} className="text-[var(--theme-textSecondary)]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--theme-border)]">
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectName}/tasks${isEdit ? `/${taskId}` : ''}`)}
              className="px-4 py-2 border border-[var(--theme-border)] rounded-lg text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.subject}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function parseHoursInput(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const [hoursPart, minutesPart = '0'] = trimmed.split(':');
    const hours = parseInt(hoursPart, 10);
    const minutes = parseInt(minutesPart, 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    return Math.max(0, hours) + Math.max(0, Math.min(59, minutes)) / 60;
  }
  const normalized = trimmed.replace(',', '.');
  const decimal = parseFloat(normalized);
  return Number.isNaN(decimal) ? null : Math.max(0, decimal);
}

