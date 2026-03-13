import * as notificationAPI from '../api/notificationAdapter';

// Action Types
const FETCH_NOTIFICATIONS_START = 'notifications/FETCH_START';
const FETCH_NOTIFICATIONS_SUCCESS = 'notifications/FETCH_SUCCESS';
const FETCH_NOTIFICATIONS_ERROR = 'notifications/FETCH_ERROR';
const FETCH_UNREAD_COUNT_SUCCESS = 'notifications/FETCH_UNREAD_COUNT_SUCCESS';
const MARK_AS_READ = 'notifications/MARK_AS_READ';
const MARK_ALL_AS_READ = 'notifications/MARK_ALL_AS_READ';
const DELETE_NOTIFICATION = 'notifications/DELETE';
const CLEAR_NOTIFICATIONS = 'notifications/CLEAR';
const INCREMENT_UNREAD = 'notifications/INCREMENT_UNREAD';
const DECREMENT_UNREAD = 'notifications/DECREMENT_UNREAD';

// Initial State
const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetch: null
};

// Reducer
const notificationReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_NOTIFICATIONS_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    case FETCH_NOTIFICATIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        notifications: action.payload,
        lastFetch: new Date().toISOString(),
        unreadCount: action.payload.filter(n => !n.read).length
      };
    case FETCH_NOTIFICATIONS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case FETCH_UNREAD_COUNT_SUCCESS:
      return {
        ...state,
        unreadCount: action.payload
      };
    case MARK_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    case MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      };
    case DELETE_NOTIFICATION:
      const notification = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: notification && !notification.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount
      };
    case CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
    case INCREMENT_UNREAD:
      return {
        ...state,
        unreadCount: state.unreadCount + 1
      };
    case DECREMENT_UNREAD:
      return {
        ...state,
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    default:
      return state;
  }
};

// Action Creators
export const fetchNotifications = (options = {}) => {
  return async (dispatch) => {
    dispatch({ type: FETCH_NOTIFICATIONS_START });
    try {
      const notifications = await notificationAPI.getNotifications(options);
      dispatch({ type: FETCH_NOTIFICATIONS_SUCCESS, payload: notifications });
    } catch (error) {
      dispatch({ type: FETCH_NOTIFICATIONS_ERROR, payload: error.message });
    }
  };
};

export const fetchUnreadCount = () => {
  return async (dispatch) => {
    try {
      const count = await notificationAPI.getUnreadNotificationCount();
      dispatch({ type: FETCH_UNREAD_COUNT_SUCCESS, payload: count });
    } catch (error) {
      // Silently handle errors - don't log network/CORS errors
      // The API function already returns 0 on error, so we can safely ignore
      // Only log unexpected errors
      if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
        console.warn('[fetchUnreadCount] Unexpected error:', error.message);
      }
      // Set count to 0 on any error
      dispatch({ type: FETCH_UNREAD_COUNT_SUCCESS, payload: 0 });
    }
  };
};

export const markAsRead = (notificationId) => {
  return async (dispatch) => {
    try {
      await notificationAPI.markNotificationAsRead(notificationId);
      dispatch({ type: MARK_AS_READ, payload: notificationId });
    } catch (error) {
      console.error('[markAsRead] Error:', error);
    }
  };
};

export const markAllAsRead = () => {
  return async (dispatch) => {
    try {
      await notificationAPI.markAllNotificationsAsRead();
      dispatch({ type: MARK_ALL_AS_READ });
    } catch (error) {
      console.error('[markAllAsRead] Error:', error);
    }
  };
};

export const deleteNotification = (notificationId) => {
  return async (dispatch) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      dispatch({ type: DELETE_NOTIFICATION, payload: notificationId });
    } catch (error) {
      console.error('[deleteNotification] Error:', error);
    }
  };
};

export const clearNotifications = () => ({
  type: CLEAR_NOTIFICATIONS
});

export const incrementUnreadCount = () => ({
  type: INCREMENT_UNREAD
});

export const decrementUnreadCount = () => ({
  type: DECREMENT_UNREAD
});

export default notificationReducer;

