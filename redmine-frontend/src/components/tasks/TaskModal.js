import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTaskRequest, fetchTaskSuccess, postCommentSuccess, setError } from '../../store/taskSlice';
import { getIssue, postComment } from '../../api/redmineTasksAdapter';
import { X, Edit, MessageSquare, User, Calendar, Clock, Tag, Paperclip } from 'lucide-react';

export default function TaskModal({ taskId, projectName, onClose, onUpdate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, loading, error } = useSelector(s => s.task);
  const authUser = useSelector(s => s.auth.user);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [taskId, dispatch]);

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
      // Reload task to get updated comments
      const data = await getIssue(taskId);
      dispatch(fetchTaskSuccess(data.issue));
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (statusName) => {
    const colors = {
      'New': 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
      'In Progress': 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
      'Resolved': 'bg-green-500/10 text-green-600 border border-green-500/20',
      'Closed': 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
      'Reopen': 'bg-red-500/10 text-red-600 border border-red-500/20'
    };
    return colors[statusName] || 'bg-[var(--theme-textSecondary)]/10 text-[var(--theme-textSecondary)] border border-[var(--theme-border)]';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[var(--theme-cardBg)] rounded-xl shadow-2xl border border-[var(--theme-border)] w-full max-w-4xl max-h-[90vh] p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[var(--theme-cardBg)] rounded-xl shadow-2xl border border-[var(--theme-border)] w-full max-w-4xl max-h-[90vh] p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--theme-text)]">Task Details</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)]">
              <X size={20} />
            </button>
          </div>
          <p className="text-red-500">{error || 'Task not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[var(--theme-cardBg)] rounded-xl shadow-2xl border border-[var(--theme-border)] w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--theme-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-[var(--theme-text)]">
              {current.subject}
            </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(current.status?.name)}`}>
                {current.status?.name || 'Unknown'}
              </span>
          </div>
          <div className="flex items-center gap-2">
                <button
              onClick={() => {
                onClose?.();
                navigate(`/projects/${projectName}/tasks/${taskId}/edit`);
              }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
                >
                  <Edit size={18} />
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)]"
                >
                  <X size={20} />
                </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Task Info */}
            <div className="grid grid-cols-2 gap-6 text-sm text-[var(--theme-textSecondary)]">
              <div>
                <span className="font-medium text-[var(--theme-text)] block mb-1">Assignee:</span>
                <span>{current.assigned_to?.name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="font-medium text-[var(--theme-text)] block mb-1">Due Date:</span>
                <span>{current.due_date ? new Date(current.due_date).toLocaleDateString() : 'No due date'}</span>
              </div>
              <div>
                <span className="font-medium text-[var(--theme-text)] block mb-1">Priority:</span>
                  <span>{current.priority?.name || 'None'}</span>
                </div>
              <div>
                <span className="font-medium text-[var(--theme-text)] block mb-1">Created:</span>
                  <span>{current.created_on ? new Date(current.created_on).toLocaleDateString() : 'Unknown'}</span>
                </div>
              <div>
                <span className="font-medium text-[var(--theme-text)] block mb-1">Tracker:</span>
                <span>{current.tracker?.name || 'N/A'}</span>
              </div>
              {current.start_date && (
                <div>
                  <span className="font-medium text-[var(--theme-text)] block mb-1">Start Date:</span>
                  <span>{new Date(current.start_date).toLocaleDateString()}</span>
                </div>
              )}
              </div>

              {/* Description */}
              {current.description && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--theme-text)] mb-2">Description</h3>
                  <div 
                    className="prose prose-sm max-w-none text-[var(--theme-text)]"
                    dangerouslySetInnerHTML={{ __html: current.description }}
                  />
                </div>
              )}

            {/* Attachments */}
            {current.attachments && current.attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[var(--theme-text)] mb-2 flex items-center gap-2">
                  <Paperclip size={16} />
                  Attachments ({current.attachments.length})
                </h3>
                <div className="space-y-2">
                  {current.attachments.map((attachment) => {
                    const href = buildAttachmentUrl(attachment.content_url || attachment.url, `/attachments/${attachment.id}/download`);
                    return (
                      <a
                        key={attachment.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm text-[var(--theme-text)] hover:border-[var(--theme-primary)]"
                      >
                        <span className="truncate">{attachment.filename}</span>
                        <span className="text-[var(--theme-textSecondary)] text-xs">
                          {(attachment.filesize / 1024).toFixed(1)} KB
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

              {/* Comments/Journals */}
              {current.journals && current.journals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--theme-text)] mb-4 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Comments ({current.journals.length})
                  </h3>
                  <div className="space-y-4">
                    {current.journals.map((journal) => (
                      <div key={journal.id} className="border-l-2 border-[var(--theme-border)] pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--theme-text)]">{journal.user?.name || 'Unknown'}</span>
                          <span className="text-xs text-[var(--theme-textSecondary)]">
                            {new Date(journal.created_on).toLocaleString()}
                          </span>
                        </div>
                        {journal.notes && (
                          <div 
                            className="text-sm text-[var(--theme-textSecondary)]"
                            dangerouslySetInnerHTML={{ __html: journal.notes }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Comment */}
              <div className="border-t border-[var(--theme-border)] pt-4">
                <h3 className="text-sm font-medium text-[var(--theme-text)] mb-2">Add Comment</h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows="3"
                  className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-y mb-2"
                />
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
      </div>
    </div>
  );
}

