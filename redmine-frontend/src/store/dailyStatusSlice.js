/**
 * Redux slice for Daily Status state management
 */

const initialState = {
  threads: [],
  currentThread: null,
  recipients: [],
  selectedThreadIds: [],
  loading: false,
  error: null,
  hasMore: true,
  currentPage: 1,
  unreadCount: 0
};

function dailyStatusReducer(state = initialState, action) {
  switch (action.type) {
    case 'dailyStatus/setLoading':
      return { ...state, loading: action.payload };
    case 'dailyStatus/setError':
      return { ...state, error: action.payload, loading: false };
    case 'dailyStatus/setThreads': {
      const threads = action.payload;
      const unreadCount = threads.filter(t => t.unread).length;
      return { ...state, threads, unreadCount, loading: false, error: null };
    }
    case 'dailyStatus/appendThreads': {
      const threads = [...state.threads, ...action.payload];
      const unreadCount = threads.filter(t => t.unread).length;
      return { ...state, threads, unreadCount, loading: false, error: null };
    }
    case 'dailyStatus/setCurrentThread':
      return { ...state, currentThread: action.payload, loading: false, error: null };
    case 'dailyStatus/updateThread': {
      const { threadId, updates } = action.payload;
      const threads = state.threads.map(t => t.threadId === threadId ? { ...t, ...updates } : t);
      const currentThread = state.currentThread && state.currentThread.threadId === threadId
        ? { ...state.currentThread, ...updates }
        : state.currentThread;
      return { ...state, threads, currentThread };
    }
    case 'dailyStatus/addReplyToThread': {
      const { threadId, reply } = action.payload;
      const threads = state.threads.map(t => 
        t.threadId === threadId 
          ? { ...t, messageCount: (t.messageCount || 0) + 1 }
          : t
      );
      const currentThread = state.currentThread && state.currentThread.threadId === threadId
        ? { ...state.currentThread, messages: [...(state.currentThread.messages || []), reply] }
        : state.currentThread;
      return { ...state, threads, currentThread };
    }
    case 'dailyStatus/setRecipients':
      return { ...state, recipients: action.payload };
    case 'dailyStatus/toggleThreadSelection': {
      const threadId = action.payload;
      const index = state.selectedThreadIds.indexOf(threadId);
      const selectedThreadIds = index === -1
        ? [...state.selectedThreadIds, threadId]
        : state.selectedThreadIds.filter(id => id !== threadId);
      return { ...state, selectedThreadIds };
    }
    case 'dailyStatus/clearSelection':
      return { ...state, selectedThreadIds: [] };
    case 'dailyStatus/setHasMore':
      return { ...state, hasMore: action.payload };
    case 'dailyStatus/setCurrentPage':
      return { ...state, currentPage: action.payload };
    case 'dailyStatus/markThreadRead': {
      const threadId = action.payload;
      const threads = state.threads.map(t => t.threadId === threadId ? { ...t, unread: false } : t);
      const currentThread = state.currentThread && state.currentThread.threadId === threadId
        ? { ...state.currentThread, unread: false }
        : state.currentThread;
      const unreadCount = threads.filter(t => t.unread).length;
      return { ...state, threads, currentThread, unreadCount };
    }
    case 'dailyStatus/markThreadsRead': {
      const threadIds = action.payload;
      const threads = state.threads.map(t => threadIds.includes(t.threadId) ? { ...t, unread: false } : t);
      const unreadCount = threads.filter(t => t.unread).length;
      return { ...state, threads, unreadCount };
    }
    case 'dailyStatus/setUnreadCount':
      return { ...state, unreadCount: action.payload };
    case 'dailyStatus/reset':
      return initialState;
    default:
      return state;
  }
}

// Action creators
export const setLoading = (loading) => ({ type: 'dailyStatus/setLoading', payload: loading });
export const setError = (error) => ({ type: 'dailyStatus/setError', payload: error });
export const setThreads = (threads) => ({ type: 'dailyStatus/setThreads', payload: threads });
export const appendThreads = (threads) => ({ type: 'dailyStatus/appendThreads', payload: threads });
export const setCurrentThread = (thread) => ({ type: 'dailyStatus/setCurrentThread', payload: thread });
export const updateThread = (threadId, updates) => ({ type: 'dailyStatus/updateThread', payload: { threadId, updates } });
export const addReplyToThread = (threadId, reply) => ({ type: 'dailyStatus/addReplyToThread', payload: { threadId, reply } });
export const setRecipients = (recipients) => ({ type: 'dailyStatus/setRecipients', payload: recipients });
export const toggleThreadSelection = (threadId) => ({ type: 'dailyStatus/toggleThreadSelection', payload: threadId });
export const clearSelection = () => ({ type: 'dailyStatus/clearSelection' });
export const setHasMore = (hasMore) => ({ type: 'dailyStatus/setHasMore', payload: hasMore });
export const setCurrentPage = (page) => ({ type: 'dailyStatus/setCurrentPage', payload: page });
export const markThreadRead = (threadId) => ({ type: 'dailyStatus/markThreadRead', payload: threadId });
export const markThreadsRead = (threadIds) => ({ type: 'dailyStatus/markThreadsRead', payload: threadIds });
export const setUnreadCount = (count) => ({ type: 'dailyStatus/setUnreadCount', payload: count });
export const reset = () => ({ type: 'dailyStatus/reset' });

export default dailyStatusReducer;

