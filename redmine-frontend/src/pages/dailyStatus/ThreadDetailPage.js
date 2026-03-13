import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { setLoading, setError, setCurrentThread, updateThread, markThreadRead } from '../../store/dailyStatusSlice';
import { getThread, replyToThread, updateThread as updateThreadAPI, markThreadRead as markThreadReadAPI } from '../../api/dailyStatusAdapter';
import { ChevronLeft, Send, CheckSquare, Square, User } from 'lucide-react';

function ThreadDetailPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId, threadId } = useParams();
  const { currentThread, loading, error } = useSelector(state => state.dailyStatus);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [isUpdatingRecipients, setIsUpdatingRecipients] = useState(false);

  useEffect(() => {
    if (!projectId || !threadId) return;
    loadThread();
  }, [projectId, threadId]);

  useEffect(() => {
    if (currentThread) {
      // Initialize selected recipients from thread
      const selected = (currentThread.recipients || []).filter(r => r.selected).map(r => r.id);
      setSelectedRecipients(selected);
      
      // Mark thread as read when opened
      if (currentThread.unread) {
        markAsRead();
      }
    }
  }, [currentThread]);

  const loadThread = async () => {
    dispatch(setLoading(true));
    try {
      const data = await getThread(projectId, threadId);
      dispatch(setCurrentThread(data));
    } catch (err) {
      dispatch(setError(err.message));
    }
  };

  const markAsRead = async () => {
    try {
      await markThreadReadAPI(projectId, parseInt(threadId));
      dispatch(markThreadRead(`t-${threadId}`));
    } catch (err) {
      console.error('Failed to mark thread as read:', err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    setIsReplying(true);
    try {
      const response = await replyToThread(projectId, parseInt(threadId), {
        bodyHtml: replyText,
        sendImmediately: true
      });
      
      // Reload thread to get the actual reply with correct author info
      await loadThread();
      setReplyText('');
    } catch (err) {
      dispatch(setError(err.message));
    } finally {
      setIsReplying(false);
    }
  };

  const handleRecipientToggle = async (recipientId) => {
    const newSelected = selectedRecipients.includes(recipientId)
      ? selectedRecipients.filter(id => id !== recipientId)
      : [...selectedRecipients, recipientId];
    
    setSelectedRecipients(newSelected);
    
    // Update on server
    setIsUpdatingRecipients(true);
    try {
      await updateThreadAPI(projectId, parseInt(threadId), {
        recipientIds: newSelected
      });
      dispatch(updateThread(`t-${threadId}`, {
        recipients: (currentThread.recipients || []).map(r => ({
          ...r,
          selected: newSelected.includes(r.id)
        }))
      }));
    } catch (err) {
      dispatch(setError(err.message));
      // Revert on error
      setSelectedRecipients(selectedRecipients);
    } finally {
      setIsUpdatingRecipients(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatName = (name) => {
    if (!name) return 'Unknown';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  if (loading && !currentThread) {
    return (
      <div className="w-full p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--theme-surface)] rounded w-1/3"></div>
          <div className="h-64 bg-[var(--theme-surface)] rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !currentThread) {
    return (
      <div className="w-full p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!currentThread) {
    return (
      <div className="w-full p-6">
        <p className="text-[var(--theme-textSecondary)]">Thread not found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
              <h1 className="text-xl font-bold text-[var(--theme-text)]">{currentThread.subject}</h1>
              <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
                {currentThread.messages?.length || 0} {currentThread.messages?.length === 1 ? 'message' : 'messages'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentThread.messages?.map((message, index) => (
            <div
              key={message.messageId}
              className={`p-4 rounded-lg ${
                message.direction === 'sent'
                  ? 'bg-[var(--theme-primary)]/10 ml-auto max-w-3xl'
                  : 'bg-[var(--theme-surface)] max-w-3xl'
              }`}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--theme-text)]">
                      {formatName(message.author?.name || 'Unknown')}
                    </span>
                    <span className="text-xs text-[var(--theme-textSecondary)]">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  <div
                    className="text-[var(--theme-text)] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {message.attachments.map(att => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1"
                        >
                          📎 {att.filename} ({(att.size / 1024).toFixed(1)} KB)
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Box */}
        <div className="border-t border-[var(--theme-border)] p-4 bg-[var(--theme-cardBg)]">
          <div className="flex gap-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="flex-1 px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-none"
              aria-label="Reply message"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || isReplying}
              className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2"
              aria-label="Send reply"
            >
              <Send className="w-4 h-4" />
              {isReplying ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Recipients Sidebar */}
      <div className="w-80 border-l border-[var(--theme-border)] bg-[var(--theme-cardBg)] p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold text-[var(--theme-text)] mb-4">Recipients</h2>
        <div className="space-y-2" role="list">
          {currentThread.recipients?.map((recipient) => (
            <label
              key={recipient.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-surface)] cursor-pointer"
              role="listitem"
            >
              <input
                type="checkbox"
                checked={selectedRecipients.includes(recipient.id)}
                onChange={() => handleRecipientToggle(recipient.id)}
                disabled={isUpdatingRecipients}
                className="w-4 h-4 text-[var(--theme-primary)] rounded focus:ring-[var(--theme-primary)]"
                aria-label={`Toggle ${recipient.name} as recipient`}
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
                <div className="text-xs text-[var(--theme-textSecondary)] truncate">
                  {recipient.email}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThreadDetailPage;

