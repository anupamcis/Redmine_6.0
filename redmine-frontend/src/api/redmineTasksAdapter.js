/*
  Adapter: Redmine Issues/Tasks API
  Uses real Redmine endpoints for Issues (Tasks)
*/
import { getAuthHeader } from './redmineAdapter';

let baseUrl = '';
let csrfToken = null;

export function setBaseUrl(url) { baseUrl = url; }
export function setCsrf(token) { csrfToken = token; }

// Helper to get CSRF token
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(url('/my/account'), {
      headers: getAuthHeader(),
      credentials: 'include',
      redirect: 'manual'
    });
    if (res.ok) {
      const html = await res.text();
      const metaMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/);
      if (metaMatch) {
        csrfToken = metaMatch[1];
        return csrfToken;
      }
    }
  } catch (error) {
    console.warn('[getCsrfToken] Could not fetch CSRF token:', error);
  }
  return null;
}

function url(path) {
  if (!baseUrl) return path;
  try {
    // If running on localhost:3000 (React dev server), use proxy for better CORS/cookie handling
    // Now that CORS is properly configured on backend, use proxy for all endpoints including milestones
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
      // Use relative path to leverage proxy for all .json endpoints
      return path;
    }
  } catch (_) {}
  return (baseUrl.endsWith('/') ? baseUrl.slice(0,-1) : baseUrl) + path;
}

async function buildHeaders(includeCsrf = false) {
  const authHeader = getAuthHeader();
  console.log('[buildHeaders] Auth header from getAuthHeader():', authHeader);
  console.log('[buildHeaders] Has Authorization key?:', !!authHeader.Authorization);
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...authHeader
  };
  if (includeCsrf) {
    const token = await getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  console.log('[buildHeaders] Final headers:', Object.keys(headers));
  return headers;
}

/**
 * Get issues/tasks globally (all projects) - OPTIMIZED for My Tasks page
 * GET /issues.json
 * This is much faster than fetching from each project separately
 */
export async function getAllIssues(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    // Track if we're using set_filter for any filter
    let usingSetFilter = false;
    
    // Handle status filter - Redmine by default excludes closed issues
    // To get ALL issues including closed, we need to explicitly request all statuses
    // OPTIMIZED: Explicitly set status_id for better query performance
    if (filters.status_id === '*') {
      params.append('status_id', '*');
    } else if (filters.status_id) {
      // Explicitly set the status (including 'open' for clarity)
      params.append('status_id', filters.status_id);
    } else {
      // Default to open issues if not specified (explicit is better for performance)
      params.append('status_id', 'open');
    }
    
    if (filters.tracker_id) params.append('tracker_id', filters.tracker_id);
    if (filters.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id);
    if (filters.priority_id) params.append('priority_id', filters.priority_id);
    
    // OPTIMIZED: Always set limit and offset (required for pagination)
    // Cap limit at 50 to prevent slow queries
    const limit = Math.min(filters.limit || 25, 50);
    const offset = filters.offset || 0;
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    
    if (filters.sort) params.append('sort', filters.sort);
    
    // Server-side search (subject contains)
    if (filters.search && filters.search.trim()) {
      if (!usingSetFilter) {
        params.append('set_filter', '1');
        usingSetFilter = true;
      }
      params.append('f[]', 'subject');
      params.append('op[subject]', '~');
      params.append('v[subject][]', filters.search.trim());
    }
    
    // OPTIMIZED: Don't include relations by default - it significantly slows down queries
    // Relations are only needed for Gantt chart, not for the tasks list
    // Only include if specifically requested via filters.include
    if (filters.include && filters.include.includes('relations')) {
      params.append('include', 'relations');
    }
    
    const queryString = params.toString();
    const endpoint = `/issues.json${queryString ? '?' + queryString : ''}`;
    
    // Add timeout and abort signal support
    // Use a longer timeout since Redmine queries can be slow with many issues
    const controller = new AbortController();
    let timeoutId = null;
    let requestCompleted = false;
    
    // Only set timeout if no abort signal is provided (to avoid double timeout)
    // Increased timeout to 90 seconds to give Redmine enough time for complex queries
    if (!filters.abortSignal) {
      timeoutId = setTimeout(() => {
        if (!requestCompleted) {
          controller.abort();
        }
      }, 90000); // 90 second timeout - give Redmine enough time to process complex queries
    }
    
    try {
      const response = await fetch(url(endpoint), {
        method: 'GET',
        headers: await buildHeaders(),
        credentials: 'include',
        redirect: 'manual',
        signal: filters.abortSignal || controller.signal
      });
      
      requestCompleted = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You don’t have permission to view these tasks. Try opening a project from the sidebar and viewing its Tasks, or ask an administrator to grant you the appropriate permissions.');
        }
        if (response.status === 413) {
          throw new Error('Query too complex. Try applying more filters to reduce results.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      requestCompleted = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (err.name === 'AbortError') {
        // Don't throw error immediately - request might still be processing server-side
        // Let the caller handle this more gracefully
        throw new Error('Request timeout - the query is taking too long. Try applying filters (status, tracker, priority) to reduce the number of results.');
      }
      throw err;
    }
  } catch (error) {
    console.error('[getAllIssues] Error:', error);
    throw error;
  }
}

/**
 * Get issues/tasks for a project
 * GET /projects/:project_id/issues.json
 */
export async function getIssues(projectId, filters = {}) {
  try {
    const params = new URLSearchParams();
    
    // Track if we're using set_filter for any filter
    let usingSetFilter = false;
    
    // Handle status filter - Redmine by default excludes closed issues
    // To get ALL issues including closed, we need to explicitly request all statuses
    if (filters.status_id === '*') {
      // Try direct status_id=* first (simpler approach)
      params.append('status_id', '*');
      // Also try set_filter approach as fallback (commented for now, uncomment if direct doesn't work)
      // params.append('set_filter', '1');
      // params.append('f[]', 'status_id');
      // params.append('op[status_id]', '*');
      // usingSetFilter = true;
    } else if (filters.status_id) {
      params.append('status_id', filters.status_id);
    }
    // If no status_id is specified, Redmine will exclude closed issues by default
    // For dashboard, we want all issues, so we'll pass status_id='*' from the caller
    
    if (filters.tracker_id) params.append('tracker_id', filters.tracker_id);
    if (filters.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id);
    if (filters.priority_id) params.append('priority_id', filters.priority_id);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    if (filters.sort) params.append('sort', filters.sort);
    
    // Server-side search (subject contains)
    if (filters.search && filters.search.trim()) {
      if (!usingSetFilter) {
        params.append('set_filter', '1');
        usingSetFilter = true;
      }
      params.append('f[]', 'subject');
      params.append('op[subject]', '~');
      params.append('v[subject][]', filters.search.trim());
    }
    
    // Include relations for Gantt chart dependency tracking (only if needed)
    // For Kanban, we don't need relations, so we can skip this to improve performance
    if (filters.include_relations !== false) {
      params.append('include', 'relations');
    }
    
    const queryString = params.toString();
    const endpoint = `/projects/${projectId}/issues.json${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development' && data.issues) {
      const closedCount = data.issues.filter(issue => 
        issue.status && (issue.status.name === 'Closed' || issue.status.name === 'closed')
      ).length;
      if (closedCount > 0) {
        console.log('[getIssues] Found', closedCount, 'closed issues in response');
      }
    }
    
    return data;
  } catch (error) {
    console.error('[getIssues] Error:', error);
    throw error;
  }
}

/**
 * Get single issue/task detail
 * GET /issues/:id.json
 */
export async function getIssue(issueId) {
  try {
    const endpoint = `/issues/${issueId}.json?include=journals,attachments,relations,watchers`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[getIssue] Error:', error);
    throw error;
  }
}

/**
 * Create new issue/task
 * POST /issues.json
 */
export async function createIssue(payload, options = {}) {
  try {
    const endpoint = `/issues.json`;
    const requestBody = buildIssueRequestBody(payload, options);

    console.log('[createIssue] Payload being sent:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url(endpoint), {
      method: 'POST',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual',
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[createIssue] Error response:', response.status, responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { errors: [responseText] };
      }
      
      const errorMessage = errorData.errors 
        ? Object.entries(errorData.errors).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('; ')
        : errorData.message || `HTTP error! status: ${response.status}`;
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[createIssue] Success response:', data);
    return data;
  } catch (error) {
    console.error('[createIssue] Error:', error);
    throw error;
  }
}

/**
 * Update issue/task
 * PUT /issues/:id.json
 */
export async function updateIssue(issueId, payload, options = {}) {
  try {
    const endpoint = `/issues/${issueId}.json`;
    const requestBody = buildIssueRequestBody(payload, options);
    const response = await fetch(url(endpoint), {
      method: 'PUT',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual',
      body: JSON.stringify(requestBody)
    });

    // Check for redirects (authentication issues)
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location') || '';
      if (location.includes('/login')) {
        throw new Error('Authentication required. Please login to Redmine first.');
      }
    }

    // Check content type
    const contentType = response.headers.get('Content-Type') || '';
    
    // Read response text once (can only be read once)
    const responseText = await response.text();
    
    if (contentType.includes('text/html')) {
      throw new Error('Server returned HTML instead of JSON. This may indicate an authentication or permission error.');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, check if it's HTML or use status
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            errorMessage = 'Server returned HTML. This may indicate an authentication or permission error.';
          } else {
            errorMessage = errorMessage + ': ' + responseText.substring(0, 100);
          }
        }
      }
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing
    if (!responseText || responseText.trim() === '') {
      // Empty response is OK for PUT requests - means success
      console.log('[updateIssue] Empty response, treating as success');
      return { success: true };
    }

    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (parseError) {
      console.error('[updateIssue] Failed to parse JSON:', parseError);
      console.error('[updateIssue] Response text:', responseText.substring(0, 200));
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('[updateIssue] Error:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('Failed to update issue: ' + error.toString());
  }
}

/**
 * Get project trackers (for create/edit forms)
 * GET /projects/:project_id.json?include=trackers
 */
export async function getProjectTrackers(projectId) {
  try {
    const endpoint = `/projects/${projectId}.json?include=trackers`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.project.trackers || [];
  } catch (error) {
    console.error('[getProjectTrackers] Error:', error);
    return [];
  }
}

/**
 * Delete an issue/task
 * DELETE /issues/:id.json
 */
export async function deleteIssue(issueId) {
  try {
    const endpoint = `/issues/${issueId}.json`;
    const response = await fetch(url(endpoint), {
      method: 'DELETE',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to delete issue ${issueId} (status ${response.status})`);
    }

    return true;
  } catch (error) {
    console.error('[deleteIssue] Error:', error);
    throw error;
  }
}

/**
 * Get issue statuses (for filters and forms)
 * GET /issue_statuses.json
 */
export async function getIssueStatuses() {
  try {
    const endpoint = `/issue_statuses.json`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.issue_statuses || [];
  } catch (error) {
    console.error('[getIssueStatuses] Error:', error);
    return [];
  }
}

/**
 * Get issue priorities (for filters and forms)
 * GET /enumerations/issue_priorities.json
 */
export async function getIssuePriorities() {
  try {
    const endpoint = `/enumerations/issue_priorities.json`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.issue_priorities || [];
  } catch (error) {
    console.error('[getIssuePriorities] Error:', error);
    return [];
  }
}

/**
 * Create issue relation
 * POST /issues/:issue_id/relations.json
 * @param {number} issueId - The issue ID to create relation from
 * @param {number} relatedIssueId - The related issue ID
 * @param {string} relationType - Relation type: 'relates', 'duplicates', 'duplicated', 'blocks', 'blocked', 'precedes', 'follows', 'copied_to', 'copied_from'
 */
export async function createIssueRelation(issueId, relatedIssueId, relationType = 'precedes') {
  try {
    const endpoint = `/issues/${issueId}/relations.json`;
    const requestBody = {
      relation: {
        issue_to_id: relatedIssueId,
        relation_type: relationType
      }
    };

    const response = await fetch(url(endpoint), {
      method: 'POST',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual',
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.errors ? Object.values(errorData.errors).flat().join(', ') : errorData.message || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.relation || data;
  } catch (error) {
    console.error('[createIssueRelation] Error:', error);
    throw error;
  }
}

/**
 * Delete issue relation
 * DELETE /relations/:relation_id.json
 * @param {number} relationId - The relation ID to delete
 */
export async function deleteIssueRelation(relationId) {
  try {
    if (!relationId) {
      throw new Error('Relation ID is required');
    }
    const endpoint = `/relations/${relationId}.json`;
    console.log('[deleteIssueRelation] Deleting relation:', relationId, 'Endpoint:', endpoint);
    const response = await fetch(url(endpoint), {
      method: 'DELETE',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual'
    });

    console.log('[deleteIssueRelation] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[deleteIssueRelation] Error response:', response.status, responseText);
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.errors ? Object.values(errorData.errors).flat().join(', ') : errorData.message || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    console.log('[deleteIssueRelation] Successfully deleted relation:', relationId);
    return true;
  } catch (error) {
    console.error('[deleteIssueRelation] Error:', error);
    throw error;
  }
}

/**
 * Get project members (for assignee selection)
 * GET /projects/:project_id/memberships.json
 */
/**
 * Upload a file to Redmine and get upload token
 * POST /uploads.json
 * Returns: { upload: { token: "...", filename: "...", content_type: "...", filesize: ... } }
 */
export async function uploadFile(file) {
  try {
    // Redmine's upload endpoint expects:
    // 1. Content-Type: application/octet-stream
    // 2. File data in raw request body
    // 3. Optional: filename and content_type as query parameters
    
    // Read file as ArrayBuffer for raw binary upload
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    // Build headers for file upload
    const authHeaders = getAuthHeader(); // Returns object like { Authorization: 'Basic ...' }
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Accept': 'application/json',
      ...authHeaders // Spread auth headers (Authorization)
    };
    
    // Get CSRF token for file uploads
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Build URL with filename and content_type as query parameters
    const endpoint = `/uploads.json`;
    const params = new URLSearchParams();
    if (file.name) {
      params.append('filename', file.name);
    }
    if (file.type) {
      params.append('content_type', file.type);
    }
    const queryString = params.toString();
    const uploadUrl = url(endpoint + (queryString ? '?' + queryString : ''));
    
    console.log('[uploadFile] Uploading to:', uploadUrl, 'File:', file.name, 'Size:', file.size);
    console.log('[uploadFile] Headers:', headers);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      redirect: 'manual',
      body: fileData // Send raw binary data
    });

    // Check for redirect to login (authentication issue)
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location');
      if (location && location.includes('/login')) {
        throw new Error('Authentication required. Please log in again.');
      }
    }

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[uploadFile] Error response:', response.status, responseText);
      console.error('[uploadFile] Response headers:', Object.fromEntries(response.headers.entries()));
      
      // 406 Not Acceptable - usually means format mismatch or permission issue
      if (response.status === 406) {
        // Check if it's a permission issue by looking at response
        if (responseText.includes('permission') || responseText.includes('authorized') || responseText.includes('forbidden')) {
          throw new Error('You do not have permission to upload files. Please check your user permissions in Redmine.');
        }
        // Check if it's a format issue
        if (responseText.includes('format') || responseText.includes('accept')) {
          throw new Error('Server cannot process the request format. Please contact your administrator.');
        }
        // Generic 406 error
        throw new Error(`Upload rejected by server (406 Not Acceptable). This may be a permission or configuration issue. Response: ${responseText.substring(0, 200)}`);
      }
      
      // Check if response is HTML (likely an error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error(`Authentication failed or server error (HTTP ${response.status}). Please check your credentials.`);
      }
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        // If parsing fails, try to extract error message from HTML or use status text
        const statusText = response.statusText || 'Unknown error';
        throw new Error(`Upload failed: ${statusText} (HTTP ${response.status})`);
      }
      
      const errorMessage = errorData.errors 
        ? Object.entries(errorData.errors).map(([key, val]) => {
            const valStr = Array.isArray(val) ? val.join(', ') : String(val);
            return `${key}: ${valStr}`;
          }).join('; ')
        : errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    // Try to parse as JSON, but handle other formats
    let data;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Try to parse as JSON anyway (some Redmine versions don't set content-type correctly)
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Unexpected response format. Expected JSON but got: ${contentType}`);
      }
    }
    
    console.log('[uploadFile] Success:', data);
    
    // Handle different response formats
    const upload = data.upload || data;
    
    if (!upload || !upload.token) {
      console.error('[uploadFile] Response data:', data);
      throw new Error('Upload succeeded but no token received from server. Response: ' + JSON.stringify(data));
    }
    
    return upload;
  } catch (error) {
    console.error('[uploadFile] Error:', error);
    // Re-throw with a more user-friendly message if it's a generic error
    if (error.message && error.message.length > 0) {
      throw error;
    }
    throw new Error(`Failed to upload file: ${error.toString()}`);
  }
}

/**
 * Delete an attachment by ID
 * DELETE /attachments/:id.json
 * Returns: empty response on success
 */
export async function deleteAttachment(attachmentId) {
  try {
    const endpoint = `/attachments/${attachmentId}.json`;
    
    const response = await fetch(url(endpoint), {
      method: 'DELETE',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual'
    });

    // Check for redirects (authentication issues)
    if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location') || '';
      if (location.includes('/login')) {
        throw new Error('Authentication required. Please login to Redmine first.');
      }
    }

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[deleteAttachment] Error response:', response.status, responseText);
      
      if (response.status === 403) {
        throw new Error('You do not have permission to delete this attachment.');
      }
      
      if (response.status === 404) {
        throw new Error('Attachment not found. It may have already been deleted.');
      }
      
      throw new Error(`Failed to delete attachment: HTTP ${response.status}`);
    }

    console.log('[deleteAttachment] Successfully deleted attachment:', attachmentId);
    return { success: true };
  } catch (error) {
    console.error('[deleteAttachment] Error:', error);
    throw error;
  }
}

/**
 * Get project milestones - separate from versions
 * GET /projects/:project_id/milestones.json or /milestones.json?project_id=:id
 * Note: projectId can be either project identifier (name) or project ID
 */
export async function getProjectMilestones(projectId, versionId = null) {
  try {
    // First, try to get project details to get the actual project ID if projectId is an identifier
    let actualProjectId = projectId;
    
    // Try to get project info to ensure we have the correct ID
    try {
      const projectEndpoint = `/projects/${projectId}.json`;
      const projectResponse = await fetch(url(projectEndpoint), {
        method: 'GET',
        headers: await buildHeaders(),
        credentials: 'include',
        redirect: 'manual'
      });
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        if (projectData.project && projectData.project.id) {
          actualProjectId = projectData.project.id;
          console.log('[getProjectMilestones] Resolved project identifier to ID:', projectId, '->', actualProjectId);
        }
      }
    } catch (err) {
      console.warn('[getProjectMilestones] Could not resolve project ID, using identifier:', projectId);
    }
    
    // Try different milestone endpoint patterns
    // The milestones plugin now supports JSON API via /projects/:id/milestones.json
    // If versionId is provided, filter milestones by version
    const versionParam = versionId ? `?version_id=${versionId}` : '';
    const endpoints = [
      `/projects/${actualProjectId}/milestones.json${versionParam}`,
      `/projects/${projectId}/milestones.json${versionParam}`
    ];
    
    let milestones = [];
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log('[getProjectMilestones] Trying endpoint:', endpoint);
        const fullUrl = url(endpoint);
        console.log('[getProjectMilestones] Full URL:', fullUrl);
        const headers = await buildHeaders();
        console.log('[getProjectMilestones] Headers:', headers);
        console.log('[getProjectMilestones] Has Authorization?:', !!headers.Authorization);
        console.log('[getProjectMilestones] Auth header length:', headers.Authorization ? headers.Authorization.length : 0);
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: headers,
          credentials: 'include',
          redirect: 'manual'
        });

        if (response.ok) {
          const data = await response.json();
          milestones = data.milestones || data.milestone || [];
          console.log('[getProjectMilestones] Successfully fetched milestones from:', endpoint, 'Count:', milestones.length);
          break;
        } else {
          const errorText = await response.text();
          console.warn('[getProjectMilestones] Endpoint failed:', endpoint, 'Status:', response.status);
          lastError = new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (err) {
        console.warn('[getProjectMilestones] Error trying endpoint:', endpoint, err);
        lastError = err;
      }
    }
    
    // If no milestones found and we have an error, log it but don't throw
    // Milestones might not have a JSON API endpoint available
    if (milestones.length === 0) {
      if (lastError) {
        console.warn('[getProjectMilestones] No milestones found and endpoints returned errors. Milestones may not have a JSON API endpoint. Error:', lastError);
      } else {
        console.log('[getProjectMilestones] No milestones found for project:', projectId);
      }
      // Return empty array instead of throwing - milestones are optional
      return [];
    }
    
    console.log('[getProjectMilestones] Received raw milestones:', milestones.length, 'for project:', projectId);
    console.log('[getProjectMilestones] Milestone sample:', milestones[0]);
    
    // Filter milestones to ensure they belong to this project AND are actually milestones (not versions)
    // Milestones should have: id, name (or title), version_id, project_id
    // They should NOT have status, sharing (those are version fields)
    const filteredMilestones = milestones.filter(milestone => {
      // First check: must have id and name/title
      if (!milestone.id || (!milestone.name && !milestone.title)) {
        console.warn('[getProjectMilestones] Filtering out invalid milestone (missing id/name):', milestone);
        return false;
      }
      
      // Second check: must have version_id (this distinguishes milestones from versions)
      if (!milestone.hasOwnProperty('version_id')) {
        console.warn('[getProjectMilestones] Filtering out version (missing version_id):', milestone.name || milestone.title, milestone);
        return false;
      }
      
      // Third check: if milestone has project info, ensure it matches current project
      if (milestone.project_id || milestone.project) {
        const milestoneProjectId = milestone.project_id || milestone.project?.id || milestone.project?.identifier;
        const matches = milestoneProjectId === actualProjectId || 
                       milestoneProjectId === projectId ||
                       (milestone.project?.identifier && milestone.project.identifier === projectId);
        if (!matches) {
          console.warn('[getProjectMilestones] Filtering out milestone (wrong project):', milestone.name || milestone.title, 'from project:', milestoneProjectId, 'expected:', actualProjectId);
          return false;
        }
      }
      
      return true;
    });
    
    console.log('[getProjectMilestones] Filtered milestones:', filteredMilestones.length, 'for project:', projectId);
    console.log('[getProjectMilestones] Filtered milestone names:', filteredMilestones.map(m => m.name || m.title));
    console.log('[getProjectMilestones] Milestone version_ids:', filteredMilestones.map(m => ({name: m.name || m.title, version_id: m.version_id})));
    return filteredMilestones;
  } catch (error) {
    console.error('[getProjectMilestones] Error:', error);
    return [];
  }
}

/**
 * Get project fixed versions (milestones) - only versions for the specific project
 * GET /projects/:project_id/versions.json
 * Note: projectId can be either project identifier (name) or project ID
 */
export async function getProjectVersions(projectId) {
  try {
    // First, try to get project details to get the actual project ID if projectId is an identifier
    let actualProjectId = projectId;
    
    // Try to get project info to ensure we have the correct ID
    try {
      const projectEndpoint = `/projects/${projectId}.json`;
      const projectResponse = await fetch(url(projectEndpoint), {
        method: 'GET',
        headers: await buildHeaders(),
        credentials: 'include',
        redirect: 'manual'
      });
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        if (projectData.project && projectData.project.id) {
          actualProjectId = projectData.project.id;
          console.log('[getProjectVersions] Resolved project identifier to ID:', projectId, '->', actualProjectId);
        }
      }
    } catch (err) {
      console.warn('[getProjectVersions] Could not resolve project ID, using identifier:', projectId);
    }
    
    const endpoint = `/projects/${actualProjectId}/versions.json`;
    console.log('[getProjectVersions] Fetching versions for project:', projectId, '(ID:', actualProjectId, ') from:', endpoint);
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getProjectVersions] Error response:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const versions = data.versions || [];
    console.log('[getProjectVersions] Received raw data:', data);
    console.log('[getProjectVersions] Received versions:', versions.length, 'versions for project:', projectId);
    console.log('[getProjectVersions] Version sample:', versions[0]);
    
    // Filter versions to ensure they belong to this project AND are actually versions (not milestones)
    // Versions should have: id, name, project, status, sharing, etc.
    // They should NOT have version_id (that's a milestone field)
    // IMPORTANT: Only show OPEN versions (status === 'open'), matching backend behavior
    const filteredVersions = versions.filter(version => {
      // First check: must have id and name
      if (!version.id || !version.name) {
        console.warn('[getProjectVersions] Filtering out invalid version (missing id/name):', version);
        return false;
      }
      
      // Second check: must NOT have version_id (that's a milestone field)
      if (version.hasOwnProperty('version_id')) {
        console.warn('[getProjectVersions] Filtering out milestone (has version_id):', version.name, version);
        return false;
      }
      
      // Third check: must be OPEN status (matching backend: @issue.project.versions.open)
      // Version status can be: 'open', 'locked', or 'closed'
      if (version.status !== 'open') {
        console.log('[getProjectVersions] Filtering out version (not open):', version.name, 'status:', version.status);
        return false;
      }
      
      // Fourth check: if version has project info, ensure it matches current project
      if (version.project) {
        const versionProjectId = version.project.id || version.project.identifier;
        const matches = versionProjectId === actualProjectId || 
                       versionProjectId === projectId ||
                       (version.project.identifier && version.project.identifier === projectId);
        if (!matches) {
          console.warn('[getProjectVersions] Filtering out version (wrong project):', version.name, 'from project:', versionProjectId, 'expected:', actualProjectId);
          return false;
        }
      }
      
      return true;
    });
    
    console.log('[getProjectVersions] Filtered versions:', filteredVersions.length, 'for project:', projectId);
    console.log('[getProjectVersions] Filtered version names:', filteredVersions.map(v => v.name));
    return filteredVersions;
  } catch (error) {
    console.error('[getProjectVersions] Error:', error);
    return [];
  }
}

export async function getProjectMembers(projectId) {
  try {
    const endpoint = `/projects/${projectId}/memberships.json`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Extract users from memberships
    const users = (data.memberships || []).map(m => m.user).filter(Boolean);
    return users;
  } catch (error) {
    console.error('[getProjectMembers] Error:', error);
    return [];
  }
}

export async function getProjectIssueCategories(projectId) {
  try {
    const endpoint = `/projects/${projectId}/issue_categories.json`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.issue_categories || [];
  } catch (error) {
    console.error('[getProjectIssueCategories] Error:', error);
    return [];
  }
}

// Legacy functions for compatibility (map to new functions)
export async function fetchThreads(cursor = null, limit = 25, search = '') {
  // This is a compatibility function - map to getIssues
  // For now, return empty - will be replaced by proper implementation
  return { threads: [], nextCursor: null };
}

export async function fetchThread(threadId) {
  const data = await getIssue(threadId);
  return {
    threadId: `t-${data.issue.id}`,
    subject: data.issue.subject,
    messages: data.issue.journals ? data.issue.journals.map(j => ({
      messageId: j.id,
      author: { id: j.user.id, name: j.user.name },
      createdAt: j.created_on,
      bodyHtml: j.notes || '',
      direction: j.user.id === data.issue.author.id ? 'sent' : 'received'
    })) : [],
    ...data.issue
  };
}

export async function fetchBoard(projectId) {
  // Get issues and group by status for Kanban
  const data = await getIssues(projectId, { limit: 100 });
  const statuses = await getIssueStatuses();
  
  // Group issues by status
  const columns = statuses.map(status => ({
    id: status.id,
    name: status.name,
    position: status.position || 0,
    cards: (data.issues || []).filter(issue => issue.status.id === status.id).map(issue => ({
      id: issue.id,
      subject: issue.subject,
      description: issue.description || '',
      assignee: issue.assigned_to ? { id: issue.assigned_to.id, name: issue.assigned_to.name } : null,
      tracker: issue.tracker ? issue.tracker.name : '',
      priority: issue.priority ? issue.priority.name : '',
      dueDate: issue.due_date,
      estimatedHours: issue.estimated_hours,
      spentHours: issue.spent_hours
    }))
  })).sort((a, b) => a.position - b.position);

  return { columns };
}

export async function fetchRecipients(projectId) {
  // Use existing recipients endpoint from daily status
  try {
    const endpoint = `/projects/${projectId}/recipients.json`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[fetchRecipients] Error:', error);
    return { recipients: [] };
  }
}

export async function createTask(payload, files) {
  return createIssue(payload);
}

export async function updateTask(id, payload) {
  return updateIssue(id, payload);
}

export async function moveCard(taskId, columnId, position) {
  // Move card = update issue status
  return updateIssue(taskId, { status_id: columnId });
}

export async function postComment(taskId, payload) {
  // Add comment via journal
  // Note: Redmine doesn't have a direct comment endpoint, we need to update the issue with notes
  return updateIssue(taskId, { notes: payload.bodyHtml });
}

export async function getIssueTimeEntries(issueId, params = {}) {
  try {
    const search = new URLSearchParams({
      limit: params.limit || 100,
      issue_id: issueId,
      include: 'activity,user',
      ...params
    }).toString();
    const endpoint = `/time_entries.json?${search}`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.time_entries || [];
  } catch (error) {
    console.error('[getIssueTimeEntries] Error:', error);
    return [];
  }
}

export async function createTimeEntry(payload) {
  try {
    const endpoint = `/time_entries.json`;
    const response = await fetch(url(endpoint), {
      method: 'POST',
      headers: await buildHeaders(true),
      credentials: 'include',
      redirect: 'manual',
      body: JSON.stringify({ time_entry: payload })
    });

    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const data = JSON.parse(text);
        message = data.errors?.join(', ') || data.error || message;
      } catch (_) {
        // ignore parse error, fallback to text
      }
      throw new Error(message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.time_entry || data;
  } catch (error) {
    console.error('[createTimeEntry] Error:', error);
    throw error;
  }
}

export async function getTimeEntryActivities() {
  try {
    const endpoint = `/enumerations/time_entry_activities.json`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.time_entry_activities || [];
  } catch (error) {
    console.error('[getTimeEntryActivities] Error:', error);
    return [];
  }
}

export async function getProjectTimeEntryActivities(projectId) {
  try {
    const endpoint = `/projects/${projectId}.json?include=time_entry_activities`;
    const response = await fetch(url(endpoint), {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include',
      redirect: 'manual'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.project?.time_entry_activities || [];
  } catch (error) {
    console.error('[getProjectTimeEntryActivities] Error:', error);
    return [];
  }
}

function buildIssueRequestBody(issuePayload, options = {}) {
  const body = { issue: issuePayload };
  if (options.timeEntry && Object.keys(options.timeEntry).length) {
    body.time_entry = options.timeEntry;
  }
  return body;
}
