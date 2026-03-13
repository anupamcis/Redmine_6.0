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
 * Get project creation form data (trackers, custom fields, etc.)
 */
export async function getNewProjectData(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.selected_service_ids) {
    if (Array.isArray(params.selected_service_ids)) {
      params.selected_service_ids.forEach(id => queryParams.append('selected_service_ids[]', String(id)));
    } else {
      queryParams.append('selected_service_ids', String(params.selected_service_ids));
    }
  }
  if (params.selected_client_company) {
    // Extract company ID if it's an object, otherwise use it directly
    const companyId = typeof params.selected_client_company === 'object' && params.selected_client_company.id
      ? params.selected_client_company.id
      : params.selected_client_company;
    if (companyId) {
      queryParams.append('selected_client_company', String(companyId));
    }
  }
  if (params.parent_id) {
    queryParams.append('parent_id', String(params.parent_id));
  }

  const endpoint = `/projects/new.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load project form data (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[getNewProjectData] Failed to parse JSON response:', e);
    return {};
  }
}

/**
 * Create a new project
 */
export async function createProject(projectData, params = {}) {
  const queryParams = new URLSearchParams();
  if (params.selected_service_ids) {
    if (Array.isArray(params.selected_service_ids)) {
      params.selected_service_ids.forEach(id => queryParams.append('selected_service_ids[]', String(id)));
    } else {
      queryParams.append('selected_service_ids', String(params.selected_service_ids));
    }
  }
  if (params.selected_client_company) {
    // Extract company ID if it's an object, otherwise use it directly
    const companyId = typeof params.selected_client_company === 'object' && params.selected_client_company.id
      ? params.selected_client_company.id
      : params.selected_client_company;
    if (companyId) {
      queryParams.append('selected_client_company', String(companyId));
    }
  }
  if (params.parent_id) {
    queryParams.append('parent_id', String(params.parent_id));
  }
  if (params.continue) {
    queryParams.append('continue', params.continue);
  }

  const endpoint = `/projects.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url(endpoint), {
    method: 'POST',
    headers: await buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ project: projectData }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      errorData = { errors: [text || res.statusText] };
    }
    throw new Error(errorData.errors ? errorData.errors.join(', ') : text || res.statusText);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[createProject] Failed to parse JSON response:', e);
    return {};
  }
}

