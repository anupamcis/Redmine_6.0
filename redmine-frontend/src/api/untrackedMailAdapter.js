import { getAuthHeader } from './redmineAdapter';

/**
 * untrackedMailAdapter - API adapter for Untracked Mail plugin
 * Handles all Untracked Mail related API calls to Redmine backend
 */

let baseUrl = '';

export function setBaseUrl(url) {
  baseUrl = url;
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

// Helper function to parse mails from HTML response
async function parseMailsFromHTML(response, page) {
  const html = await response.text();
  
  console.log('[parseMailsFromHTML] HTML length:', html.length);
  console.log('[parseMailsFromHTML] HTML preview:', html.substring(0, 500));
  
  // Parse HTML to extract mail data
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const mails = [];
  
  // Try multiple selectors to find the table
  let rows = doc.querySelectorAll('table.list tbody tr');
  console.log('[parseMailsFromHTML] Found rows with table.list:', rows.length);
  
  // If no rows found, try alternative selectors
  if (rows.length === 0) {
    rows = doc.querySelectorAll('table tbody tr');
    console.log('[parseMailsFromHTML] Found rows with table:', rows.length);
  }
  
  if (rows.length === 0) {
    rows = doc.querySelectorAll('tbody tr');
    console.log('[parseMailsFromHTML] Found rows with tbody:', rows.length);
  }
  
  if (rows.length === 0) {
    rows = doc.querySelectorAll('tr');
    console.log('[parseMailsFromHTML] Found all rows:', rows.length);
  }
  
  rows.forEach((row, index) => {
    // Skip header row if it exists
    const th = row.querySelector('th');
    if (th) {
      console.log('[parseMailsFromHTML] Skipping header row');
      return;
    }
    
    const cells = row.querySelectorAll('td');
    console.log(`[parseMailsFromHTML] Row ${index} has ${cells.length} cells`);
    
    if (cells.length >= 4) {
      const subjectLink = cells[0].querySelector('a');
      const fromCell = cells[1];
      const sentMailCell = cells[2];
      const createdOnCell = cells[3];
      
      if (subjectLink) {
        const href = subjectLink.getAttribute('href');
        const subjectText = subjectLink.textContent.trim();
        console.log(`[parseMailsFromHTML] Found mail: ${subjectText}, href: ${href}`);
        
        // Try to extract mail_id from href
        // Redmine route: /projects/:id/project_untracked_mails/:mail_id
        let mailId = null;
        const mailIdMatch = href.match(/\/project_untracked_mails\/(\d+)/) || 
                           href.match(/mail_id=(\d+)/) ||
                           href.match(/\/untracked_mails\/(\d+)/);
        if (mailIdMatch) {
          mailId = parseInt(mailIdMatch[1], 10);
        }
        
        mails.push({
          id: mailId,
          subject: subjectText || '-',
          from: fromCell ? fromCell.textContent.trim() : '-',
          sent_mail: sentMailCell ? sentMailCell.textContent.trim() : '-',
          created_on: createdOnCell ? createdOnCell.textContent.trim() : '-',
          href: href
        });
      } else {
        console.log(`[parseMailsFromHTML] Row ${index} has no subject link`);
      }
    } else {
      console.log(`[parseMailsFromHTML] Row ${index} has insufficient cells (${cells.length})`);
    }
  });
  
  console.log('[parseMailsFromHTML] Parsed mails:', mails.length, mails);
  
  // Extract pagination info
  const paginationEl = doc.querySelector('.pagination');
  let total = 0;
  let pages = 1;
  
  console.log('[parseMailsFromHTML] Pagination element found:', !!paginationEl);
  
  if (paginationEl) {
    const paginationText = paginationEl.textContent;
    console.log('[parseMailsFromHTML] Pagination text:', paginationText);
    
    // Try to extract from format like "(1-4/4)" which appears in Redmine
    const rangeMatch = paginationText.match(/\((\d+)-(\d+)\/(\d+)\)/);
    if (rangeMatch) {
      total = parseInt(rangeMatch[3], 10);
      const currentEnd = parseInt(rangeMatch[2], 10);
      const currentStart = parseInt(rangeMatch[1], 10);
      const perPage = currentEnd - currentStart + 1;
      pages = Math.ceil(total / perPage);
      console.log('[parseMailsFromHTML] Extracted from range format - total:', total, 'pages:', pages);
    } else {
      const pageLinks = paginationEl.querySelectorAll('a, span');
      const pageNumbers = Array.from(pageLinks)
        .map(el => {
          const text = el.textContent.trim();
          const match = text.match(/\d+/);
          return match ? parseInt(match[0], 10) : null;
        })
        .filter(n => n !== null);
      
      if (pageNumbers.length > 0) {
        pages = Math.max(...pageNumbers);
      }
      
      // Try to extract total from pagination text
      const totalMatch = paginationText.match(/(\d+)\s+entries/) || paginationText.match(/of\s+(\d+)/);
      if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
      }
    }
  }
  
  // If we have mails but no total, use mail count
  if (total === 0 && mails.length > 0) {
    total = mails.length;
  }
  
  console.log('[parseMailsFromHTML] Final result - mails:', mails.length, 'total:', total, 'pages:', pages);
  
  return {
    mails,
    total: total || mails.length,
    pages: pages || 1,
    currentPage: page
  };
}

// Helper to build request headers for JSON API
async function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...getAuthHeader()
  };
}

/**
 * Get untracked mails list for a project
 * GET /projects/:id/project_untracked_mails
 * Route: project_untracked_mails GET /projects/:id/project_untracked_mails(.:format)
 * @param {string} projectId - Project identifier
 * @param {number} page - Page number for pagination
 * @param {string} mailType - Filter type: "Unread" or "All mail"
 * @param {string} sortBy - Sort field: "created_on" or "sent_mail"
 * @param {string} sortOrder - Sort order: "asc" or "desc"
 * @returns {Promise<{mails: Array, total: number, pages: number}>}
 */
export async function getUntrackedMails(projectId, page = 1, mailType = 'Unread', sortBy = 'created_on', sortOrder = 'desc') {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      mail_type: mailType
    });

    // New JSON endpoint exposed by the plugin
    const endpoint = `/projects/${projectId}/project_untracked_mails.json?${params.toString()}`;
    const fullUrl = url(endpoint);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized');
      }
      throw new Error(`Failed to fetch untracked mails: ${response.status}`);
    }

    const data = await response.json();
    const mails = Array.isArray(data.mails) ? data.mails : [];
    const total = typeof data.total === 'number' ? data.total : mails.length;
    const pages = data.per_page ? Math.max(1, Math.ceil(total / data.per_page)) : 1;

    return {
      mails,
      total,
      pages,
      currentPage: data.page || page
    };
  } catch (error) {
    console.error('[getUntrackedMails] Error:', error);
    throw error;
  }
}

/**
 * Get untracked mail detail
 * GET /projects/:project_id/untracked_mails/:mail_id
 * Note: The backend uses params[:mail_id], so the route might be defined with that parameter name
 * @param {string} projectId - Project identifier
 * @param {number} mailId - Mail ID
 * @returns {Promise<Object>}
 */
export async function getUntrackedMailDetail(projectId, mailId) {
  try {
    // JSON detail endpoint: /projects/:id/project_untracked_mails/:mail_id.json
    const endpoint = `/projects/${projectId}/project_untracked_mails/${mailId}.json`;
    const fullUrl = url(endpoint);
    
    console.log('[getUntrackedMailDetail] Fetching:', fullUrl);
    
    console.log('[getUntrackedMailDetail] Fetching:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized');
      }
      if (response.status === 404) {
        throw new Error('Mail not found');
      }
      throw new Error(`Failed to fetch mail detail: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      subject: data.subject || '',
      from: data.from || '',
      to: data.to || '',
      cc: data.cc || '',
      reply_to: data.reply_to || '',
      message_id: data.message_id || '',
      references: data.references || '',
      headers: data.headers || '',
      sent_mail: data.sent_mail,
      created_on: data.created_on,
      message: data.message_html || '',
      attachments: Array.isArray(data.attachments) ? data.attachments : []
    };
  } catch (error) {
    console.error('[getUntrackedMailDetail] Error:', error);
    throw error;
  }
}

/**
 * Get all untracked mails (admin view)
 * GET /untracked_mails
 * @param {number} page - Page number for pagination
 * @param {string} mailType - Filter type: "Unread" or "All mail"
 * @param {string} sortBy - Sort field: "created_on" or "sent_mail"
 * @param {string} sortOrder - Sort order: "asc" or "desc"
 * @returns {Promise<{mails: Array, total: number, pages: number}>}
 */
export async function getAllUntrackedMails(page = 1, mailType = 'Unread', sortBy = 'created_on', sortOrder = 'desc') {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      mail_type: mailType
    });

    const endpoint = `/untracked_mails.json?${params.toString()}`;
    const fullUrl = url(endpoint);
    
    console.log('[getAllUntrackedMails] Fetching:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: await buildHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized');
      }
      throw new Error(`Failed to fetch untracked mails: ${response.status}`);
    }

    const data = await response.json();
    const mails = Array.isArray(data.mails) ? data.mails : [];
    const total = typeof data.total === 'number' ? data.total : mails.length;
    const pages = data.per_page ? Math.max(1, Math.ceil(total / data.per_page)) : 1;

    return {
      mails,
      total,
      pages,
      currentPage: data.page || page
    };
  } catch (error) {
    console.error('[getAllUntrackedMails] Error:', error);
    throw error;
  }
}

