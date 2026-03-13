/**
 * Notification API Adapter
 * Handles all notification-related API calls
 */

// Use the same base URL logic as redmineAdapter
function buildUrl(path) {
  const envBase = process.env.REACT_APP_REDMINE_BASE_URL;
  if (!envBase) return path;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
      return path;
    }
  } catch (_) {}
  return (envBase.endsWith('/') ? envBase.slice(0,-1) : envBase) + path;
}

// Get authentication headers (same as redmineAdapter)
function getHeaders() {
  const apiKey = localStorage.getItem('redmine_api_key');
  const userId = localStorage.getItem('redmine_user_id');
  
  return {
    'Content-Type': 'application/json',
    'X-Redmine-API-Key': apiKey || '',
    'X-User-Id': userId || ''
  };
}

/**
 * Get all notifications for the current user
 * @param {Object} options - Query options
 * @param {boolean} options.unreadOnly - Only fetch unread notifications
 * @param {number} options.limit - Maximum number of notifications to fetch
 * @param {number} options.offset - Offset for pagination
 */
export async function getNotifications(options = {}) {
  const { unreadOnly = false, limit = 100, offset = 0 } = options;
  
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (unreadOnly) {
      params.append('unread_only', '1');
    }
    
    const response = await fetch(buildUrl(`/notifications.json?${params}`), {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('[getNotifications] Error:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 * Silently fails and returns 0 if endpoint doesn't exist or errors occur
 */
export async function getUnreadNotificationCount() {
  try {
    const response = await fetch(buildUrl('/notifications/unread_count.json'), {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include'
    });
    
    // If endpoint doesn't exist (404) or server error, return 0 silently
    if (!response.ok) {
      // Don't log 404s as errors - endpoint might not be implemented yet
      if (response.status !== 404) {
        console.warn('[getUnreadNotificationCount] Non-404 error:', response.status, response.statusText);
      }
      return 0;
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    // Network errors, CORS issues, etc. - fail silently
    // Only log if it's not a network/CORS error
    if (error.name !== 'TypeError' && !error.message.includes('Failed to fetch')) {
      console.warn('[getUnreadNotificationCount] Error:', error.message);
    }
    return 0;
  }
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(buildUrl(`/notifications/${notificationId}/read.json`), {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[markNotificationAsRead] Error:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const response = await fetch(buildUrl('/notifications/mark_all_read.json'), {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[markAllNotificationsAsRead] Error:', error);
    throw error;
  }
}

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 */
export async function deleteNotification(notificationId) {
  try {
    const response = await fetch(buildUrl(`/notifications/${notificationId}.json`), {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete notification: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('[deleteNotification] Error:', error);
    throw error;
  }
}

