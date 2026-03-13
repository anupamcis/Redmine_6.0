import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { setLoading, setError, setRecipients } from '../../store/dailyStatusSlice';
import { createThread, getRecipients, hasSubmittedStatus } from '../../api/dailyStatusAdapter';
import { getProject } from '../../api/redmineAdapter';
import { setCurrentProject } from '../../store/projectsSlice';
import { ChevronLeft, Send, Save, CheckSquare, Square, Paperclip } from 'lucide-react';
import CKEditor from '../../components/editor/CKEditor';
import { cachedApiCall, apiCache } from '../../utils/apiCache';

function ComposePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { recipients, loading, error } = useSelector(state => state.dailyStatus);
  const currentUser = useSelector(state => state.auth.user);
  const projectsState = useSelector(state => state.projects);

  const resolvedProject =
    (projectsState.currentProject && projectsState.currentProject.identifier === projectId
      ? projectsState.currentProject
      : projectsState.projects.find(project => project.identifier === projectId)) || null;
  const projectName = resolvedProject?.name || resolvedProject?.identifier || projectId;

  const [subjectSuffix, setSubjectSuffix] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [hasTodayStatus, setHasTodayStatus] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [selectAll, setSelectAll] = useState(true);

  const baseSubject = useMemo(() => {
    if (!projectName) return '';
    const now = new Date();
    const formattedDate = now
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
      .replace(',', '');
    return `[${projectName} #] - ${formattedDate} - Status update`;
  }, [projectName]);

  useEffect(() => {
    const ensureProjectDetails = async () => {
      if (!projectId) return;
      if (resolvedProject && resolvedProject.name) return;
      try {
        const data = await getProject(projectId);
        if (data?.project) {
          dispatch(setCurrentProject({ ...data.project, identifier: projectId }));
        }
      } catch (err) {
        console.warn('[ComposePage] Failed to fetch project details:', err);
      }
    };
    ensureProjectDetails();
  }, [projectId, resolvedProject, dispatch]);

  // OPTIMIZED: Check today's status with caching
  useEffect(() => {
    const checkTodayStatus = async () => {
      if (!projectId) return;
      try {
        // OPTIMIZED: Use cached API call for today's status check - instant on repeat visits
        const cacheKey = `today_status_${projectId}`;
        const result = await cachedApiCall(cacheKey, async () => {
          return await hasSubmittedStatus(projectId);
        });
        
        setHasTodayStatus(!!result?.hasStatus);
      } catch (err) {
        console.warn('[ComposePage] Failed to check today status:', err);
      } finally {
        setStatusChecked(true);
      }
    };
    checkTodayStatus();
  }, [projectId]);

  // OPTIMIZED: Load recipients with caching
  const loadRecipients = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      // OPTIMIZED: Use cached API call for recipients - instant on repeat visits
      const cacheKey = `recipients_${projectId}`;
      const data = await cachedApiCall(cacheKey, async () => {
        return await getRecipients(projectId);
      });
      
      const recipientsList = (data.recipients || []).filter(r => r.id !== currentUser?.id);
      dispatch(setRecipients(recipientsList));
      if (recipientsList.length > 0) {
        setSelectedRecipients(recipientsList.map(r => r.id));
        setSelectAll(true);
      } else {
        setSelectedRecipients([]);
        setSelectAll(false);
        console.warn('[ComposePage] No recipients returned from API');
      }
    } catch (err) {
      console.error('[ComposePage] Error loading recipients:', err);
      dispatch(setError(err.message));
      alert(`Failed to load recipients: ${err.message}`);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, projectId, currentUser]);

  useEffect(() => {
    if (!projectId) return;
    setSubjectSuffix('');
    loadRecipients();
  }, [projectId, loadRecipients]);

  const handleRecipientToggle = (recipientId) => {
    setSelectedRecipients(prev => {
      const next = prev.includes(recipientId)
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId];
      setSelectAll(next.length === recipients.length);
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedRecipients([]);
      setSelectAll(false);
    } else {
      setSelectedRecipients(recipients.map(r => r.id));
      setSelectAll(true);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(files);
  };

  // OPTIMIZED: Handle send and clear cache
  const handleSend = async () => {
    if (!bodyHtml.trim()) {
      dispatch(setError('Message body cannot be empty'));
      return;
    }

    const finalSubject = subjectSuffix.trim()
      ? `${baseSubject} - ${subjectSuffix.trim()}`
      : baseSubject;

    setIsSaving(true);
    try {
      const response = await createThread(projectId, {
        subject: finalSubject,
        bodyHtml: bodyHtml,
        recipientIds: selectedRecipients,
        sendImmediately: true,
        isDraft: false
      });

      // OPTIMIZED: Clear cache for inbox and today's status to show new thread
      apiCache.clear(`today_status_${projectId}`);
      // Clear all pages of inbox threads
      for (let page = 1; page <= 10; page++) {
        apiCache.clear(`inbox_threads_${projectId}_page_${page}`);
      }

      navigate(`/projects/${projectId}/daily_statuses/${response.messageId}`);
    } catch (err) {
      dispatch(setError(err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // OPTIMIZED: Handle save draft and clear cache
  const handleSaveDraft = async () => {
    if (!bodyHtml.trim()) {
      dispatch(setError('Message body cannot be empty'));
      return;
    }

    const finalSubject = subjectSuffix.trim()
      ? `${baseSubject} - ${subjectSuffix.trim()}`
      : baseSubject;

    setIsSaving(true);
    try {
      const response = await createThread(projectId, {
        subject: finalSubject,
        bodyHtml: bodyHtml,
        recipientIds: selectedRecipients,
        sendImmediately: false,
        isDraft: true
      });

      // OPTIMIZED: Clear cache for inbox to show new draft
      // Clear all pages of inbox threads
      for (let page = 1; page <= 10; page++) {
        apiCache.clear(`inbox_threads_${projectId}_page_${page}`);
      }

      navigate(`/projects/${projectId}/daily_statuses/${response.messageId}`);
    } catch (err) {
      dispatch(setError(err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const formatName = (name) => {
    if (!name) return 'Unknown';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  if (!statusChecked) {
    return (
      <div className="p-6 text-sm text-[var(--theme-textSecondary)]">
        Checking status...
      </div>
    );
  }

  if (hasTodayStatus) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--theme-text)]">
          Daily status already submitted
        </h2>
        <p className="text-[var(--theme-textSecondary)]">
          You have already submitted today’s daily status for this project.
        </p>
        <button
          onClick={() => navigate(`/projects/${projectId}/daily_statuses`, { replace: true })}
          className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        >
          Go to Inbox
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--theme-border)] px-6 py-4 bg-[var(--theme-cardBg)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/daily_statuses`)}
            className="p-2 hover:bg-[var(--theme-surface)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            aria-label="Back to inbox"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[var(--theme-text)]">Compose Daily Status</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-4 py-2 border border-[var(--theme-border)] rounded-lg hover:bg-[var(--theme-surface)] disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              aria-label="Save as draft"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={isSaving || !bodyHtml.trim()}
              className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2"
              aria-label="Send daily status"
            >
              <Send className="w-4 h-4" />
              {isSaving ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                Subject
              </label>
              <div className="space-y-2">
                <div className="px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)]">
                  {baseSubject || 'Loading subject...'}
                </div>
                <input
                  id="subject"
                  type="text"
                  value={subjectSuffix}
                  onChange={(e) => setSubjectSuffix(e.target.value)}
                  placeholder="Add optional suffix"
                  className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  aria-label="Subject suffix"
                />
              </div>
            </div>

            {/* Body */}
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <CKEditor
                value={bodyHtml}
                onChange={(data) => setBodyHtml(data)}
                placeholder="Enter your daily status message..."
                disabled={isSaving}
              />
            </div>

            {/* Attachments */}
            <div>
              <label htmlFor="attachments" className="block text-sm font-medium text-[var(--theme-text)] mb-2">
                Attachments
              </label>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 border border-[var(--theme-border)] rounded-lg hover:bg-[var(--theme-surface)] cursor-pointer flex items-center gap-2 focus-within:ring-2 focus-within:ring-[var(--theme-primary)]">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-sm text-[var(--theme-text)]">Choose files</span>
                  <input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Attach files"
                  />
                </label>
                {attachments.length > 0 && (
                  <span className="text-sm text-[var(--theme-textSecondary)]">
                    {attachments.length} {attachments.length === 1 ? 'file' : 'files'} selected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recipients Sidebar */}
        <div className="w-80 border-l border-[var(--theme-border)] bg-[var(--theme-cardBg)] p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-[var(--theme-text)] mb-4">
            Recipients <span className="text-red-500">*</span>
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 mb-2">{error}</p>
              <button
                onClick={loadRecipients}
                className="text-xs text-red-700 dark:text-red-400 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="text-sm text-[var(--theme-textSecondary)] flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
              Loading recipients...
            </div>
          ) : recipients.length === 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-[var(--theme-textSecondary)]">
                {error ? 'Failed to load recipients' : 'No recipients available'}
              </div>
              {!error && (
                <button
                  onClick={loadRecipients}
                  className="text-xs text-[var(--theme-primary)] underline hover:no-underline"
                >
                  Refresh
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2" role="list">
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-surface)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 text-[var(--theme-primary)] rounded focus:ring-[var(--theme-primary)]"
                  aria-label="Select all recipients"
                />
                <span className="font-medium text-[var(--theme-text)]">Select All</span>
              </label>
              {recipients.map((recipient) => (
                <label
                  key={recipient.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-surface)] cursor-pointer"
                  role="listitem"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(recipient.id)}
                    onChange={() => handleRecipientToggle(recipient.id)}
                    className="w-4 h-4 text-[var(--theme-primary)] rounded focus:ring-[var(--theme-primary)]"
                    aria-label={`Select ${recipient.name} as recipient`}
                  />
                  {selectedRecipients.includes(recipient.id) ? (
                    <CheckSquare className="w-4 h-4 text-[var(--theme-primary)]" />
                  ) : (
                    <Square className="w-4 h-4 text-[var(--theme-textSecondary)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--theme-text)] truncate">
                      {formatName(recipient.name)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {selectedRecipients.length === 0 && (
            <p className="mt-4 text-sm text-red-500">Please select at least one recipient</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComposePage;

