import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTaskRequest, fetchTaskSuccess, postCommentSuccess, setError } from '../../store/taskSlice';
import { getIssue, updateIssue, postComment, getIssueTimeEntries, createTimeEntry, getTimeEntryActivities, getProjectTimeEntryActivities } from '../../api/redmineTasksAdapter';
import Modal from '../ui/Modal';
import { X, Edit, MessageSquare, User, Calendar, Clock, Tag, Paperclip, Download, Activity } from 'lucide-react';

const DETAIL_LABELS = {
  is_private: 'Private',
  done_ratio: '% Done',
  description: 'Description',
  status: 'Status',
  status_id: 'Status',
  priority_id: 'Priority',
  tracker_id: 'Tracker',
  assigned_to_id: 'Assignee',
  fixed_version_id: 'Version',
  subject: 'Subject'
};

const BOOLEAN_FIELDS = new Set(['is_private', 'private_notes']);

const stripHtmlTags = (value) => {
  if (typeof value !== 'string') return value ?? '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const formatDetailValue = (field, value) => {
  if (value === null || typeof value === 'undefined') {
    return "''";
  }

  let display = value;

  if (BOOLEAN_FIELDS.has(field)) {
    if (value === true || value === '1' || value === 1) {
      display = 'Yes';
    } else if (value === false || value === '0' || value === 0) {
      display = 'No';
    }
  }

  if (field === 'description') {
    display = stripHtmlTags(value);
  }

  if (typeof display === 'string') {
    const trimmed = display.trim();
    return trimmed.length ? trimmed : "''";
  }

  if (display === 0) {
    return '0';
  }

  return display ?? "''";
};

const formatDetailLabel = (detail) => {
  const key = detail.name || detail.property;
  const label = DETAIL_LABELS[key];
  if (label) return label;
  if (!key) return 'Change';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function TaskDetailModal({ taskId, projectName, onClose, onUpdate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, loading, error } = useSelector(s => s.task);
  const authUser = useSelector(s => s.auth.user);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logTimeModalOpen, setLogTimeModalOpen] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  const [timeActivities, setTimeActivities] = useState([]);
  const [timeForm, setTimeForm] = useState({
    hours: '',
    activity_id: '',
    spent_on: new Date().toISOString().slice(0, 10),
    comments: ''
  });
  const [timeError, setTimeError] = useState(null);
  const [timeSuccess, setTimeSuccess] = useState(null);
  const [loggingTime, setLoggingTime] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Same helper as in TaskDetailPage: build authenticated attachment URL.
  const apiKey = authUser?.api_key;
  const redmineOrigin =
    process.env.REACT_APP_REDMINE_BASE_URL ||
    (typeof window !== 'undefined' && window.location
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : '');
  const buildAttachmentUrl = (rawUrl, fallbackPath) => {
    if (!rawUrl && !fallbackPath) return '#';
    const base = rawUrl || fallbackPath;
    if (!apiKey) return base;
    try {
      const u = new URL(base, redmineOrigin || window.location.origin);
      if (!u.searchParams.get('key')) {
        u.searchParams.append('key', apiKey);
      }
      return u.toString();
    } catch {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}key=${encodeURIComponent(apiKey)}`;
    }
  };

  const defaultSpentOn = () => new Date().toISOString().slice(0, 10);

  const fetchTimeEntries = useCallback(async () => {
    if (!taskId) return;
    try {
      const entries = await getIssueTimeEntries(taskId);
      setTimeEntries(entries);
    } catch (err) {
      console.error('[TaskDetailModal] Failed to load time entries:', err);
    }
  }, [taskId]);

  const fetchTimeActivities = useCallback(async () => {
    try {
      let activities = [];

      if (projectName) {
        try {
          activities = await getProjectTimeEntryActivities(projectName);
        } catch (projectErr) {
          console.warn('[TaskDetailModal] Project activities failed, will fallback:', projectErr);
        }
      }

      if (!activities.length) {
        activities = await getTimeEntryActivities();
      }

      setTimeActivities(activities);
    } catch (err) {
      console.error('[TaskDetailModal] Failed to load time entry activities:', err);
      setTimeActivities([]);
    }
  }, [projectName]);

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTaskRequest());
      getIssue(taskId)
        .then(data => {
          dispatch(fetchTaskSuccess(data.issue));
        })
        .catch(err => {
          dispatch(setError(err.message));
        });
    }
    return () => {
      dispatch({ type: 'task/clear' });
    };
    fetchTimeEntries();
    fetchTimeActivities();
  }, [taskId, dispatch, fetchTimeEntries, fetchTimeActivities]);

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await postComment(taskId, { bodyHtml: comment });
      dispatch(postCommentSuccess({
        id: Date.now(),
        user: { id: 1, name: 'You' },
        notes: comment,
        created_on: new Date().toISOString()
      }));
      setComment('');
      const data = await getIssue(taskId);
      dispatch(fetchTaskSuccess(data.issue));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (statusName) => {
    const colors = {
      'New': 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20',
      'In Progress': 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
      'Resolved': 'bg-green-500/10 text-green-600 border border-green-500/20',
      'Feedback': 'bg-red-500/10 text-red-600 border border-red-500/20',
      'Reopen': 'bg-[var(--theme-textSecondary)]/10 text-[var(--theme-textSecondary)] border border-[var(--theme-border)]',
      'Closed': 'bg-[var(--theme-textSecondary)]/10 text-[var(--theme-textSecondary)] border border-[var(--theme-border)]'
    };
    return colors[statusName] || 'bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]';
  };

  const handleOpenLogTime = () => {
    fetchTimeEntries();
    if (!timeActivities.length) {
      fetchTimeActivities();
    }
    setLogTimeModalOpen(true);
    setTimeError(null);
    setTimeSuccess(null);
    setTimeForm((prev) => ({
      ...prev,
      spent_on: defaultSpentOn()
    }));
  };

  const parseHoursInput = (value) => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    if (trimmed.includes(':')) {
      const [hoursPart, minutesPart = '0'] = trimmed.split(':');
      const hours = parseInt(hoursPart, 10);
      const minutes = parseInt(minutesPart, 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return Math.max(0, hours) + Math.max(0, Math.min(59, minutes)) / 60;
    }
    const normalized = trimmed.replace(',', '.');
    const decimal = parseFloat(normalized);
    return Number.isNaN(decimal) ? null : Math.max(0, decimal);
  };

  const handleLogTime = async () => {
    setTimeError(null);
    setTimeSuccess(null);
    const hours = parseHoursInput(timeForm.hours);
    if (hours === null || hours <= 0) {
      setTimeError('Enter hours like 1.5 or 1:30');
      return;
    }
    if (!timeForm.activity_id) {
      setTimeError('Select an activity');
      return;
    }
    setLoggingTime(true);
    try {
      await createTimeEntry({
        issue_id: Number(taskId),
        project_id: current.project?.id,
        hours,
        activity_id: Number(timeForm.activity_id),
        comments: timeForm.comments?.trim() || undefined,
        spent_on: timeForm.spent_on || defaultSpentOn()
      });
      setTimeSuccess('Time logged successfully');
      setTimeForm({
        hours: '',
        activity_id: '',
        spent_on: defaultSpentOn(),
        comments: ''
      });
      await fetchTimeEntries();
      const fresh = await getIssue(taskId);
      dispatch(fetchTaskSuccess(fresh.issue));
      if (onUpdate) onUpdate();
    } catch (err) {
      setTimeError(err.message || 'Failed to log time');
    } finally {
      setLoggingTime(false);
    }
  };

  const sortedTimeEntries = [...timeEntries].sort((a, b) => {
    const aDate = new Date(a.spent_on || a.created_on || 0).getTime();
    const bDate = new Date(b.spent_on || b.created_on || 0).getTime();
    return bDate - aDate;
  });

  if (!taskId) return null;

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title=""
        size="2xl"
      >
      <div className="w-full h-full flex flex-col bg-[var(--theme-bg)]">
        {/* Header */}
        <div className="border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 flex-shrink-0 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold text-[var(--theme-text)]">{current?.subject || 'Loading...'}</h1>
                  {current?.status && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(current.status?.name)}`}>
                      {current?.status?.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--theme-textSecondary)]">
                  {current?.id && <span>#{current.id}</span>}
                  {current?.tracker && (
                    <div className="flex items-center gap-1">
                      <Tag size={14} />
                      <span>{current?.tracker?.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {current && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/projects/${projectName}/tasks/${taskId}/edit`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors"
              >
                <Edit size={18} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--theme-surface)] transition-colors text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
              <span>Loading task...</span>
            </div>
          </div>
        )}

        {error && !current && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600">
              <strong>Error:</strong> {error || 'Task not found'}
            </div>
          </div>
        )}

        {current && !loading && (
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Description */}
              {current?.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-[var(--theme-text)] mb-3">Description</h2>
                  <div 
                    className="prose max-w-none text-[var(--theme-text)]"
                    dangerouslySetInnerHTML={{ __html: current?.description }}
                  />
                </div>
              )}

              {current?.attachments?.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-[var(--theme-text)] mb-3">Attachments</h2>
                  <div className="space-y-3">
                    {current?.attachments?.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={buildAttachmentUrl(attachment.content_url || attachment.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm text-[var(--theme-text)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip size={16} />
                          <div>
                            <p className="font-medium">{attachment.filename}</p>
                            <p className="text-xs text-[var(--theme-textSecondary)]">
                              {attachment.created_on ? new Date(attachment.created_on).toLocaleString() : ''} ·{' '}
                              {attachment.filesize ? `${(attachment.filesize / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <Download size={16} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments/Journals */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--theme-text)]">
                  Comments ({current?.journals?.length || 0})
                </h2>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(true)}
                  className="inline-flex items-center gap-2 text-sm text-[var(--theme-primary)] hover:text-[var(--theme-primaryDark)]"
                >
                  <Activity size={16} />
                  View history
                </button>
              </div>
              <div className="space-y-4 mb-6">
                {current?.journals && current.journals.length > 0 ? (
                  current?.journals?.map(journal => (
                    <div key={journal.id} className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center">
                          <User size={16} className="text-[var(--theme-primary)]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[var(--theme-text)]">{journal.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-[var(--theme-textSecondary)]">
                            {new Date(journal.created_on).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {journal.notes && (
                        <div 
                          className="mt-3 text-[var(--theme-text)] prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: journal.notes }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--theme-textSecondary)] text-sm">No comments yet</p>
                )}
              </div>

              {/* Add Comment */}
              <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-4">
                <h3 className="text-sm font-medium text-[var(--theme-text)] mb-3">Add Comment</h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="4"
                  className="w-full p-3 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-none"
                  placeholder="Write a comment..."
                />
                <div className="flex items-center justify-between mt-3">
                  <button className="p-2 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)]">
                    <Paperclip size={18} />
                  </button>
                  <button
                    onClick={handlePostComment}
                    disabled={!comment.trim() || isSubmitting}
                    className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l border-[var(--theme-border)] bg-[var(--theme-cardBg)] p-6 overflow-y-auto">
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-4 uppercase tracking-wide">Details</h3>
              
              <div className="space-y-4">
                {current?.assigned_to && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Assignee</label>
                    <div className="mt-1 flex items-center gap-2">
                      <User size={16} className="text-[var(--theme-textSecondary)]" />
                      <span className="text-sm text-[var(--theme-text)]">{current?.assigned_to?.name}</span>
                    </div>
                  </div>
                )}

                {current?.priority && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Priority</label>
                    <div className="mt-1">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--theme-surface)] text-[var(--theme-text)]">
                        {current?.priority?.name}
                      </span>
                    </div>
                  </div>
                )}

                {current?.tracker && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Tracker</label>
                    <div className="mt-1">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--theme-surface)] text-[var(--theme-text)]">
                        {current?.tracker?.name}
                      </span>
                    </div>
                  </div>
                )}

                {current?.due_date && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Due Date</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar size={16} className="text-[var(--theme-textSecondary)]" />
                      <span className="text-sm text-[var(--theme-text)]">
                        {new Date(current?.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {current?.start_date && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Start Date</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar size={16} className="text-[var(--theme-textSecondary)]" />
                      <span className="text-sm text-[var(--theme-text)]">
                        {new Date(current?.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {current?.created_on && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Created</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar size={16} className="text-[var(--theme-textSecondary)]" />
                      <span className="text-sm text-[var(--theme-text)]">
                        {new Date(current?.created_on).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Time</label>
                  <button
                    type="button"
                    onClick={handleOpenLogTime}
                    className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-left hover:border-[var(--theme-primary)] hover:bg-[var(--theme-surface)]/80"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[var(--theme-textSecondary)]" />
                      <span className="text-sm text-[var(--theme-text)]">
                        {current?.spent_hours || 0}h / {current?.estimated_hours || 0}h
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[var(--theme-primary)]">Log time</span>
                  </button>
                </div>

                {current?.author && (
                  <div>
                    <label className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase">Created By</label>
                    <div className="mt-1 text-sm text-[var(--theme-text)]">{current?.author?.name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </Modal>

      {/* Log Time Modal */}
      <Modal
        isOpen={logTimeModalOpen}
        onClose={() => setLogTimeModalOpen(false)}
        title="Log time"
      >
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                  <p className="text-xs text-[var(--theme-textSecondary)]">Spent</p>
                  <p className="text-2xl font-semibold text-[var(--theme-text)]">
                    {current?.spent_hours || 0}h
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                  <p className="text-xs text-[var(--theme-textSecondary)]">Estimated</p>
                  <p className="text-2xl font-semibold text-[var(--theme-text)]">
                    {current?.estimated_hours || 0}h
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                    Hours
                  </label>
                  <input
                    type="text"
                    value={timeForm.hours}
                    onChange={(e) => setTimeForm((prev) => ({ ...prev, hours: e.target.value }))}
                    placeholder="e.g. 1.5 or 1:30"
                    className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] px-3 py-2 text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      Activity
                    </label>
                    <select
                      value={timeForm.activity_id}
                      onChange={(e) =>
                        setTimeForm((prev) => ({ ...prev, activity_id: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] px-3 py-2 text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                      <option value="">Select activity</option>
                      {timeActivities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                      Date
                    </label>
                    <input
                      type="date"
                      value={timeForm.spent_on}
                      onChange={(e) =>
                        setTimeForm((prev) => ({ ...prev, spent_on: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] px-3 py-2 text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]">
                    Notes
                  </label>
                  <textarea
                    rows="3"
                    value={timeForm.comments}
                    onChange={(e) =>
                      setTimeForm((prev) => ({ ...prev, comments: e.target.value }))
                    }
                    placeholder="Add a note about this time entry"
                    className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-inputBg)] px-3 py-2 text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] resize-none"
                  />
                </div>

                {timeError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    {timeError}
                  </div>
                )}
                {timeSuccess && (
                  <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
                    {timeSuccess}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogTime}
                  disabled={loggingTime}
                  className="w-full rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--theme-primaryDark)] disabled:opacity-50"
                >
                  {loggingTime ? 'Logging…' : 'Log time'}
                </button>
              </div>
            </div>

            <div className="hidden w-px bg-[var(--theme-border)] lg:block" />

            <div className="flex-1">
              <h4 className="mb-3 text-sm font-semibold text-[var(--theme-text)] uppercase tracking-wide">History</h4>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {sortedTimeEntries.length ? (
                  sortedTimeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--theme-text)]">
                            {entry.user?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-[var(--theme-textSecondary)]">
                            {entry.spent_on
                              ? new Date(entry.spent_on).toLocaleDateString()
                              : new Date(entry.created_on).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-base font-semibold text-[var(--theme-primary)]">
                          {entry.hours}h
                        </span>
                      </div>
                      {entry.comments && (
                        <p className="text-sm text-[var(--theme-text)]">{entry.comments}</p>
                      )}
                      <div className="text-xs text-[var(--theme-textSecondary)]">
                        Activity: {entry.activity?.name || '—'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--theme-textSecondary)]">
                    No time entries logged yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>

      {/* History Modal */}
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title="History & Activity"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {current?.journals && current.journals.length > 0 ? (
              current?.journals?.map((journal) => (
                <div
                  key={journal.id}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--theme-text)]">
                        {journal.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-[var(--theme-textSecondary)]">
                        {new Date(journal.created_on).toLocaleString()}
                      </p>
                    </div>
                    {journal.private_notes && (
                      <span className="text-xs rounded-full bg-red-500/10 text-red-500 px-2 py-0.5">
                        Private
                      </span>
                    )}
                  </div>
                  {journal.details && journal.details.length > 0 && (
                    <div className="space-y-1 text-sm">
                      {journal.details.map((detail, idx) => (
                        <div key={idx} className="text-[var(--theme-text)]">
                          <span className="font-medium">{formatDetailLabel(detail)}:</span>{' '}
                          <span className="text-[var(--theme-textSecondary)] line-through">
                            {formatDetailValue(detail.property, detail.old_value)}
                          </span>{' '}
                          →{' '}
                          <span className="text-[var(--theme-primary)]">
                            {formatDetailValue(detail.property, detail.new_value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {journal.notes && (
                    <div 
                      className="text-sm text-[var(--theme-text)] prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: journal.notes }}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--theme-textSecondary)]">No history available</p>
            )}
          </div>
        </Modal>
    </>
  );
}

