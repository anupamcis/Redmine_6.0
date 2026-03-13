import { getAuthHeader as apiAuth } from './redmineAdapter';

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

const PARAM_MAP = {
  limit: 'limit',
  offset: 'offset',
  sort: 'sort'
};

// Get base URL from environment or use proxy-relative path
function getBaseUrl() {
  const envBase = process.env.REACT_APP_REDMINE_BASE_URL;
  console.log('[getBaseUrl] envBase:', envBase);
  console.log('[getBaseUrl] window.location.port:', typeof window !== 'undefined' ? window.location.port : 'N/A');
  
  if (!envBase) {
    // Use proxy if available (when running on localhost:3000)
    try {
      if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
        console.log('[getBaseUrl] Using proxy (empty base URL)');
        return ''; // Use CRA proxy
      }
    } catch (_) {}
  }
  console.log('[getBaseUrl] Returning:', envBase || '');
  return envBase || '';
}

function buildUrl(path) {
  const baseUrl = getBaseUrl();
  const result = !baseUrl ? path : (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + path;
  console.log('[buildUrl] Input path:', path, '→ Output URL:', result);
  return result;
}

export async function fetchIssues(projectId, params = {}, filterParams) {
  const query = buildQueryString({
    ...params,
    ...(projectId ? { project_id: projectId } : {})
  }, filterParams);
  const url = buildUrl(`/issues.json${query}`);
  const separator = url.includes('?') ? '&' : '?';
  // Include journals with user details to get last_updated_by information
  // Redmine API format: include=attachments,parent,updated_by,journals
  // Journals should include user by default, but we can also try including user separately
  const includeParam = 'include=attachments,parent,updated_by,journals,user';
  return request(`${url}${separator}${includeParam}`);
}

export async function fetchIssueStatuses() {
  const url = buildUrl('/issue_statuses.json');
  console.log('[redmineIssues] fetchIssueStatuses URL:', url);
  const data = await request(url);
  console.log('[redmineIssues] fetchIssueStatuses response:', data);
  return data.issue_statuses || [];
}

export async function fetchIssuePriorities() {
  const url = buildUrl('/enumerations/issue_priorities.json');
  console.log('[redmineIssues] fetchIssuePriorities URL:', url);
  const data = await request(url);
  console.log('[redmineIssues] fetchIssuePriorities response:', data);
  return data.issue_priorities || [];
}

export async function fetchProjectTrackers(projectId) {
  const url = buildUrl(`/projects/${projectId}.json?include=trackers`);
  console.log('[redmineIssues] fetchProjectTrackers URL:', url);
  const data = await request(url);
  console.log('[redmineIssues] fetchProjectTrackers response:', data);
  return data.project?.trackers || [];
}

export async function fetchProject(projectId, include = []) {
  const includeParam = include.length ? `?include=${include.join(',')}` : '';
  const data = await request(buildUrl(`/projects/${projectId}.json${includeParam}`));
  return data.project;
}

export async function fetchProjectMemberships(projectId) {
  const data = await request(buildUrl(`/projects/${projectId}/memberships.json`));
  return data.memberships || [];
}

export async function fetchCurrentUser(include = []) {
  const includeParam = include.length ? `?include=${include.join(',')}` : '';
  const data = await request(buildUrl(`/users/current.json${includeParam}`));
  return data.user;
}

export async function fetchProjects(params = { limit: 100 }) {
  const query = buildQueryString(params);
  const data = await request(buildUrl(`/projects.json${query}`));
  return data.projects || [];
}

export async function fetchCustomFields() {
  try {
    const data = await request(buildUrl('/custom_fields.json'));
    return data.custom_fields || [];
  } catch (error) {
    // Custom fields might require admin permissions
    console.warn('[fetchCustomFields] Failed to fetch custom fields:', error.message);
    return [];
  }
}

export async function fetchProjectVersions(projectId) {
  const data = await request(buildUrl(`/projects/${projectId}/versions.json`));
  return data.versions || [];
}

export async function fetchProjectMilestones(projectId) {
  try {
    const data = await request(buildUrl(`/projects/${projectId}/milestones.json`));
    return data.milestones || [];
  } catch (error) {
    // Milestones endpoint might not exist in standard Redmine
    // Return empty array and log warning
    console.warn('[fetchProjectMilestones] Endpoint not available or forbidden:', error.message);
    return [];
  }
}

export async function searchUsers(params = {}) {
  const query = buildQueryString(params);
  const data = await request(buildUrl(`/users.json${query}`));
  return data.users || [];
}

export async function updateIssue(issueId, payload) {
  await request(buildUrl(`/issues/${issueId}.json`), {
    method: 'PUT',
    body: JSON.stringify({ issue: payload })
  });
}

export async function deleteIssue(issueId) {
  await request(buildUrl(`/issues/${issueId}.json`), { method: 'DELETE' });
}

export function createThrottle(limit = 5) {
  let active = 0;
  const queue = [];

  const runNext = () => {
    if (active >= limit || queue.length === 0) {
      return;
    }
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        active -= 1;
        runNext();
      });
  };

  return function enqueue(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      runNext();
    });
  };
}

async function request(path, options = {}) {
  console.log('[request] Starting request to:', path);
  
  const headers = {
    ...DEFAULT_HEADERS,
    ...apiAuth()
  };
  console.log('[request] Headers:', headers);
  
  const merged = {
    method: 'GET',
    credentials: 'include',
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  };
  console.log('[request] Fetch options:', merged);

  try {
    console.log('[request] Calling fetch...');
    const response = await fetch(path, merged);
    console.log('[request] Got response:', response.status, response.statusText);
    
    if (!response.ok) {
      const message = await extractErrorMessage(response);
      const error = new Error(message || `Request failed with status ${response.status}`);
      error.status = response.status;
      console.error('[request] Request failed:', error);
      throw error;
    }
    if (response.status === 204) return {};
    const data = await response.json();
    console.log('[request] Response data:', data);
    return data;
  } catch (error) {
    console.error('[request] Fetch error for', path, ':', error);
    throw error;
  }
}

function buildQueryString(params, extraParams) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    const mapped = PARAM_MAP[key];
    if (mapped) {
      searchParams.append(mapped, value);
    } else if (key === 'project_id') {
      searchParams.append('project_id', value);
    } else {
      searchParams.append(key, value);
    }
  });
  if (extraParams) {
    for (const [key, value] of extraParams.entries()) {
      searchParams.append(key, value);
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function extractErrorMessage(response) {
  try {
    // Clone the response so we can try multiple parsing methods
    const text = await response.text();
    if (!text) return `HTTP ${response.status} ${response.statusText}`;
    
    try {
      const data = JSON.parse(text);
      if (data?.errors?.length) {
        return data.errors.join(', ');
      }
      if (data?.error) return data.error;
      return text;
    } catch {
      // Not JSON, return as-is
      return text;
    }
  } catch (error) {
    return `HTTP ${response.status} ${response.statusText}`;
  }
}


