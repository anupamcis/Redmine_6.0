import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  setLoading,
  setError,
  setThreads,
  appendThreads,
  toggleThreadSelection,
  clearSelection,
  markThreadsRead,
  setHasMore,
  setCurrentPage
} from '../../store/dailyStatusSlice';
import { getInbox, markThreadsRead as markThreadsReadAPI, hasSubmittedStatus } from '../../api/dailyStatusAdapter';
import { Check, Mail, MailOpen, Plus } from 'lucide-react';
import { cachedApiCall, apiCache } from '../../utils/apiCache';

function InboxPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { threads, loading, error, selectedThreadIds, hasMore, currentPage } = useSelector(state => state.dailyStatus);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);
  const user = useSelector(state => state.auth.user);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [hasTodayStatus, setHasTodayStatus] = useState(false);
  const [statusChecking, setStatusChecking] = useState(true);
  const observerRef = useRef();
  const loadingRef = useRef();

  // OPTIMIZED: Load threads with caching
  const loadThreads = useCallback(async (page) => {
    if (!projectId) return;

    try {
      console.log('[InboxPage] loadThreads called for page:', page);
      dispatch(setLoading(true));
      
      // OPTIMIZED: Use cached API call for inbox threads - instant on repeat visits
      const cacheKey = `inbox_threads_${projectId}_page_${page}`;
      const data = await cachedApiCall(cacheKey, async () => {
        return await getInbox(projectId, page);
      });
      
      console.log('[InboxPage] Received data:', data);
      if (page === 1) {
        dispatch(setThreads(data.threads || []));
      } else {
        dispatch(appendThreads(data.threads || []));
      }
      dispatch(setHasMore(data.nextCursor !== null && (data.threads || []).length > 0));
      dispatch(setCurrentPage(page));
      
      // Check if user has submitted today's status (from cached threads)
      if (!hasTodayStatus && user && Array.isArray(data.threads)) {
        const found = data.threads.some(thread => {
          if (!thread || thread.authorId !== user.id) return false;
          if (!thread.createdAt) return false;
          const threadDate = new Date(thread.createdAt);
          const now = new Date();
          return threadDate.getFullYear() === now.getFullYear() &&
            threadDate.getMonth() === now.getMonth() &&
            threadDate.getDate() === now.getDate();
        });
        if (found) {
          setHasTodayStatus(true);
        }
      }
    } catch (err) {
      console.error('[InboxPage] Error loading threads:', err);
      // If authentication error, redirect to React login (not backend)
      if (err.message && err.message.includes('Authentication required')) {
        console.log('[InboxPage] Authentication error, redirecting to React login');
        navigate('/login', { replace: true });
        return;
      }
      dispatch(setError(err.message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [projectId, hasTodayStatus, user, dispatch, navigate]);

  // Debug: Log authentication state
  useEffect(() => {
    console.log('[InboxPage] Component mounted');
    console.log('[InboxPage] isAuthenticated:', isAuthenticated);
    console.log('[InboxPage] restoring:', restoring);
    console.log('[InboxPage] user:', user);
    console.log('[InboxPage] projectId:', projectId);
  }, []);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!restoring && !isAuthenticated) {
      console.log('[InboxPage] User not authenticated, redirecting to React login');
      navigate('/login', { replace: true });
    }
  }, [restoring, isAuthenticated, navigate]);

  // Load threads on mount and when projectId changes
  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) {
      console.log('[InboxPage] Skipping load - projectId:', projectId, 'isAuthenticated:', isAuthenticated, 'restoring:', restoring);
      return;
    }

    console.log('[InboxPage] Loading threads for project:', projectId);
    dispatch(setLoading(true));
    dispatch(setThreads([]));
    dispatch(setCurrentPage(1));

    loadThreads(1);
  }, [projectId, isAuthenticated, restoring, dispatch, loadThreads]);

  // OPTIMIZED: Check if today's status has been submitted with caching
  useEffect(() => {
    if (!projectId) return;
    setHasTodayStatus(false);
    setStatusChecking(true);
    
    const checkStatus = async () => {
      try {
        // OPTIMIZED: Use cached API call for today's status check - instant on repeat visits
        const cacheKey = `today_status_${projectId}`;
        const result = await cachedApiCall(cacheKey, async () => {
          return await hasSubmittedStatus(projectId);
        });
        
        console.log('[InboxPage] hasSubmittedStatus result:', result);
        setHasTodayStatus(!!result?.hasStatus);
      } catch (err) {
        console.warn('[InboxPage] Failed to check today status:', err);
      } finally {
        setStatusChecking(false);
      }
    };
    checkStatus();
  }, [projectId]);

  // Infinite scroll observer
  const lastThreadElementRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadThreads(currentPage + 1);
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, currentPage, loadThreads]);

  // OPTIMIZED: Handle mark as read and clear cache
  const handleMarkAsRead = async () => {
    if (selectedThreadIds.length === 0) return;

    setIsMarkingRead(true);
    try {
      // Extract numeric IDs from threadId strings (e.g., "t-123" -> 123)
      const numericIds = selectedThreadIds.map(id => parseInt(id.replace('t-', '')));
      await markThreadsReadAPI(projectId, numericIds);
      dispatch(markThreadsRead(selectedThreadIds));
      dispatch(clearSelection());
      
      // OPTIMIZED: Clear cache for inbox threads to force refresh with updated read status
      // Clear all pages of inbox threads for this project
      for (let page = 1; page <= currentPage; page++) {
        apiCache.clear(`inbox_threads_${projectId}_page_${page}`);
      }
      
      // Reload first page to show updated status
      loadThreads(1);
    } catch (err) {
      dispatch(setError(err.message));
    } finally {
      setIsMarkingRead(false);
    }
  };

  // Format participant names
  const formatParticipants = (participants) => {
    if (!participants || participants.length === 0) return 'No participants';
    if (participants.length === 1) return participants[0].name;
    if (participants.length === 2) return `${participants[0].name} and ${participants[1].name}`;
    return `${participants[0].name} and ${participants.length - 1} others`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (restoring) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
          <span>Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Check authentication first - redirect to React login, NOT backend
  if (!isAuthenticated) {
    console.log('[InboxPage] User not authenticated, showing loading (redirect in progress)...');
    return (
      <div className="w-full p-6">
        <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
          <span>Redirecting to login...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication required');
    return (
      <div className="w-full p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          <strong>Error:</strong> {error}
          {isAuthError && (
            <div className="mt-4">
              <a
                href={`http://localhost:4000/login?back_url=${encodeURIComponent(window.location.href)}`}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-block"
              >
                Go to Login
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--theme-border)] px-6 py-4 bg-[var(--theme-cardBg)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--theme-text)]">Daily Status Inbox</h1>
            <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
              {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedThreadIds.length > 0 && (
              <button
                onClick={handleMarkAsRead}
                disabled={isMarkingRead}
                className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2"
                aria-label={`Mark ${selectedThreadIds.length} thread(s) as read`}
              >
                <MailOpen className="w-4 h-4" />
                {isMarkingRead ? 'Marking...' : `Mark ${selectedThreadIds.length} as read`}
              </button>
            )}
            {!hasTodayStatus && !statusChecking && (
              <button
                onClick={() => navigate(`/projects/${projectId}/daily_statuses/compose`)}
                className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2"
                aria-label="Compose new daily status"
              >
                <Plus className="w-4 h-4" />
                Compose
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {statusChecking ? (
          <div className="p-6">
            <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
              <span>Loading status...</span>
            </div>
          </div>
        ) : loading && threads.length === 0 ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-[var(--theme-surface)] rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        ) : threads.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-[var(--theme-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--theme-textSecondary)] text-lg">No threads found</p>
            <p className="text-[var(--theme-textSecondary)] text-sm mt-2">
              Get started by composing your first daily status
            </p>
          </div>
        ) : (
          <div role="list" className="divide-y divide-[var(--theme-border)]">
            {threads.map((thread, index) => (
              <div
                key={thread.threadId}
                ref={index === threads.length - 1 ? lastThreadElementRef : null}
                role="listitem"
                className={`px-6 py-4 hover:bg-[var(--theme-surface)] cursor-pointer transition-colors ${
                  thread.unread ? 'bg-[var(--theme-surface)]' : ''
                }`}
                onClick={() => navigate(`/projects/${projectId}/daily_statuses/${thread.threadId.replace('t-', '')}`)}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedThreadIds.includes(thread.threadId)}
                    onChange={(e) => {
                      e.stopPropagation();
                      dispatch(toggleThreadSelection(thread.threadId));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-4 h-4 text-[var(--theme-primary)] rounded focus:ring-[var(--theme-primary)]"
                    aria-label={`Select ${thread.subject}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {thread.unread ? (
                        <Mail className="w-4 h-4 text-[var(--theme-primary)]" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-[var(--theme-textSecondary)]" />
                      )}
                      <h3
                        className={`text-base truncate ${
                          thread.unread ? 'font-bold text-[var(--theme-text)]' : 'font-medium text-[var(--theme-textSecondary)]'
                        }`}
                      >
                        {thread.subject}
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--theme-textSecondary)] truncate mb-1">
                      {thread.snippet}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
                      <span>{formatParticipants(thread.participants)}</span>
                      <span>•</span>
                      <span>{thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}</span>
                      <span>•</span>
                      <span>{formatDate(thread.latestMessageAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && threads.length > 0 && (
              <div ref={loadingRef} className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)] mx-auto"></div>
              </div>
            )}
            {!hasMore && threads.length > 0 && (
              <div className="p-6 text-center text-sm text-[var(--theme-textSecondary)]">
                No more threads to load
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InboxPage;

