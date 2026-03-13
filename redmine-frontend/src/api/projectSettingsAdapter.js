import { getAuthHeader, setBaseUrl as setRedmineBaseUrl } from './redmineAdapter';

let baseUrl = '';

export function setBaseUrl(url) {
  baseUrl = url;
  setRedmineBaseUrl(url);
}

function url(path) {
  if (!baseUrl) return path;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
      return path; // Use relative path for CRA dev proxy
    }
  } catch (_) {}
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}${path}`;
}

async function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...getAuthHeader(),
  };
}

/**
 * Get project settings data
 * @param {string} projectId - The project identifier
 * @param {string} [tab] - Optional tab name to include specific data (e.g., 'members')
 */
export async function getProjectSettings(projectId, tab = null, additionalParams = {}) {
  const params = new URLSearchParams();
  if (tab) {
    params.append('tab', tab);
  }
  // Add any additional query parameters
  Object.keys(additionalParams).forEach(key => {
    if (additionalParams[key] !== null && additionalParams[key] !== undefined) {
      params.append(key, additionalParams[key]);
    }
  });
  
  const queryString = params.toString();
  const endpoint = `/projects/${encodeURIComponent(projectId)}/settings.json${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load project settings (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Update project settings
 */
export async function updateProjectSettings(projectId, projectData) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ project: projectData }),
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update project (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[updateProjectSettings] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Get project members
 */
export async function getProjectMembers(projectId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/settings.json?include=members`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load members (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Create new member
 */
export async function createProjectMember(projectId, memberData) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/memberships.json`;
  const res = await fetch(url(endpoint), {
    method: 'POST',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ membership: memberData }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create member (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Update member roles
 */
export async function updateProjectMember(memberId, memberData) {
  const endpoint = `/memberships/${encodeURIComponent(memberId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ membership: memberData }),
  });

  // Handle 204 No Content (render_api_ok returns this) - check BEFORE reading body
  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update member (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  
  // If no content or not JSON, return empty object
  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {}; // Return empty object for empty/non-JSON responses
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // If JSON parsing fails, return empty object
    console.warn('[updateProjectMember] Failed to parse JSON response:', e, 'Response text:', text);
    return {};
  }
}

/**
 * Delete member
 */
export async function deleteProjectMember(memberId) {
  const endpoint = `/memberships/${encodeURIComponent(memberId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'DELETE',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete member (${res.status}): ${text || res.statusText}`);
  }

  // Handle empty response (204 No Content or empty body)
  const contentType = res.headers.get('content-type');
  const text = await res.text().catch(() => '');
  
  // If no content or not JSON, return empty object
  if (!text || text.trim() === '' || !contentType || !contentType.includes('application/json')) {
    return {}; // Return empty object for empty/non-JSON responses
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // If JSON parsing fails, return empty object
    console.warn('[deleteProjectMember] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Change project manager
 */
export async function changeProjectManager(projectId, memberId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/members/change_manager.json?new_manager=${memberId}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to change project manager (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Change client POC
 */
export async function changeClientPOC(projectId, memberId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/members/change_client_poc.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ client_poc: memberId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to change client POC (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Autocomplete users and clients for adding members
 * Returns { users: [], clients: [] }
 */
export async function autocompleteUsers(projectId, query) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/memberships/autocomplete.json?q=${encodeURIComponent(query)}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to autocomplete users (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  // Handle both old format (array) and new format (object with users/clients)
  if (Array.isArray(data)) {
    return { users: data, clients: [] };
  }
  return data;
}

/**
 * Autocomplete project tags
 * @param {string} query - Search query for tags
 */
export async function autocompleteTags(query = '') {
  const params = new URLSearchParams();
  if (query) {
    params.append('q', query);
  }
  
  const endpoint = `/auto_complete/project_tags.json${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to autocomplete tags (${res.status}): ${text || res.statusText}`);
  }

  const text = await res.text();
  if (!text || text.trim() === '') {
    return [];
  }

  try {
    // The response is a JSON array of tag names
    return JSON.parse(text);
  } catch (e) {
    console.warn('[autocompleteTags] Failed to parse JSON response:', e);
    return [];
  }
}

/**
 * Get project versions
 */
export async function getProjectVersions(projectId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.version_status) params.append('version_status', filters.version_status);
  if (filters.version_name) params.append('version_name', filters.version_name);
  params.append('tab', 'versions');
  
  const endpoint = `/projects/${encodeURIComponent(projectId)}/settings.json?${params.toString()}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load versions (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Create new version
 */
export async function createVersion(projectId, versionData) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/versions.json`;
  const res = await fetch(url(endpoint), {
    method: 'POST',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ version: versionData }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create version (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Update version
 */
export async function updateVersion(versionId, versionData) {
  const endpoint = `/versions/${encodeURIComponent(versionId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ version: versionData }),
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update version (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  
  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[updateVersion] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Delete version
 */
export async function deleteVersion(versionId) {
  const endpoint = `/versions/${encodeURIComponent(versionId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'DELETE',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete version (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  
  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[deleteVersion] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Close completed versions
 */
export async function closeCompletedVersions(projectId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/versions/close_completed.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  // Handle 204 No Content (render_api_ok returns this)
  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to close completed versions (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  
  // If no content or not JSON, return empty object
  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[closeCompletedVersions] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Get project issue categories
 */
export async function getIssueCategories(projectId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/issue_categories.json`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load categories (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  // API returns array of categories with assigned_to_name
  // Handle both array format and object with issue_categories key
  if (Array.isArray(data)) {
    return data;
  }
  // If it's an object, check for issue_categories key
  if (data.issue_categories && Array.isArray(data.issue_categories)) {
    return data.issue_categories;
  }
  // Fallback to empty array
  return [];
}

/**
 * Create new issue category
 */
export async function createIssueCategory(projectId, categoryData) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/issue_categories.json`;
  const res = await fetch(url(endpoint), {
    method: 'POST',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ issue_category: categoryData }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create category (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Update issue category
 */
export async function updateIssueCategory(categoryId, categoryData) {
  const endpoint = `/issue_categories/${encodeURIComponent(categoryId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ issue_category: categoryData }),
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update category (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  
  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[updateIssueCategory] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Delete issue category
 */
export async function deleteIssueCategory(categoryId) {
  const endpoint = `/issue_categories/${encodeURIComponent(categoryId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'DELETE',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete category (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');
  
  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[deleteIssueCategory] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Get repositories for a project
 */
export async function getRepositories(projectId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/repositories.json`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load repositories (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  // API returns { repositories: [...] } or just array
  if (Array.isArray(data)) {
    return data;
  }
  if (data.repositories && Array.isArray(data.repositories)) {
    return data.repositories;
  }
  return [];
}

/**
 * Create a new repository
 */
export async function createRepository(projectId, repositoryData) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/repositories.json`;
  const res = await fetch(url(endpoint), {
    method: 'POST',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ repository: repositoryData }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create repository (${res.status}): ${text || res.statusText}`);
  }

  return await res.json();
}

/**
 * Update a repository
 */
export async function updateRepository(repositoryId, repositoryData) {
  const endpoint = `/repositories/${encodeURIComponent(repositoryId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ repository: repositoryData }),
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update repository (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[updateRepository] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Delete a repository
 */
export async function deleteRepository(repositoryId) {
  const endpoint = `/repositories/${encodeURIComponent(repositoryId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'DELETE',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete repository (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[deleteRepository] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Update project activities (time tracking)
 */
export async function updateActivities(projectId, activitiesData) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/enumerations.json`;
  const res = await fetch(url(endpoint), {
    method: 'PUT',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ enumerations: activitiesData }),
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update activities (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[updateActivities] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Reset project activities (time tracking)
 */
export async function resetActivities(projectId) {
  const endpoint = `/projects/${encodeURIComponent(projectId)}/enumerations.json`;
  const res = await fetch(url(endpoint), {
    method: 'DELETE',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to reset activities (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[resetActivities] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Remove a service detail from project
 */
export async function removeServiceDetail(serviceDetailId) {
  const endpoint = `/service_details/remove_service_detail/${encodeURIComponent(serviceDetailId)}.json`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to remove service (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[removeServiceDetail] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Update service detail master status
 */
export async function updateServiceDetailMaster(projectId, serviceDetailId) {
  const endpoint = `/service_details/update_service_detail_master.json`;
  const params = new URLSearchParams({
    project_id: projectId,
    current_service_detail_id: serviceDetailId
  });
  const res = await fetch(url(`${endpoint}?${params.toString()}`), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (res.status === 204) {
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update master service (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[updateServiceDetailMaster] Failed to parse JSON response:', e);
    return {};
  }
}

