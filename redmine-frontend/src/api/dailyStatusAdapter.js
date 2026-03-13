import { getAuthHeader } from './redmineAdapter';

/**
 * dailyStatusAdapter - API adapter for Daily Status plugin
 * Handles all Daily Status related API calls to Redmine backend
 */

let baseUrl = '';
let csrfToken = null;

// Function to get CSRF token from Redmine
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  
  try {
    const headers = { ...getAuthHeader() };
    const response = await fetch(url('/my/account'), {
      headers,
      credentials: 'include',
      redirect: 'manual'
    });

    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      return null;
    }

    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    const metaMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (metaMatch) {
      csrfToken = metaMatch[1];
      return csrfToken;
    }
    
    const formMatch = html.match(/<input[^>]*name="authenticity_token"[^>]*value="([^"]+)"/);
    if (formMatch) {
      csrfToken = formMatch[1];
      return csrfToken;
    }
  } catch (error) {
    console.warn('[getCsrfToken] Could not fetch CSRF token:', error);
  }
  
  return null;
}

// Helper to build request headers
async function getHeaders(includeCsrf = false) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (includeCsrf) {
    const token = await getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  
  return headers;
}

async function buildHeaders(includeCsrf = false) {
  const headers = await getHeaders(includeCsrf);
  return { ...headers, ...getAuthHeader() };
}

// Helper to build full URL
function url(path) {
  // If no baseUrl, use relative path (mock or CRA proxy)
  if (!baseUrl) return path;
  // If running under CRA dev server (localhost:3000), prefer proxy by using relative path
  try {
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
      return path;
    }
  } catch (_) {}
  // Otherwise use absolute baseUrl
  return (baseUrl.endsWith('/') ? baseUrl.slice(0,-1) : baseUrl) + path;
}

export function setBaseUrl(url) {
  baseUrl = url;
}

/**
 * Get inbox list of threads
 * GET /projects/:project_id/daily_statuses.json
 * @param {string} projectId - Project identifier
 * @param {number} page - Page number for pagination
 * @returns {Promise<{threads: Array, nextCursor: string|null}>}
 */
export async function getInbox(projectId, page = 1) {
  try {
    const endpoint = `/projects/${projectId}/daily_statuses.json?page=${page}`;
    const fullUrl = url(endpoint);
    console.log('[getInbox] Fetching:', fullUrl);
    console.log('[getInbox] Headers:', await buildHeaders());
    
    const response = await fetch(
      fullUrl,
      {
        method: 'GET',
        headers: await buildHeaders(),
        credentials: 'include',
        redirect: 'manual',
        cache: 'no-store'
      }
    );
    
    console.log('[getInbox] Response status:', response.status);
    console.log('[getInbox] Response headers:', Object.fromEntries(response.headers.entries()));

    // Handle redirects (usually means not authenticated)
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location') || '';
      if (location.includes('/login')) {
        throw new Error('Authentication required. Please login to Redmine first.');
      }
    }

    // Check if response is HTML (likely a redirect to login page)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Authentication required. Please login to Redmine first.');
    }

    if (!response.ok) {
      // Try to parse error message
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (_) {
        // If not JSON, check if it's HTML (login page)
        const text = await response.text();
        if (text.includes('login') || text.includes('Login')) {
          errorMessage = 'Authentication required. Please login to Redmine first.';
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[getInbox] Error:', error);
    throw error;
  }
}

/**
 * Get thread detail with messages
 * GET /projects/:project_id/daily_statuses/:id.json
 * @param {string} projectId - Project identifier
 * @param {number} threadId - Daily status ID
 * @returns {Promise<Object>}
 */
export async function getThread(projectId, threadId) {
  try {
    const endpoint = `/projects/${projectId}/daily_statuses/${threadId}.json`;
    const fullUrl = url(endpoint);
    console.log('[getThread] Fetching:', fullUrl);
    
    const response = await fetch(
      fullUrl,
      {
        method: 'GET',
        headers: await buildHeaders(),
        credentials: 'include',
        redirect: 'manual',
        cache: 'no-store'
      }
    );

    // Handle redirects (usually means not authenticated)
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location') || '';
      if (location.includes('/login')) {
        throw new Error('Authentication required. Please login to Redmine first.');
      }
    }

    // Check if response is HTML (likely a redirect to login page)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Authentication required. Please login to Redmine first.');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (_) {
        const text = await response.text();
        if (text.includes('login') || text.includes('Login')) {
          errorMessage = 'Authentication required. Please login to Redmine first.';
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[getThread] Error:', error);
    throw error;
  }
}

/**
 * Create new daily status thread
 * POST /projects/:project_id/daily_statuses.json
 * @param {string} projectId - Project identifier
 * @param {Object} payload - { subject, bodyHtml, recipientIds, sendImmediately, isDraft }
 * @returns {Promise<{status: string, threadId: string, messageId: number}>}
 */
export async function createThread(projectId, payload) {
  try {
    const endpoint = `/projects/${projectId}/daily_statuses.json`;
    const fullUrl = url(endpoint);
    console.log('[createThread] POST to:', fullUrl);
    
    const response = await fetch(
      fullUrl,
      {
        method: 'POST',
        headers: await buildHeaders(true),
        credentials: 'include',
        body: JSON.stringify({
          projectId: projectId,
          subject: payload.subject,
          bodyHtml: payload.bodyHtml,
          recipientIds: payload.recipientIds || [],
          sendImmediately: payload.sendImmediately || false,
          isDraft: payload.isDraft || false
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[createThread] Error:', error);
    throw error;
  }
}

/**
 * Reply to a thread
 * POST /projects/:project_id/daily_statuses/:id/daily_status_replies.json
 * @param {string} projectId - Project identifier
 * @param {number} threadId - Daily status ID
 * @param {Object} payload - { bodyHtml, sendImmediately }
 * @returns {Promise<{status: string, messageId: number, threadId: string}>}
 */
export async function replyToThread(projectId, threadId, payload) {
  try {
    const endpoint = `/projects/${projectId}/daily_statuses/${threadId}/daily_status_replies.json`;
    const fullUrl = url(endpoint);
    console.log('[replyToThread] POST to:', fullUrl);
    
    const response = await fetch(
      fullUrl,
      {
        method: 'POST',
        headers: await buildHeaders(true),
        credentials: 'include',
        body: JSON.stringify({
          bodyHtml: payload.bodyHtml,
          sendImmediately: payload.sendImmediately !== false
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[replyToThread] Error:', error);
    throw error;
  }
}

/**
 * Update thread (recipients, subject, mark read/unread)
 * PUT /projects/:project_id/daily_statuses/:id.json
 * @param {string} projectId - Project identifier
 * @param {number} threadId - Daily status ID
 * @param {Object} payload - { recipientIds?, subject?, unread?, markRead?, markUnread? }
 * @returns {Promise<{status: string, threadId: string}>}
 */
export async function updateThread(projectId, threadId, payload) {
  try {
    const endpoint = `/projects/${projectId}/daily_statuses/${threadId}.json`;
    const fullUrl = url(endpoint);
    console.log('[updateThread] PUT to:', fullUrl);
    
    const response = await fetch(
      fullUrl,
      {
        method: 'PUT',
        headers: await buildHeaders(true),
        credentials: 'include',
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[updateThread] Error:', error);
    throw error;
  }
}

/**
 * Get recipients list for a project
 * GET /projects/:project_id/recipients.json
 * @param {string} projectId - Project identifier
 * @returns {Promise<{recipients: Array}>}
 */
export async function getRecipients(projectId) {
  try {
    const endpoint = `/projects/${projectId}/recipients.json`;
    const fullUrl = url(endpoint);
    console.log('[getRecipients] Fetching:', fullUrl);
    
    const response = await fetch(
      fullUrl,
      {
        method: 'GET',
        headers: await buildHeaders(),
        credentials: 'include',
        redirect: 'manual',
        cache: 'no-store'
      }
    );

    // Handle redirects (usually means not authenticated)
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location') || '';
      if (location.includes('/login')) {
        throw new Error('Authentication required. Please login to Redmine first.');
      }
    }

    // Check if response is HTML (likely a redirect to login page)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Authentication required. Please login to Redmine first.');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      // Clone the response so we can read it without consuming the stream
      const responseClone = response.clone();
      try {
        const errorData = await responseClone.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (_) {
        try {
          const text = await response.text();
          if (text.includes('login') || text.includes('Login')) {
            errorMessage = 'Authentication required. Please login to Redmine first.';
          } else if (text.includes('Forbidden') || text.includes('403')) {
            errorMessage = 'Access forbidden. You may not have permission to view recipients for this project.';
          }
        } catch (__) {
          // If we can't read the response, use the status-based message
          if (response.status === 403) {
            errorMessage = 'Access forbidden. You may not have permission to view recipients for this project.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please login to Redmine first.';
          }
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[getRecipients] Response data:', data);
    console.log('[getRecipients] Recipients count:', data.recipients ? data.recipients.length : 0);
    if (!data.recipients) {
      console.warn('[getRecipients] No recipients field in response, data:', data);
    }
    return data;
  } catch (error) {
    console.error('[getRecipients] Error:', error);
    console.error('[getRecipients] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Mark thread as read
 * @param {string} projectId - Project identifier
 * @param {number} threadId - Daily status ID
 * @returns {Promise<{status: string}>}
 */
export async function markThreadRead(projectId, threadId) {
  return updateThread(projectId, threadId, { markRead: true });
}

/**
 * Mark multiple threads as read
 * @param {string} projectId - Project identifier
 * @param {Array<number>} threadIds - Array of daily status IDs
 * @returns {Promise<Array>}
 */
export async function markThreadsRead(projectId, threadIds) {
  const promises = threadIds.map(id => markThreadRead(projectId, id));
  return Promise.all(promises);
}

/**
 * Get unread thread count for a project
 * @param {string} projectId - Project identifier
 * @returns {Promise<number>}
 */
export async function getUnreadCount(projectId) {
  try {
    const data = await getInbox(projectId, 1);
    const unreadCount = (data.threads || []).filter(t => t.unread).length;
    return unreadCount;
  } catch (error) {
    console.error('[getUnreadCount] Error:', error);
    return 0;
  }
}

export async function hasSubmittedStatus(projectId) {
  try {
    const endpoint = `/projects/${projectId}/daily_statuses/today_status.json`;
    const fullUrl = url(endpoint);
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual',
      cache: 'no-store'
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (_) {
        const text = await response.text();
        if (text.includes('login')) {
          errorMessage = 'Authentication required. Please login to Redmine first.';
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[hasSubmittedStatus] Error:', error);
    throw error;
  }
}

