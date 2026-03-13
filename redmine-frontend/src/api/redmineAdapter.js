/**
 * redmineAdapter - mock-first adapter.
 * Switch to real Redmine by setting baseUrl via setBaseUrl() or .env.
 */
const envBase = process.env.REACT_APP_REDMINE_BASE_URL;
let baseUrl = envBase || ''; // empty => use CRA public/ mock files
let csrfToken = null;
let authCredentials = null; // Store { username, password } for authenticated requests

// Function to get CSRF token from Redmine
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  
  try {
    // Try to get CSRF token from /my/account page (HTML)
    const res = await fetch(url('/my/account'), { 
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (res.ok) {
      const html = await res.text();
      // Extract CSRF token from meta tag or form
      const metaMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/);
      if (metaMatch) {
        csrfToken = metaMatch[1];
        return csrfToken;
      }
      
      // Try to extract from form
      const formMatch = html.match(/<input[^>]*name="authenticity_token"[^>]*value="([^"]+)"/);
      if (formMatch) {
        csrfToken = formMatch[1];
        return csrfToken;
      }
    }
  } catch (error) {
    console.warn('[getCsrfToken] Could not fetch CSRF token:', error);
  }
  
  return null;
}

export function setBaseUrl(url) { baseUrl = url; }

export function clearAuth() {
  authCredentials = null;
  csrfToken = null;
  try { 
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('redmineBasic');
      window.localStorage.removeItem('redmineCredentials');
      window.localStorage.removeItem('redmineAuth');
    }
  } catch (_) {}
}

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

function getAuthHeaders() {
  // Prefer in-memory credentials
  if (authCredentials) {
    const basic = typeof btoa === 'function'
      ? btoa(`${authCredentials.username}:${authCredentials.password}`)
      : Buffer.from(`${authCredentials.username}:${authCredentials.password}`).toString('base64');
    return { Authorization: `Basic ${basic}` };
  }
  // Fallback to sessionStorage (survives reloads during dev)
  try {
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('redmineBasic') : null;
    if (stored) return { Authorization: `Basic ${stored}` };
  } catch (_) {}
  return {};
}

export function getAuthHeader() {
  return getAuthHeaders();
}

function hasAuth() {
  return authCredentials !== null || 
    (typeof window !== 'undefined' && window.sessionStorage.getItem('redmineBasic') !== null);
}

export async function login({ username, password }) {
  console.log('[login] Attempting login for user:', username);
  // Try Redmine REST via Basic Auth first (works with CRA dev proxy, no CORS).
  // gitlab_token is now a direct column in users table (from redmine_scm plugin)
  const endpoint = url('/users/current.json');
  if (username && password) {
    const basic = typeof btoa === 'function' ? btoa(`${username}:${password}`) : Buffer.from(`${username}:${password}`).toString('base64');
    console.log('[login] Fetching:', endpoint);
    const res = await fetch(endpoint, { headers: { Authorization: `Basic ${basic}` } });
    console.log('[login] Response status:', res.status);
    
    if (res.ok) {
      // Ensure we actually received JSON; if HTML was returned (e.g. login page),
      // trying to parse as JSON will throw "Unexpected token '<'".
      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        const textPreview = (await res.text()).slice(0, 200);
        console.error('[login] Expected JSON but got:', contentType, 'body preview:', textPreview);
        throw new Error('Redmine did not return JSON. Check REST API and authentication settings.');
      }

      const data = await res.json();
      const user = data.user || {};
      
      // gitlab_token is now a direct column in users table (from redmine_scm plugin), not a custom field
      const gitlabToken = user.gitlab_token || '';

      // Fetch api_key from /my/account.json (Redmine provides api_key there)
      // Some instances don't expose api_key on /users/current.json.
      let apiKey = user.api_key || '';
      try {
        const accountEndpoint = url('/my/account.json');
        const accountRes = await fetch(accountEndpoint, { headers: { Authorization: `Basic ${basic}` } });
        if (accountRes.ok) {
          const accountData = await accountRes.json();
          apiKey = accountData?.user?.api_key || apiKey;
        }
      } catch (e) {
        console.warn('[login] Could not fetch api_key from /my/account.json (non-fatal):', e);
      }
      
      // Store credentials for subsequent API calls
      authCredentials = { username, password };
      try { 
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('redmineBasic', basic);
          // Also store in localStorage for persistence across sessions
          window.localStorage.setItem('redmineCredentials', JSON.stringify({ username, password }));
          console.log('[login] Credentials stored in localStorage');
        }
      } catch (err) {
        console.error('[login] Failed to store credentials:', err);
      }
      
      // Return user with GitLab token included
      const result = { 
        user: {
          ...user,
          gitlab_access_token: gitlabToken, // Keep for backward compatibility
          gitlab_token: gitlabToken,
          api_key: apiKey
        }, 
        csrfToken: null 
      };
      console.log('[login] Login successful, user:', user.login);
      return result;
    }
    // If we had a baseUrl configured, treat failure as fatal
    if (baseUrl) {
      console.error('[login] Auth failed with status:', res.status);
      throw new Error(`Redmine auth failed (${res.status}). Enable REST API and verify credentials.`);
    }
  }

  // If no baseUrl and Basic failed, try mock fallback (public/login.json)
  if (!baseUrl) {
    const res = await fetch('/login.json', { method: 'GET' });
    const data = await res.json();
    csrfToken = data.csrfToken || null;
    return { user: data.session, csrfToken };
  }

  throw new Error('Missing or invalid credentials.');
}

// Function to restore authentication from stored credentials
export async function restoreAuth() {
  try {
    if (typeof window === 'undefined') {
      console.log('[restoreAuth] Window not available');
      return null;
    }
    
    // Try to get credentials from localStorage
    const storedCreds = window.localStorage.getItem('redmineCredentials');
    if (!storedCreds) {
      console.log('[restoreAuth] No stored credentials found');
      return null;
    }
    
    console.log('[restoreAuth] Found stored credentials');
    const { username, password } = JSON.parse(storedCreds);
    if (!username || !password) {
      console.log('[restoreAuth] Invalid credentials format');
      return null;
    }
    
    console.log('[restoreAuth] Restoring credentials for user:', username);
    // Restore credentials in memory
    authCredentials = { username, password };
    const basic = typeof btoa === 'function' ? btoa(`${username}:${password}`) : Buffer.from(`${username}:${password}`).toString('base64');
    
    try {
      window.sessionStorage.setItem('redmineBasic', basic);
    } catch (err) {
      console.warn('[restoreAuth] Failed to set sessionStorage:', err);
    }
    
    // Verify credentials are still valid
    const endpoint = url('/users/current.json');
    console.log('[restoreAuth] Verifying credentials with:', endpoint);
    const res = await fetch(endpoint, { headers: { Authorization: `Basic ${basic}` } });
    console.log('[restoreAuth] Verification response status:', res.status);
    
    if (res.ok) {
      const data = await res.json();
      const user = data.user || {};
      
      // gitlab_token is now a direct column in users table (from redmine_scm plugin), not a custom field
      const gitlabToken = user.gitlab_token || '';

      // Fetch api_key from /my/account.json
      let apiKey = user.api_key || '';
      try {
        const accountEndpoint = url('/my/account.json');
        const accountRes = await fetch(accountEndpoint, { headers: { Authorization: `Basic ${basic}` } });
        if (accountRes.ok) {
          const accountData = await accountRes.json();
          apiKey = accountData?.user?.api_key || apiKey;
        }
      } catch (e) {
        console.warn('[restoreAuth] Could not fetch api_key from /my/account.json (non-fatal):', e);
      }
      
      console.log('[restoreAuth] Credentials verified, user:', user.login);
      return { status: 'ok', user: { ...user, gitlab_token: gitlabToken, gitlab_access_token: gitlabToken, api_key: apiKey } };
    }
    
    // Credentials invalid, clear storage
    console.log('[restoreAuth] Credentials invalid, clearing storage');
    clearAuth();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('redmineCredentials');
      window.localStorage.removeItem('redmineAuth');
    }
    return null;
  } catch (error) {
    console.error('[restoreAuth] Failed to restore authentication:', error);
    clearAuth();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('redmineCredentials');
      window.localStorage.removeItem('redmineAuth');
    }
    return null;
  }
}

// Function to fetch user preferences from Redmine
// Since Redmine REST API doesn't directly expose preferences, we fetch from /my/account page
export async function getUserPreferences() {
  if (!hasAuth()) {
    return {};
  }
  
  try {
    const headers = getAuthHeaders();
    
    // Fetch the /my/account page HTML to extract preferences
    // This is how Redmine stores preferences - they're in UserPreference model
    const accountEndpoint = url('/my/account');
    const res = await fetch(accountEndpoint, { headers });
    
    if (!res.ok) {
      console.warn('[getUserPreferences] Failed to fetch account page:', res.status);
      return {};
    }
    
    const html = await res.text();
    
    // Parse preferences from HTML form
    const preferences = {};
    
    // Extract time_zone - handle both selected option and empty value
    // Try multiple patterns to find the selected time zone
    const timeZoneSelectMatch = html.match(/<select[^>]*name="pref\[time_zone\]"[^>]*>([\s\S]*?)<\/select>/);
    if (timeZoneSelectMatch) {
      const selectContent = timeZoneSelectMatch[1];
      
      // Look for selected option (case-insensitive, handle various HTML formats)
      const selectedMatch = selectContent.match(/<option[^>]*value="([^"]*)"[^>]*selected[^>]*>/i);
      if (selectedMatch) {
        preferences.time_zone = selectedMatch[1];
        console.log('[getUserPreferences] Found selected time_zone:', preferences.time_zone);
      } else {
        // Try to find option with selected attribute in different format
        const selectedMatch2 = selectContent.match(/<option[^>]*selected[^>]*value="([^"]*)"[^>]*>/i);
        if (selectedMatch2) {
          preferences.time_zone = selectedMatch2[1];
          console.log('[getUserPreferences] Found selected time_zone (format 2):', preferences.time_zone);
        } else {
          // Check if there's a default selected option (first non-empty option)
          const allOptions = selectContent.match(/<option[^>]*value="([^"]*)"[^>]*>/g);
          if (allOptions && allOptions.length > 0) {
            // Get the first non-empty option value as default
            for (const opt of allOptions) {
              const valueMatch = opt.match(/value="([^"]*)"/);
              if (valueMatch && valueMatch[1] !== '') {
                // If no selected option found, use empty string (first option is usually empty)
                preferences.time_zone = '';
                console.log('[getUserPreferences] No selected time_zone found, using empty string');
                break;
              }
            }
          }
        }
      }
    } else {
      console.warn('[getUserPreferences] Could not find time_zone select element');
    }
    
    // Extract comments_sorting - handle both selected option and empty value
    const commentsSortingSelectMatch = html.match(/<select[^>]*name="pref\[comments_sorting\]"[^>]*>([\s\S]*?)<\/select>/);
    if (commentsSortingSelectMatch) {
      const selectContent = commentsSortingSelectMatch[1];
      // Look for selected option
      const selectedMatch = selectContent.match(/<option[^>]*value="([^"]*)"[^>]*selected[^>]*>/);
      if (selectedMatch) {
        preferences.comments_sorting = selectedMatch[1];
      } else {
        // If no selected option, check if first option (empty) is selected or default
        const firstOptionMatch = selectContent.match(/<option[^>]*value="([^"]*)"[^>]*>/);
        if (firstOptionMatch && firstOptionMatch[1] === '') {
          preferences.comments_sorting = '';
        }
      }
    }
    
    // Extract hide_mail checkbox
    const hideMailMatch = html.match(/<input[^>]*name="pref\[hide_mail\]"[^>]*checked/);
    preferences.hide_mail = !!hideMailMatch;
    
    // Extract warn_on_leaving_unsaved checkbox
    const warnMatch = html.match(/<input[^>]*name="pref\[warn_on_leaving_unsaved\]"[^>]*checked/);
    preferences.warn_on_leaving_unsaved = !!warnMatch;
    
    // Extract mail_notification
    const mailNotifMatch = html.match(/<select[^>]*name="user\[mail_notification\]"[^>]*>[\s\S]*?<option[^>]*value="([^"]*)"[^>]*selected/);
    if (mailNotifMatch) {
      preferences.mail_notification = mailNotifMatch[1];
    }
    
    // Extract notify_about_high_priority_issues checkbox
    const highPriorityMatch = html.match(/<input[^>]*name="pref\[notify_about_high_priority_issues\]"[^>]*checked/);
    preferences.notify_about_high_priority_issues = !!highPriorityMatch;
    
    // Extract no_self_notified checkbox
    const noSelfMatch = html.match(/<input[^>]*name="pref\[no_self_notified\]"[^>]*checked/);
    preferences.no_self_notified = !!noSelfMatch;
    
    // Extract textarea_font
    const textareaFontMatch = html.match(/<input[^>]*name="pref\[textarea_font\]"[^>]*value="([^"]*)"/);
    if (textareaFontMatch) {
      preferences.textarea_font = textareaFontMatch[1];
    }
    
    // Extract recently_used_projects
    const recentProjectsMatch = html.match(/<input[^>]*name="pref\[recently_used_projects\]"[^>]*value="([^"]*)"/);
    if (recentProjectsMatch) {
      preferences.recently_used_projects = recentProjectsMatch[1];
    }
    
    // Extract history_default_tab
    const historyTabMatch = html.match(/<select[^>]*name="pref\[history_default_tab\]"[^>]*>[\s\S]*?<option[^>]*value="([^"]*)"[^>]*selected/);
    if (historyTabMatch) {
      preferences.history_default_tab = historyTabMatch[1];
    }
    
    // Extract toolbar_language_options
    const toolbarLangMatch = html.match(/<textarea[^>]*name="pref\[toolbar_language_options\]"[^>]*>([\s\S]*?)<\/textarea>/);
    if (toolbarLangMatch) {
      preferences.toolbar_language_options = toolbarLangMatch[1].trim();
    }
    
    // Extract default_issue_query
    const defaultIssueQueryMatch = html.match(/<select[^>]*name="pref\[default_issue_query\]"[^>]*>[\s\S]*?<option[^>]*value="([^"]*)"[^>]*selected/);
    if (defaultIssueQueryMatch) {
      preferences.default_issue_query = defaultIssueQueryMatch[1];
    }
    
    // Extract default_project_query
    const defaultProjectQueryMatch = html.match(/<select[^>]*name="pref\[default_project_query\]"[^>]*>[\s\S]*?<option[^>]*value="([^"]*)"[^>]*selected/);
    if (defaultProjectQueryMatch) {
      preferences.default_project_query = defaultProjectQueryMatch[1];
    }
    
    // Extract dmsf_tree_view checkbox
    const dmsfMatch = html.match(/<input[^>]*name="pref\[dmsf_tree_view\]"[^>]*checked/);
    preferences.dmsf_tree_view = !!dmsfMatch;
    
    console.log('[getUserPreferences] Extracted preferences:', preferences);
    
    return preferences;
  } catch (error) {
    console.warn('[getUserPreferences] Could not fetch preferences:', error);
    return {};
  }
}

// Function to fetch current user details (useful for refreshing user data)
// Uses /users/current.json to avoid plugin compatibility issues with /my/account.json
export async function getCurrentUser() {
  if (!hasAuth()) {
    throw new Error('Not authenticated');
  }
  
  try {
    const headers = getAuthHeaders();
    
    // Use /users/current.json (gitlab_token is now a direct column, not a custom field)
    // /my/account.json can have plugin compatibility issues (e.g., redmine_dmsf)
    const currentEndpoint = url('/users/current.json');
    const res = await fetch(currentEndpoint, { headers });
    
    if (!res.ok) {
      // If that fails, try without custom_fields
      const fallbackEndpoint = url('/users/current.json');
      const fallbackRes = await fetch(fallbackEndpoint, { headers });
      
      if (!fallbackRes.ok) {
        throw new Error(`Failed to fetch user: ${res.status}`);
      }
      
      const fallbackData = await fallbackRes.json();
      const user = fallbackData.user || {};
      
      return {
        ...user,
        gitlab_access_token: '',
        gitlab_token: '',
        pref: {}
      };
    }
    
    const data = await res.json();
    const user = data.user || {};
    console.log('[getCurrentUser] User data from /users/current.json:', user);
    console.log('[getCurrentUser] gitlab_token from API:', user.gitlab_token);
    
    // gitlab_token is now a direct column in users table (from redmine_scm plugin), not a custom field
    // However, Redmine's JSON API might not include it by default for security reasons
    // Always fetch it from the HTML account page to ensure we get the actual value
    let gitlabToken = user.gitlab_token || '';
    
    // Always try to fetch from HTML account page to ensure we have the latest value
    // The JSON API might not include sensitive fields like tokens
    console.log('[getCurrentUser] Fetching gitlab_token from HTML account page');
    try {
      const accountRes = await fetch(url('/my/account'), { headers });
      if (accountRes.ok) {
        const accountHtml = await accountRes.text();
        console.log('[getCurrentUser] Fetched account HTML, length:', accountHtml.length);
        
        // Try multiple patterns to find gitlab_token in the HTML form
        // Rails form.text_field :gitlab_token generates: <input type="text" name="user[gitlab_token]" id="user_gitlab_token" value="..." />
        
        // Pattern 1: name="user[gitlab_token]" with value attribute (most common)
        let gitlabTokenMatch = accountHtml.match(/name=["']user\[gitlab_token\][^"']*["'][^>]*value=["']([^"']*)["']/i);
        
        // Pattern 2: id="user_gitlab_token" with value attribute
        if (!gitlabTokenMatch) {
          gitlabTokenMatch = accountHtml.match(/id=["']user_gitlab_token[^"']*["'][^>]*value=["']([^"']*)["']/i);
        }
        
        // Pattern 3: Any input with gitlab_token in name, then find value
        if (!gitlabTokenMatch) {
          const inputMatch = accountHtml.match(/<input[^>]*name=["'][^"']*gitlab_token[^"']*["'][^>]*>/i);
          if (inputMatch) {
            const fullInput = inputMatch[0];
            const valueMatch = fullInput.match(/value=["']([^"']*)["']/i);
            if (valueMatch) {
              gitlabTokenMatch = valueMatch;
            }
          }
        }
        
        // Pattern 4: id containing gitlab_token, then find value
        if (!gitlabTokenMatch) {
          const inputMatch = accountHtml.match(/<input[^>]*id=["'][^"']*gitlab_token[^"']*["'][^>]*>/i);
          if (inputMatch) {
            const fullInput = inputMatch[0];
            const valueMatch = fullInput.match(/value=["']([^"']*)["']/i);
            if (valueMatch) {
              gitlabTokenMatch = valueMatch;
            }
          }
        }
        
        // Pattern 5: Look for gitlab_token anywhere, then find nearest input with value
        if (!gitlabTokenMatch) {
          const gitlabIndex = accountHtml.toLowerCase().indexOf('gitlab_token');
          if (gitlabIndex > -1) {
            const context = accountHtml.substring(Math.max(0, gitlabIndex - 50), Math.min(accountHtml.length, gitlabIndex + 300));
            const valueMatch = context.match(/value=["']([^"']*)["']/i);
            if (valueMatch) {
              gitlabTokenMatch = valueMatch;
            }
          }
        }
        
        if (gitlabTokenMatch && gitlabTokenMatch[1] !== undefined) {
          gitlabToken = gitlabTokenMatch[1];
          // Decode HTML entities if present
          if (gitlabToken) {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = gitlabToken;
            gitlabToken = textarea.value;
          }
          console.log('[getCurrentUser] Found gitlab_token in HTML:', gitlabToken ? '***' : '(empty string)');
        } else {
          console.log('[getCurrentUser] Could not find gitlab_token in HTML form');
          // Log a sample of the HTML around where gitlab_token might be for debugging
          const gitlabIndex = accountHtml.toLowerCase().indexOf('gitlab');
          if (gitlabIndex > -1) {
            const sample = accountHtml.substring(Math.max(0, gitlabIndex - 200), Math.min(accountHtml.length, gitlabIndex + 500));
            console.log('[getCurrentUser] HTML sample around "gitlab":', sample);
          } else {
            console.log('[getCurrentUser] "gitlab" not found in HTML at all');
          }
        }
      } else {
        console.warn('[getCurrentUser] Failed to fetch account HTML:', accountRes.status);
      }
    } catch (htmlError) {
      console.warn('[getCurrentUser] Could not fetch account HTML:', htmlError);
    }
    
    console.log('[getCurrentUser] Extracted gitlabToken:', gitlabToken ? '***' : '(empty)');
    
    const result = {
      ...user,
      gitlab_access_token: gitlabToken, // Keep for backward compatibility
      gitlab_token: gitlabToken,
      pref: user.pref || {}
    };
    
    console.log('[getCurrentUser] Returning user with gitlab_token:', result.gitlab_token ? '***' : '(empty)');
    return result;
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    throw error;
  }
}

export async function getProjects(options = {}) {
  // If we have auth, always try Redmine REST API first
  if (hasAuth()) {
    // Build query params
    const params = new URLSearchParams();
    if (options.membershipOnly) {
      params.append('membership', '1'); // Only projects where user is a member
    }
    // Only add status if it's a valid integer (1, 5, or 9), not 'all' or empty
    if (options.status && options.status !== 'all' && /^\d+$/.test(String(options.status))) {
      params.append('status', options.status); // Filter by status: 1=active, 5=closed, 9=archived
    }
    // Set limit to 100 per page (Redmine default is 25)
    params.append('limit', '100');
    
    const headers = getAuthHeaders();
    let allProjects = [];
    let offset = 0;
    let hasMore = true;
    
    console.log('[getProjects] Starting paginated fetch from Redmine with auth:', !!headers.Authorization);
    
    try {
      // Fetch all pages
      while (hasMore) {
        const pageParams = new URLSearchParams(params);
        pageParams.set('offset', String(offset));
        
        // Include memberships to get project managers
        pageParams.append('include', 'memberships');
        
        const queryString = pageParams.toString();
        const endpoint = url(`/projects.json?${queryString}`);
        console.log('[getProjects] Fetching page:', endpoint);
        
      const res = await fetch(endpoint, { headers });
      
      if (!res.ok) {
        console.error('[getProjects] Redmine API error:', res.status, res.statusText);
        throw new Error(`Failed to fetch projects from Redmine: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
        console.log('[getProjects] Raw Redmine response for page:', {
          projects: data.projects?.length || 0,
          total_count: data.total_count,
          offset: data.offset,
          limit: data.limit
        });
        
        // Debug: Check if memberships are included in response
        if (data.projects && data.projects.length > 0) {
          const sampleProject = data.projects[0];
          console.log('[getProjects] Sample project:', sampleProject.name, 
            'has memberships:', !!sampleProject.memberships, 
            'memberships count:', sampleProject.memberships?.length || 0);
          if (sampleProject.memberships && sampleProject.memberships.length > 0) {
            const sampleMembership = sampleProject.memberships[0];
            console.log('[getProjects] Sample membership - user:', sampleMembership.user?.name, 
              'roles:', sampleMembership.roles?.map(r => r.name) || []);
          }
        }
      
      // Validate this is Redmine response, not mock
        const pageProjects = data.projects || [];
        if (pageProjects.length > 0 && !isRedmineResponse(pageProjects[0])) {
        console.warn('[getProjects] Response looks like mock data, but we have auth. This should not happen.');
        // Still process it, but log warning
      }
      
        allProjects = allProjects.concat(pageProjects);
        
        // Check if there are more pages
        const totalCount = data.total_count;
        const limit = data.limit || 100;
        const currentOffset = data.offset !== undefined ? data.offset : offset;
        
        // Stop if we got fewer projects than the limit (means we've reached the end)
        // Or if total_count is provided and we've fetched all of them
        if (pageProjects.length < limit) {
          hasMore = false;
        } else if (totalCount !== undefined && totalCount > 0) {
          // If total_count is provided, check if we've fetched all
          if ((currentOffset + pageProjects.length) >= totalCount) {
            hasMore = false;
          } else {
            offset = currentOffset + pageProjects.length;
          }
        } else {
          // No total_count, continue fetching until we get fewer than limit
          offset = currentOffset + pageProjects.length;
        }
        
        console.log('[getProjects] Fetched', pageProjects.length, 'projects (total so far:', allProjects.length, ', hasMore:', hasMore, ')');
      }
      
      console.log('[getProjects] Received', allProjects.length, 'total projects from Redmine');

      // OPTIMIZED: Skip recent issues fetch if skipIssueCounts is true (for faster initial load)
      // Only fetch recent issues if we need activity dates
      let lastIssueUpdateByProject = {}; // Track latest issue updated_on per project
      let lastJournalDateByProject = {}; // Track latest journal/comment date per project
      
      if (!options.skipIssueCounts) {
        try {
          // Fetch recent issues (both open and closed) - last 200 issues should cover recent activity
          // Include closed issues to catch task completions
          const recentIssuesEndpoint = url(`/issues.json?limit=200&sort=updated_on:desc&include=journals&status_id=*`);
          const recentIssuesRes = await fetch(recentIssuesEndpoint, { 
            headers,
            signal: options.abortSignal || null
          });
        
          if (recentIssuesRes.ok) {
            const recentIssuesData = await recentIssuesRes.json();
            const recentIssues = recentIssuesData.issues || [];
            
            recentIssues.forEach(issue => {
              const projectId = issue.project?.id;
              if (projectId) {
                // Track latest issue update date
                if (issue.updated_on) {
                  const issueDate = new Date(issue.updated_on);
                  if (!lastIssueUpdateByProject[projectId] || issueDate > new Date(lastIssueUpdateByProject[projectId])) {
                    lastIssueUpdateByProject[projectId] = issue.updated_on;
                  }
                }
                
                // Track latest journal/comment date
                if (issue.journals && Array.isArray(issue.journals)) {
                  issue.journals.forEach(journal => {
                    if (journal.created_on) {
                      const journalDate = new Date(journal.created_on);
                      const currentLast = lastJournalDateByProject[projectId];
                      if (!currentLast || journalDate > new Date(currentLast)) {
                        lastJournalDateByProject[projectId] = journal.created_on;
                      }
                    }
                  });
                }
              }
            });
            
            console.log('[getProjects] Tracked activity dates for', Object.keys(lastIssueUpdateByProject).length, 'projects');
          }
        } catch (activityError) {
          if (activityError.name !== 'AbortError') {
            console.warn('[getProjects] Error fetching recent issues for activity tracking (non-fatal):', activityError);
          }
        }
      }

      // Helper function to format name: First Name + First letter of Last Name
      const formatName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        const firstName = parts[0];
        const lastName = parts[parts.length - 1];
        const lastInitial = lastName.charAt(0).toUpperCase();
        return `${firstName} ${lastInitial}.`;
      };

      // Helper function to extract Project Manager from memberships
      const getProjectManager = (project) => {
        if (!project.memberships || !Array.isArray(project.memberships)) {
          console.log('[getProjectManager] No memberships for project:', project.name);
          return null;
        }
        
        console.log('[getProjectManager] Checking project:', project.name, 'memberships:', project.memberships.length);

        // Infer PM from roles, following backend rule: role id 9 is Project Manager
        for (const membership of project.memberships) {
          const roles = membership.roles || [];
          const user = membership.user || {};

          console.log('[getProjectManager] Membership - user:', user.name, 'roles:', roles.map(r => r.name || r.id));

          const hasProjectManagerRole = roles.some(role => {
            const roleName = (role.name || '').toLowerCase().trim();
            const roleId = Number(role.id);

            // Primary rule (matches backend): role id 9 is Project Manager
            if (roleId === 9) {
              console.log('[getProjectManager] Found Project Manager via role id 9 for user:', user.name);
              return true;
            }

            // Strict matching: Only \"Project Manager\" - not \"Delivery Manager\", \"Account Manager\", etc.
            const isProjectManager =
              roleName === 'project manager' ||
              roleName === 'projectmanager' ||
              roleName.replace(/\\s+/g, '') === 'projectmanager' ||
              (roleName.startsWith('project') && roleName.endsWith('manager') && roleName.length <= 15);

            const isOtherManager =
              roleName.includes('delivery manager') ||
              roleName.includes('account manager') ||
              roleName.includes('program manager') ||
              roleName.includes('product manager') ||
              roleName.includes('technical manager') ||
              roleName.includes('development manager');

            const result = isProjectManager && !isOtherManager;

            if (result) {
              console.log('[getProjectManager] Found Project Manager via role name:', role.name, '(ID:', roleId, ') for user:', user.name);
            }

            return result;
          });

          if (hasProjectManagerRole && user.name) {
            const formattedName = formatName(user.name);
            console.log('[getProjectManager] Returning Project Manager (role fallback):', formattedName, 'for project:', project.name);
            return {
              id: user.id,
              name: formattedName,
              fullName: user.name
            };
          }
        }

        console.log('[getProjectManager] No Project Manager found for project:', project.name);
        return null;
      };

      // Skip issue counting if skipIssueCounts option is set (for performance)
      if (options.skipIssueCounts) {
        // First, try to extract from included memberships
        let projectsWithManagers = allProjects.map(p => {
          const projectManager = getProjectManager(p);
          return {
            project: p,
            projectManager: projectManager,
            needsFetch: !projectManager && !!p.identifier
          };
        });
        
        // Fetch memberships for all projects that still need a project manager
        // (We rely on this to correctly show PM name on "My Projects" cards)
        const projectsNeedingFetch = projectsWithManagers
          .filter(item => item.needsFetch);
        
        if (projectsNeedingFetch.length > 0 && !options.skipMemberships) {
          console.log('[getProjects] Fetching memberships for', projectsNeedingFetch.length, 'projects');
          
          // Fetch memberships in smaller batches to avoid overloading Redmine
          // Use a shared abort signal if provided
          const batchSize = 5;
          const sharedAbortSignal = options.abortSignal || null;
          
          for (let i = 0; i < projectsNeedingFetch.length; i += batchSize) {
            const batch = projectsNeedingFetch.slice(i, i + batchSize);
            // Fetch all memberships in parallel for this batch with a reasonable timeout
            await Promise.all(batch.map(async (item) => {
              const controller = new AbortController();
              // Allow more time for memberships calls – they can be slower on large instances
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              // Combine signals if shared signal is provided
              // Note: AbortSignal.any() might not be available in all browsers, so we check both
              let finalSignal = controller.signal;
              if (sharedAbortSignal) {
                // If shared signal is already aborted, abort our controller too
                if (sharedAbortSignal.aborted) {
                  controller.abort();
                } else {
                  // Listen to shared signal and abort our controller if it aborts
                  sharedAbortSignal.addEventListener('abort', () => controller.abort(), { once: true });
                }
                finalSignal = controller.signal;
              }
              
              try {
                // Use same proxied relative URL pattern as other Redmine API calls
                // so requests go through the CRA dev proxy (avoids CORS/preflight issues)
                const membersEndpoint = url(`/projects/${item.project.identifier}/memberships.json`);
                const membersRes = await fetch(membersEndpoint, { 
                  headers,
                  signal: finalSignal
                });
                clearTimeout(timeoutId);
                
                if (membersRes.ok) {
                  const membersData = await membersRes.json();
                  if (membersData.memberships && Array.isArray(membersData.memberships)) {
                    const projectWithMemberships = { ...item.project, memberships: membersData.memberships };
                    item.projectManager = getProjectManager(projectWithMemberships);
                  }
                }
              } catch (err) {
                clearTimeout(timeoutId);
                if (err.name !== 'AbortError') {
                  console.warn('[getProjects] Could not fetch memberships for project:', item.project.identifier, err);
                }
              }
            }));
            
            // Small delay between batches to prevent overwhelming the server
            if (i + batchSize < projectsNeedingFetch.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
        
        // Helper function to calculate last activity date from project data
        // Note: This is for the skipIssueCounts path, so we don't have issue/journal data yet
        // We'll use project.updated_on as a fallback, but ideally this path should fetch recent issues
        const calculateLastActivity = (project, projectId) => {
          // Activity sources:
          // 1. Task/Issue updates (status changes, assignments, task completion/closing, etc.)
          // 2. Task comments (journals)
          // 3. Daily status updates (if available in API response)
          // Note: Task completion (closing) updates issue.updated_on, so it's tracked here
          
          const activityDates = [];
          
          // Last issue update (from our tracked data if available)
          if (projectId && lastIssueUpdateByProject[projectId]) {
            activityDates.push(new Date(lastIssueUpdateByProject[projectId]));
          }
          
          // Last journal/comment date (from our tracked data if available)
          if (projectId && lastJournalDateByProject[projectId]) {
            activityDates.push(new Date(lastJournalDateByProject[projectId]));
          }
          
          // Daily status updates (if available)
          if (project.last_daily_status_date) {
            activityDates.push(new Date(project.last_daily_status_date));
          }
          
          // Fallback to project updated_on if no specific activity dates
          if (activityDates.length === 0 && project.updated_on) {
            activityDates.push(new Date(project.updated_on));
          }
          
          // If still no dates, use created_on
          if (activityDates.length === 0 && project.created_on) {
            activityDates.push(new Date(project.created_on));
          }
          
          // Return the most recent date
          return activityDates.length > 0 
            ? new Date(Math.max(...activityDates)).toISOString()
            : null;
        };
        
        const transformed = projectsWithManagers.map(item => ({
          id: item.project.id,
          name: item.project.name,
          description: item.project.description || '',
          progress: 0,
          openIssues: 0,
          closedIssues: 0,
          totalIssues: 0,
          status: item.project.status,
          identifier: item.project.identifier,
          projectManager: item.projectManager,
          last_activity_date: calculateLastActivity(item.project, item.project.id),
          updated_on: item.project.updated_on,
          created_on: item.project.created_on
        }));
        
        console.log('[getProjects] Returning', transformed.length, 'projects without issue counts');
        return transformed;
      }

      // Fetch open and closed issues to compute counts AND track last activity dates
      let openIssueCountsByProject = {};
      let closedIssueCountsByProject = {};
      // Note: lastIssueUpdateByProject and lastJournalDateByProject are already declared above
      
      // Fetch recent issues (both open and closed) to get activity dates
      // We'll fetch recent issues to get the latest activity, not all issues
      try {
        // Fetch recent issues (both open and closed) - last 200 issues should cover recent activity
        // Include closed issues to catch task completions
        const recentIssuesEndpoint = url(`/issues.json?limit=200&sort=updated_on:desc&include=journals&status_id=*`);
        const recentIssuesRes = await fetch(recentIssuesEndpoint, { headers });
        
        if (recentIssuesRes.ok) {
          const recentIssuesData = await recentIssuesRes.json();
          const recentIssues = recentIssuesData.issues || [];
          
          recentIssues.forEach(issue => {
            const projectId = issue.project?.id;
            if (projectId) {
              // Track issue counts
              if (issue.status?.id === 1 || issue.status?.name === 'New' || issue.status?.name === 'In Progress') {
                openIssueCountsByProject[projectId] = (openIssueCountsByProject[projectId] || 0) + 1;
              } else {
                closedIssueCountsByProject[projectId] = (closedIssueCountsByProject[projectId] || 0) + 1;
              }
              
              // Track latest issue update date
              if (issue.updated_on) {
                const issueDate = new Date(issue.updated_on);
                if (!lastIssueUpdateByProject[projectId] || issueDate > new Date(lastIssueUpdateByProject[projectId])) {
                  lastIssueUpdateByProject[projectId] = issue.updated_on;
                }
              }
              
              // Track latest journal/comment date
              if (issue.journals && Array.isArray(issue.journals)) {
                issue.journals.forEach(journal => {
                  if (journal.created_on) {
                    const journalDate = new Date(journal.created_on);
                    const currentLast = lastJournalDateByProject[projectId];
                    if (!currentLast || journalDate > new Date(currentLast)) {
                      lastJournalDateByProject[projectId] = journal.created_on;
                    }
                  }
                });
              }
            }
          });
        }
      } catch (recentIssuesError) {
        console.warn('[getProjects] Error fetching recent issues for activity tracking (non-fatal):', recentIssuesError);
      }
      
      // Fetch open issues for accurate counts (if we didn't get enough from recent issues)
      try {
        let issueOffset = 0;
        let hasMoreIssues = true;
        const issueLimit = 100;
        const maxIssuesToFetch = 500; // Limit to avoid performance issues
        
        while (hasMoreIssues && issueOffset < maxIssuesToFetch) {
          const issuesEndpoint = url(`/issues.json?status_id=open&limit=${issueLimit}&offset=${issueOffset}&include=journals`);
        const issuesRes = await fetch(issuesEndpoint, { headers });
        
        if (issuesRes.ok) {
          const issuesData = await issuesRes.json();
            const issues = issuesData.issues || [];
            
            issues.forEach(issue => {
            const projectId = issue.project?.id;
            if (projectId) {
                openIssueCountsByProject[projectId] = (openIssueCountsByProject[projectId] || 0) + 1;
                
                // Track latest issue update date
                if (issue.updated_on) {
                  const issueDate = new Date(issue.updated_on);
                  if (!lastIssueUpdateByProject[projectId] || issueDate > new Date(lastIssueUpdateByProject[projectId])) {
                    lastIssueUpdateByProject[projectId] = issue.updated_on;
                  }
                }
                
                // Track latest journal/comment date
                if (issue.journals && Array.isArray(issue.journals)) {
                  issue.journals.forEach(journal => {
                    if (journal.created_on) {
                      const journalDate = new Date(journal.created_on);
                      const currentLast = lastJournalDateByProject[projectId];
                      if (!currentLast || journalDate > new Date(currentLast)) {
                        lastJournalDateByProject[projectId] = journal.created_on;
                      }
                    }
                  });
                }
              }
            });
            
            // Check if there are more issues
            if (issues.length < issueLimit) {
              hasMoreIssues = false;
        } else {
              issueOffset += issues.length;
            }
          } else {
            console.warn('[getProjects] Could not fetch open issues:', issuesRes.status);
            hasMoreIssues = false;
          }
        }
      } catch (issuesError) {
        console.warn('[getProjects] Error fetching open issues (non-fatal):', issuesError);
      }
      
      // Fetch closed issues for accurate counts
      try {
        let issueOffset = 0;
        let hasMoreIssues = true;
        const issueLimit = 100;
        const maxIssuesToFetch = 500; // Limit to avoid performance issues
        
        while (hasMoreIssues && issueOffset < maxIssuesToFetch) {
          const issuesEndpoint = url(`/issues.json?status_id=closed&limit=${issueLimit}&offset=${issueOffset}&include=journals`);
          const issuesRes = await fetch(issuesEndpoint, { headers });
          
          if (issuesRes.ok) {
            const issuesData = await issuesRes.json();
            const issues = issuesData.issues || [];
            
            issues.forEach(issue => {
              const projectId = issue.project?.id;
              if (projectId) {
                closedIssueCountsByProject[projectId] = (closedIssueCountsByProject[projectId] || 0) + 1;
                
                // Track latest issue update date
                if (issue.updated_on) {
                  const issueDate = new Date(issue.updated_on);
                  if (!lastIssueUpdateByProject[projectId] || issueDate > new Date(lastIssueUpdateByProject[projectId])) {
                    lastIssueUpdateByProject[projectId] = issue.updated_on;
                  }
                }
                
                // Track latest journal/comment date
                if (issue.journals && Array.isArray(issue.journals)) {
                  issue.journals.forEach(journal => {
                    if (journal.created_on) {
                      const journalDate = new Date(journal.created_on);
                      const currentLast = lastJournalDateByProject[projectId];
                      if (!currentLast || journalDate > new Date(currentLast)) {
                        lastJournalDateByProject[projectId] = journal.created_on;
                      }
                    }
                  });
                }
              }
            });
            
            // Check if there are more issues
            if (issues.length < issueLimit) {
              hasMoreIssues = false;
            } else {
              issueOffset += issues.length;
            }
          } else {
            console.warn('[getProjects] Could not fetch closed issues:', issuesRes.status);
            hasMoreIssues = false;
          }
        }
        
        console.log('[getProjects] Issue counts and activity dates computed for', Object.keys(openIssueCountsByProject).length, 'projects');
      } catch (issuesError) {
        console.warn('[getProjects] Error fetching closed issues (non-fatal):', issuesError);
      }

      // Transform Redmine projects to match component expectations
      // (Helper functions formatName and getProjectManager are already defined above)
      // First, try to extract from included memberships
      let projectsWithManagers = allProjects.map(p => {
        const projectManager = getProjectManager(p);
        return {
          project: p,
          projectManager: projectManager,
          needsFetch: !projectManager && !!p.identifier
        };
      });
      
      // Fetch memberships separately for projects that need it (limit to first 50 for performance)
      const projectsNeedingFetch = projectsWithManagers
        .filter(item => item.needsFetch)
        .slice(0, 50);
      
      if (projectsNeedingFetch.length > 0) {
        console.log('[getProjects] Fetching memberships for', projectsNeedingFetch.length, 'projects');
        
        // Fetch in parallel batches of 10
        const batchSize = 10;
        for (let i = 0; i < projectsNeedingFetch.length; i += batchSize) {
          const batch = projectsNeedingFetch.slice(i, i + batchSize);
          await Promise.all(batch.map(async (item) => {
          try {
            // Use same proxied relative URL pattern as other Redmine API calls
            const membersEndpoint = url(`/projects/${item.project.identifier}/memberships.json`);
            const membersRes = await fetch(membersEndpoint, { 
              headers
            });
              if (membersRes.ok) {
                const membersData = await membersRes.json();
                if (membersData.memberships && Array.isArray(membersData.memberships)) {
                  const projectWithMemberships = { ...item.project, memberships: membersData.memberships };
                  item.projectManager = getProjectManager(projectWithMemberships);
                }
              }
            } catch (err) {
              console.warn('[getProjects] Could not fetch memberships for project:', item.project.identifier, err);
            }
          }));
        }
      }
      
      // Helper function to calculate last activity date from project data
      const calculateLastActivity = (project, projectId) => {
        // Activity sources (in priority order):
        // 1. Task/Issue updates (status changes, assignments, task completion/closing, etc.)
        // 2. Task comments (journals)
        // 3. Daily status updates (if available)
        // Note: We do NOT track wiki, documents, news, or project settings changes
        // Note: Task completion (closing) updates issue.updated_on, so it's tracked here
        
        const activityDates = [];
        
        // Last issue update (from our tracked data)
        if (projectId && lastIssueUpdateByProject[projectId]) {
          activityDates.push(new Date(lastIssueUpdateByProject[projectId]));
        }
        
        // Last journal/comment date (from our tracked data)
        if (projectId && lastJournalDateByProject[projectId]) {
          activityDates.push(new Date(lastJournalDateByProject[projectId]));
        }
        
        // Daily status updates (if available in API response)
        if (project.last_daily_status_date) {
          activityDates.push(new Date(project.last_daily_status_date));
        }
        
        // Fallback to project updated_on (may reflect issue updates)
        if (activityDates.length === 0 && project.updated_on) {
          activityDates.push(new Date(project.updated_on));
        }
        
        // Final fallback to created_on
        if (activityDates.length === 0 && project.created_on) {
          activityDates.push(new Date(project.created_on));
        }
        
        // Return the most recent date as ISO string
        return activityDates.length > 0 
          ? new Date(Math.max(...activityDates)).toISOString()
          : null;
      };
      
      const transformed = projectsWithManagers.map(item => {
        const p = item.project;
        
        // If it's already in our format (has openIssues), it might be mock - but use it anyway
        if (p.openIssues !== undefined && p.progress !== undefined) {
          return {
            ...p,
            projectManager: item.projectManager || p.projectManager || null,
            last_activity_date: calculateLastActivity(p, p.id)
          };
        }
        
        // Calculate completion percentage based on closed vs total issues
        const openCount = openIssueCountsByProject[p.id] || 0;
        const closedCount = closedIssueCountsByProject[p.id] || 0;
        const totalIssues = openCount + closedCount;
        const completionPercentage = totalIssues > 0 ? (closedCount / totalIssues) : 0;
        
        // Transform from Redmine format
        return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          progress: completionPercentage, // Completion based on closed/total issues
          openIssues: openCount,
          closedIssues: closedCount,
          totalIssues: totalIssues,
          status: p.status, // 1=active, 5=closed, 9=archived
          identifier: p.identifier,
          projectManager: item.projectManager,
          last_activity_date: calculateLastActivity(p, p.id),
          updated_on: p.updated_on,
          created_on: p.created_on
        };
      });
      
      console.log('[getProjects] Returning', transformed.length, 'transformed projects');
      return transformed;
      
    } catch (error) {
      console.error('[getProjects] Error fetching from Redmine:', error);
      // When authenticated, NEVER fall back to mock - throw the error
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }
  
  // No auth - use mock fallback
  console.log('[getProjects] No auth detected, using mock data');
  const res = await fetch('/projects.json');
  const data = await res.json();
  return data.projects || [];
}

// Check if response is from Redmine API (has identifier field) vs mock (has openIssues/progress)
function isRedmineResponse(project) {
  return project && (project.identifier !== undefined || project.status !== undefined);
}

export async function getProject(projectName) {
  // If authenticated, fetch from Redmine REST API
  if (hasAuth()) {
    try {
      // Try by identifier first (more reliable)
      // Include memberships to get members and their roles
      const endpoint = url(`/projects/${projectName}.json?include=memberships`);
      const headers = getAuthHeaders();
      console.log('[getProject] Fetching project:', endpoint);
      const res = await fetch(endpoint, { headers });
      
      if (res.ok) {
        const data = await res.json();
        const project = data.project;
        console.log('[getProject] Full project response:', project);
        
        // Transform Redmine project to include widgets and members
        // Fetch members if available - Redmine returns memberships with user and roles
        let members = [];
        
        // Check if memberships are in the project object
        if (project.memberships && Array.isArray(project.memberships)) {
          console.log('[getProject] Raw memberships found:', project.memberships);
          // Redmine memberships structure: { user: { id, name, ... }, roles: [{ id, name, ... }] }
          project.memberships.forEach(membership => {
            const user = membership.user || {};
            const roles = membership.roles || [];
            
            console.log('[getProject] Processing membership:', { user, roles });
            
            // If user has multiple roles, create an entry for each role
            if (roles.length > 0) {
              roles.forEach(role => {
                members.push({
                  id: user.id || membership.id,
                  name: user.name || membership.name || 'Unknown',
                  email: user.mail || user.email || null,
                  role: {
                    id: role.id,
                    name: role.name
                  }
                });
              });
            } else {
              // If no roles, still add the member
              members.push({
                id: user.id || membership.id,
                name: user.name || membership.name || 'Unknown',
                email: user.mail || user.email || null,
                role: null
              });
            }
          });
          console.log('[getProject] Processed members from memberships:', members);
        } else {
          // Try to fetch memberships separately if not included
          console.log('[getProject] No memberships in response, trying separate endpoint...');
          try {
            const membersEndpoint = url(`/projects/${projectName}/memberships.json`);
            const membersRes = await fetch(membersEndpoint, { headers });
            if (membersRes.ok) {
              const membersData = await membersRes.json();
              console.log('[getProject] Memberships from separate endpoint:', membersData);
              if (membersData.memberships && Array.isArray(membersData.memberships)) {
                membersData.memberships.forEach(membership => {
                  const user = membership.user || {};
                  const roles = membership.roles || [];
                  
                  if (roles.length > 0) {
                    roles.forEach(role => {
                      members.push({
                        id: user.id || membership.id,
                        name: user.name || membership.name || 'Unknown',
                        email: user.mail || user.email || null,
                        role: {
                          id: role.id,
                          name: role.name
                        }
                      });
                    });
                  } else {
                    members.push({
                      id: user.id || membership.id,
                      name: user.name || membership.name || 'Unknown',
                      email: user.mail || user.email || null,
                      role: null
                    });
                  }
                });
                console.log('[getProject] Processed members from separate endpoint:', members);
              }
            }
          } catch (membersError) {
            console.warn('[getProject] Could not fetch memberships separately:', membersError);
          }
        }
        
        // Create widgets from project data
        const widgets = [
          { id: 'w1', type: 'kpi', title: 'Open Issues', value: 0 }, // Will be updated by getIssues
          { id: 'w2', type: 'kpi', title: 'Total Issues', value: 0 }
        ];
        
        const result = {
          ...project,
          members: members.length > 0 ? members : (project.members || []),
          widgets: project.widgets || widgets
        };
        console.log('[getProject] Returning project with members:', result.members);
        return result;
      }
      throw new Error(`Project not found: ${projectName}`);
    } catch (error) {
      console.error('[getProject] Error:', error);
      if (!baseUrl) {
        // Fallback to mock
        const res = await fetch(url('/projects_projectA.json'));
        const data = await res.json();
        return data.project;
      }
      throw error;
    }
  }
  
  // Mock fallback
  const res = await fetch(url('/projects_projectA.json'));
  const data = await res.json();
  return data.project;
}

export async function getIssues(projectId) {
  // If authenticated, fetch from Redmine REST API
  if (hasAuth()) {
    try {
      // Fetch ALL issues (not just open) for complete statistics
      const endpoint = url(`/issues.json?project_id=${projectId}&limit=100`);
      const headers = getAuthHeaders();
      console.log('[getIssues] Fetching issues for project:', projectId);
      const res = await fetch(endpoint, { headers });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch issues: ${res.status}`);
      }
      const data = await res.json();
      const issues = data.issues || [];
      
      // Transform Redmine issues to match component expectations
      return issues.map(issue => ({
        id: issue.id,
        subject: issue.subject,
        status: issue.status?.name || issue.status || 'Unknown',
        priority: issue.priority?.name || issue.priority || null,
        assignee: issue.assigned_to ? {
          id: issue.assigned_to.id,
          name: issue.assigned_to.name
        } : null,
        dueDate: issue.due_date || null
      }));
    } catch (error) {
      console.error('[getIssues] Error:', error);
      if (!baseUrl) {
        // Fallback to mock
        const res = await fetch(url('/issues_projectA.json'));
        const data = await res.json();
        return data.issues;
      }
      throw error;
    }
  }
  
  // Mock fallback
  const res = await fetch(url('/issues_projectA.json'));
  const data = await res.json();
  return data.issues;
}

export async function createIssue(payload) {
  // mock create: return payload with id
  return { status: 'ok', issue: { id: Math.floor(Math.random()*10000), ...payload } };
}

export async function updateIssue(id, payload) {
  // mock update
  return { status: 'ok', issue: { id, ...payload } };
}

export async function updateUserProfile(userId, payload) {
  if (!userId) {
    throw new Error('Missing user id');
  }

  if (hasAuth()) {
    try {
      const headers = getAuthHeaders();
      
      // MyController#account accepts API format (format.api) which doesn't require CSRF token
      // Use .json extension in URL so api_request? returns true (checks params[:format])
      const accountEndpoint = url('/my/account.json');
      
      // Prepare user update payload
      // gitlab_token is now a direct column in users table (from redmine_scm plugin), not a custom field
      const gitlabToken = payload.gitlab_token !== undefined ? payload.gitlab_token : (payload.gitlab_access_token !== undefined ? payload.gitlab_access_token : null);
      
      const userPayload = {
        firstname: payload.firstname,
        lastname: payload.lastname,
        mail: payload.mail,
        language: payload.language
      };
      
      // Add gitlab_token directly to user payload if provided
      if (gitlabToken !== null && gitlabToken !== undefined) {
        userPayload.gitlab_token = gitlabToken;
        console.log('[updateUserProfile] GitLab token included in user payload:', gitlabToken ? '***' : '(empty)');
      }
      
      // Prepare preference payload
      const prefPayload = {};
      if (payload.pref) {
        const pref = payload.pref;
        
        // Mail notification
        if (pref.mail_notification) {
          userPayload.mail_notification = pref.mail_notification;
        }
        if (pref.notified_project_ids) {
          userPayload.notified_project_ids = Array.isArray(pref.notified_project_ids) 
            ? pref.notified_project_ids.filter(id => id) 
            : [pref.notified_project_ids].filter(id => id);
        }
        
        // Preference fields
        if (pref.notify_about_high_priority_issues !== undefined) {
          prefPayload.notify_about_high_priority_issues = pref.notify_about_high_priority_issues;
        }
        if (pref.no_self_notified !== undefined) {
          prefPayload.no_self_notified = pref.no_self_notified;
        }
        if (pref.auto_watch_on !== undefined) {
          prefPayload.auto_watch_on = Array.isArray(pref.auto_watch_on) 
            ? pref.auto_watch_on.filter(val => val) 
            : pref.auto_watch_on;
        }
        if (pref.hide_mail !== undefined) {
          prefPayload.hide_mail = pref.hide_mail;
        }
        // Always include time_zone if present (even if empty string)
        if (pref.time_zone !== undefined) {
          prefPayload.time_zone = pref.time_zone;
        }
        // Always include comments_sorting if present (even if empty string)
        if (pref.comments_sorting !== undefined) {
          prefPayload.comments_sorting = pref.comments_sorting;
        }
        if (pref.warn_on_leaving_unsaved !== undefined) {
          prefPayload.warn_on_leaving_unsaved = pref.warn_on_leaving_unsaved;
        }
        if (pref.textarea_font !== undefined) {
          prefPayload.textarea_font = pref.textarea_font;
        }
        if (pref.recently_used_projects) {
          prefPayload.recently_used_projects = pref.recently_used_projects;
        }
        if (pref.history_default_tab) {
          prefPayload.history_default_tab = pref.history_default_tab;
        }
        if (pref.toolbar_language_options) {
          prefPayload.toolbar_language_options = pref.toolbar_language_options;
        }
        if (pref.default_issue_query !== undefined) {
          prefPayload.default_issue_query = pref.default_issue_query;
        }
        if (pref.default_project_query !== undefined) {
          prefPayload.default_project_query = pref.default_project_query;
        }
        if (pref.dmsf_tree_view !== undefined) {
          prefPayload.dmsf_tree_view = pref.dmsf_tree_view;
        }
      }
      
      // Build JSON payload matching Rails params structure
      const jsonPayload = {
        user: userPayload
      };
      
      if (Object.keys(prefPayload).length > 0) {
        jsonPayload.pref = prefPayload;
      }

      console.log('[updateUserProfile] Updating via /my/account.json with JSON (API format)');
      console.log('[updateUserProfile] Payload structure:', {
        user: {
          ...userPayload,
          gitlab_token: userPayload.gitlab_token ? '***' : '(not included)'
        },
        pref: prefPayload
      });
      console.log('[updateUserProfile] Time zone value:', prefPayload.time_zone);
      console.log('[updateUserProfile] Comments sorting value:', prefPayload.comments_sorting);

      // Send as JSON with Accept: application/json to use API format (no CSRF required)
      const accountRes = await fetch(accountEndpoint, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Accept': 'application/json' // Request API format
        },
        body: JSON.stringify(jsonPayload)
      });

      if (!accountRes.ok) {
        const errorText = await accountRes.text();
        console.error('[updateUserProfile] Account update error:', accountRes.status, errorText);
        throw new Error(`Failed to update account (${accountRes.status}): ${errorText}`);
      }

      console.log('[updateUserProfile] Account updated successfully');
      
      // Fetch updated user to return complete data (gitlab_token is now a direct column)
      try {
        const updatedUserRes = await fetch(url(`/users/current.json`), { headers });
        if (updatedUserRes.ok) {
          const updatedUserData = await updatedUserRes.json();
          const updatedUser = updatedUserData.user || {};
          
          // gitlab_token is now a direct attribute, not a custom field
          const extractedGitlabToken = updatedUser.gitlab_token || '';
          
          return {
            status: 'ok',
            user: {
              ...updatedUser,
              gitlab_token: extractedGitlabToken,
              gitlab_access_token: extractedGitlabToken, // Keep for backward compatibility
              pref: payload.pref || updatedUser.pref
            }
          };
        }
      } catch (fetchError) {
        console.warn('[updateUserProfile] Could not fetch updated user:', fetchError);
      }
      
      // Return data with updated fields
      return {
        status: 'ok',
        user: {
          firstname: payload.firstname,
          lastname: payload.lastname,
          mail: payload.mail,
          language: payload.language,
          gitlab_token: gitlabToken || '',
          gitlab_access_token: gitlabToken || '', // Keep for backward compatibility
          pref: payload.pref
        }
      };
    } catch (error) {
      console.error('[updateUserProfile] Error:', error);
      throw error;
    }
  }

  // For mock fallback simply resolve
  return { status: 'ok', user: { id: userId, ...payload } };
}

/**
 * Search Redmine content (issues, documents, changesets, etc.)
 * @param {Object} options - Search options
 * @param {string} options.q - Search query
 * @param {string} options.scope - Search scope: 'all', 'my_projects', 'bookmarks', 'subprojects', or project identifier
 * @param {boolean} options.all_words - Match all words (default: true)
 * @param {boolean} options.titles_only - Search titles only (default: false)
 * @param {string} options.attachments - Attachment search: '0' (no), '1' (yes), 'only' (only attachments)
 * @param {boolean} options.open_issues - Search open issues only (default: false)
 * @param {Array<string>} options.types - Content types to search: ['issues', 'news', 'documents', 'changesets', 'wiki_pages', 'messages', 'boards', 'files']
 * @param {number} options.limit - Results per page (default: 25)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} Search results
 */
export async function search(options = {}) {
  if (!hasAuth()) {
    throw new Error('Not authenticated');
  }

  try {
    const params = new URLSearchParams();
    
    if (options.q) {
      params.append('q', options.q);
    }
    
    if (options.scope) {
      params.append('scope', options.scope);
    }
    
    if (options.all_words !== undefined) {
      params.append('all_words', options.all_words ? '1' : '');
    } else {
      params.append('all_words', '1'); // Default to true
    }
    
    if (options.titles_only) {
      params.append('titles_only', '1');
    }
    
    if (options.attachments) {
      params.append('attachments', options.attachments);
    } else {
      params.append('attachments', '0'); // Default to no attachment search
    }
    
    if (options.open_issues) {
      params.append('open_issues', '1');
    }
    
    // Add content type filters
    // Redmine expects: documents=1&issues=1 (not types=documents,issues)
    if (options.types && Array.isArray(options.types) && options.types.length > 0) {
      options.types.forEach(type => {
        params.append(type, '1');
      });
      console.log('[search] Adding type filters:', options.types);
    }
    
    // Pagination
    if (options.limit) {
      params.append('limit', String(options.limit));
    }
    if (options.offset) {
      params.append('offset', String(options.offset));
    }
    
    // Request JSON format
    params.append('format', 'json');
    
    // Build endpoint: if scope is a project identifier, use project-scoped search
    // Otherwise use global search
    let searchPath = '/search.json';
    if (options.scope && options.scope.trim() && 
        options.scope !== 'all' && 
        options.scope !== 'my_projects' && 
        options.scope !== 'bookmarks' && 
        options.scope !== 'subprojects') {
      // Scope is a project identifier - use project-scoped endpoint
      searchPath = `/projects/${encodeURIComponent(options.scope)}/search.json`;
      // Don't delete scope from params - Redmine might need it
      // But we'll use the path-based project selection
    } else if (options.scope === 'all' || !options.scope) {
      // Global search - no project scope
      // Don't add scope param
    } else {
      // Special scopes like 'my_projects', 'bookmarks', 'subprojects'
      // These go in the scope param
    }
    
    const endpoint = url(`${searchPath}?${params.toString()}`);
    const headers = getAuthHeaders();
    
    console.log('[search] Fetching:', endpoint);
    console.log('[search] Full URL with params:', `${searchPath}?${params.toString()}`);
    console.log('[search] Search options:', options);
    const res = await fetch(endpoint, { headers });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[search] Error response:', res.status, res.statusText, errorText);
      throw new Error(`Search failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('[search] Response data:', data);
    return data;
  } catch (error) {
    console.error('[search] Error:', error);
    throw error;
  }
}
