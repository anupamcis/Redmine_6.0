const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to Redmine
  // IMPORTANT: Only proxy API endpoints (those ending in .json or specific API paths)
  // This prevents the proxy from intercepting React Router routes
  
  const proxyOptions = {
    target: 'http://localhost:4000',
    changeOrigin: true,
    logLevel: 'debug',
    secure: false,
    cookieDomainRewrite: '',
    cookiePathRewrite: '/',
    onProxyReq: (proxyReq, req, res) => {
      console.log('[Proxy] Proxying', req.method, req.url, '→ http://localhost:4000' + req.url);
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }
      // Forward Authorization header if present
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log('[Proxy] Response:', proxyRes.statusCode, 'for', req.url);
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }
    },
    onError: (err, req, res) => {
      console.error('[Proxy] Error proxying', req.url, ':', err.message);
      res.status(500).json({ error: 'Proxy error: ' + err.message });
    }
  };
  
  // Filter function: only proxy API requests (ending in .json or specific API paths)
  const apiFilter = (pathname, req) => {
    // Proxy if:
    // 1. Ends with .json
    // 2. Is /users/current or /users/:id
    // 3. Is /issues/:id
    // 4. Is /projects/:id/daily_statuses.json or related API paths
    // 5. Is /projects/:id/recipients.json
    // 6. Is /projects/:id/daily_statuses/:id.json
    // 7. Is /projects/:id/daily_statuses/:id/daily_status_replies.json
    // 8. Is /projects/:id/milestones.json (milestones API)
    // 9. Is /issue_statuses.json, /enumerations/*, /custom_fields.json (metadata APIs)
    // 10. Is /projects/:id/versions.json, /projects/:id/memberships.json
    
    const isJsonApi = pathname.endsWith('.json');
    const isUsersApi = pathname.startsWith('/users/');
    const isIssuesApi = pathname.startsWith('/issues/');
    const isDailyStatusApi = pathname.includes('/daily_statuses') && isJsonApi;
    const isRecipientsApi = pathname.includes('/recipients.json');
    const isMilestonesApi = pathname.includes('/milestones') && isJsonApi;
    const isEnumerationsApi = pathname.startsWith('/enumerations/');
    const isCustomFieldsApi = pathname.includes('/custom_fields');
    const isProjectsApi = pathname.startsWith('/projects/') && isJsonApi;
    const isIssueStatusesApi = pathname === '/issue_statuses.json';
    
    // Log what we're checking
    if (isJsonApi || isUsersApi || isIssuesApi) {
      console.log('[Proxy Filter] Checking:', pathname, {
        isJsonApi,
        isUsersApi,
        isIssuesApi,
        isDailyStatusApi,
        isRecipientsApi,
        isMilestonesApi,
        isEnumerationsApi,
        isCustomFieldsApi,
        isProjectsApi,
        isIssueStatusesApi
      });
    }
    
    // Don't proxy React routes (no .json extension and not a known API path)
    if (!isJsonApi && !isUsersApi && !isIssuesApi && !isDailyStatusApi && !isRecipientsApi && !isMilestonesApi) {
      return false;
    }
    
    return true;
  };
  
  // Apply proxy with filter
  app.use(
    createProxyMiddleware(apiFilter, proxyOptions)
  );
};
