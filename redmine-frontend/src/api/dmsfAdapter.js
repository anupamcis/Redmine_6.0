import { getAuthHeader, setBaseUrl as setRedmineBaseUrl } from './redmineAdapter';

let baseUrl = '';

export function setBaseUrl(url) {
  baseUrl = url;
  setRedmineBaseUrl(url); // Ensure core adapter also has the correct base URL
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

export async function getProjectDmsf(projectId, options = {}) {
  const params = new URLSearchParams();
  if (options.folderTitle) {
    params.set('folder_title', options.folderTitle);
  }
  if (options.folderId) {
    params.set('folder_id', String(options.folderId));
  }
  if (options.customFieldId) {
    params.set('custom_field_id', String(options.customFieldId));
  }
  if (options.customValue) {
    params.set('custom_value', String(options.customValue));
  }

  const query = params.toString();
  const endpoint = `/projects/${encodeURIComponent(projectId)}/dmsf.json${query ? `?${query}` : ''}`;

  const res = await fetch(url(endpoint), {
    method: 'GET',
    headers: await buildHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load documents (${res.status}): ${text || res.statusText}`);
  }

  const json = await res.json();
  // redmine_dmsf wraps payload under root "dmsf"
  if (json && json.dmsf) {
    return json.dmsf;
  }
  return json;
}

export function getDmsfFileDownloadUrl(fileId) {
  const endpoint = `/dmsf/files/${encodeURIComponent(fileId)}/download`;
  return url(endpoint);
}

// This function is no longer used for direct downloads, as plain <a> tags are used.
// Keeping it for reference or potential future use if complex download logic is needed.
export async function downloadDmsfFile(fileId, filename) {
  const downloadUrl = getDmsfFileDownloadUrl(fileId);
  console.log('[downloadDmsfFile] Attempting direct download via link for file:', fileId, 'from URL:', downloadUrl);

  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `file-${fileId}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 100);

    return true;
  } catch (error) {
    console.error('[downloadDmsfFile] Error initiating direct download:', error);
    throw new Error(`Failed to initiate download: ${error.message}`);
  }
}


