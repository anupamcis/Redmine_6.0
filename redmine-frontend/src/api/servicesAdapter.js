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
 * Get services data (companies, services, supervisors, projects)
 */
export async function getServicesData(params = {}, signal = null) {
  const queryParams = new URLSearchParams();
  if (params.selected_client_company) {
    queryParams.append('selected_client_company', params.selected_client_company);
  }
  if (params.supervisor) {
    queryParams.append('supervisor', params.supervisor);
  }
  if (params.services && Array.isArray(params.services)) {
    params.services.forEach(id => queryParams.append('services[]', id));
  }
  if (params.client_project) {
    queryParams.append('client_project', params.client_project);
  }

  const endpoint = `/services.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  // Add timeout and abort signal support
  const controller = new AbortController();
  let timeoutId = null;
  let requestCompleted = false;
  
  // Only set timeout if no abort signal is provided (to avoid double timeout)
  // Use 60 second timeout to give backend enough time for complex queries
  if (!signal) {
    timeoutId = setTimeout(() => {
      if (!requestCompleted) {
        controller.abort();
      }
    }, 60000); // 60 second timeout
  }
  
  const fetchOptions = {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
    signal: signal || controller.signal
  };
  
  try {
    const res = await fetch(url(endpoint), fetchOptions);
    
    requestCompleted = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to load services (${res.status}): ${text || res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text().catch(() => '');

    if (!text || text.trim() === '' || !contentType.includes('application/json')) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('[getServicesData] Failed to parse JSON response:', e);
      return {};
    }
  } catch (err) {
    requestCompleted = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (err.name === 'AbortError') {
      throw new Error('Request timeout - the query is taking too long. Please try again.');
    }
    throw err;
  }
}

/**
 * Assign services to a project
 */
export async function assignServicesToProject(projectId, serviceIds) {
  const endpoint = `/services.json`;
  const formData = new FormData();
  formData.append('client_project', projectId);
  formData.append('commit', 'Attach to Project');
  if (Array.isArray(serviceIds)) {
    serviceIds.forEach(id => formData.append('services[]', id));
  }

  const res = await fetch(url(endpoint), {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      // Don't set Content-Type for FormData, browser will set it with boundary
    },
    credentials: 'include',
    body: formData,
  });

  if (res.status === 204) {
    return { success: true };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to assign services (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return { success: true };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[assignServicesToProject] Failed to parse JSON response:', e);
    return { success: true };
  }
}

/**
 * Get company and projects by client email
 */
export async function getCompanyByEmail(clientEmail) {
  const queryParams = new URLSearchParams();
  queryParams.append('client_email', clientEmail);

  const endpoint = `/services/migrate_project_company.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to get company (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return { found: false };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[getCompanyByEmail] Failed to parse JSON response:', e);
    return { found: false };
  }
}

/**
 * Connect company to project
 */
export async function connectCompanyToProject(clientCompanyId, clientProject) {
  const queryParams = new URLSearchParams();
  queryParams.append('client_company_id', clientCompanyId);
  queryParams.append('client_project', clientProject);

  const endpoint = `/services/migrate_project_company.json${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to connect company (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!text || text.trim() === '' || !contentType.includes('application/json')) {
    return { success: false };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[connectCompanyToProject] Failed to parse JSON response:', e);
    return { success: false };
  }
}

