# Redmine API Mapping for Frontend Implementation

This document maps the UI components and pages to their corresponding Redmine REST API endpoints. This serves as a guide for frontend developers implementing the new design system.

## Base API Configuration

- **Base URL**: `https://your-redmine-instance.com`
- **API Version**: v1 (default)
- **Authentication**: API Key or Basic Auth
- **Content-Type**: `application/json`

## Authentication

### Login/Token Entry
- **UI Component**: Login form, API key input
- **API Endpoint**: `POST /login.json`
- **Alternative**: API key validation via `GET /users/current.json`

```javascript
// Example API call
const response = await fetch('/users/current.json', {
  headers: {
    'X-Redmine-API-Key': 'your-api-key'
  }
});
```

## Projects Module

### Projects List
- **UI Component**: Projects grid, project cards
- **API Endpoint**: `GET /projects.json`
- **Query Parameters**:
  - `limit`: Number of projects per page
  - `offset`: Pagination offset
  - `status`: Project status filter
  - `name`: Search by project name

```javascript
// Example API call
const projects = await fetch('/projects.json?limit=20&status=1').then(r => r.json());
```

### Project Details
- **UI Component**: Project detail page, project overview
- **API Endpoint**: `GET /projects/{id}.json`
- **Includes**: `trackers`, `issue_categories`, `enabled_modules`

```javascript
// Example API call
const project = await fetch('/projects/123.json?include=trackers,issue_categories,enabled_modules').then(r => r.json());
```

### Project Members
- **UI Component**: Project members list, member management
- **API Endpoint**: `GET /projects/{id}/memberships.json`

### Project Settings
- **UI Component**: Project settings form
- **API Endpoint**: `PUT /projects/{id}.json`

## Issues Module

### Issues List
- **UI Component**: Issues table, board view
- **API Endpoint**: `GET /issues.json`
- **Query Parameters**:
  - `project_id`: Filter by project
  - `status_id`: Filter by status
  - `assigned_to_id`: Filter by assignee
  - `priority_id`: Filter by priority
  - `tracker_id`: Filter by tracker
  - `subject`: Search by subject
  - `limit`: Number of issues per page
  - `offset`: Pagination offset
  - `sort`: Sort order (e.g., `priority:desc,updated_on:desc`)

```javascript
// Example API call
const issues = await fetch('/issues.json?project_id=123&status_id=open&limit=50&sort=priority:desc').then(r => r.json());
```

### Issue Details
- **UI Component**: Issue detail panel, issue view
- **API Endpoint**: `GET /issues/{id}.json`
- **Includes**: `journals`, `watchers`, `attachments`, `relations`

```javascript
// Example API call
const issue = await fetch('/issues/1234.json?include=journals,watchers,attachments,relations').then(r => r.json());
```

### Create Issue
- **UI Component**: Issue creation modal, new issue form
- **API Endpoint**: `POST /issues.json`

```javascript
// Example API call
const newIssue = await fetch('/issues.json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Redmine-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    issue: {
      project_id: 123,
      subject: 'New Issue Title',
      description: 'Issue description',
      tracker_id: 1,
      status_id: 1,
      priority_id: 2,
      assigned_to_id: 456
    }
  })
}).then(r => r.json());
```

### Update Issue
- **UI Component**: Issue edit form, inline editing
- **API Endpoint**: `PUT /issues/{id}.json`

### Bulk Update Issues
- **UI Component**: Bulk actions, multi-select
- **API Endpoint**: `PUT /issues.json`

### Issue Relations
- **UI Component**: Related issues, issue dependencies
- **API Endpoint**: `GET /issues/{id}/relations.json`

### Issue Journals (Comments)
- **UI Component**: Comments section, activity log
- **API Endpoint**: `GET /issues/{id}/journals.json`

## Dashboard Module

### User Dashboard Data
- **UI Component**: Dashboard widgets, KPI cards
- **API Endpoints**: Multiple endpoints combined
  - Recent issues: `GET /issues.json?assigned_to_id=me&limit=10`
  - My projects: `GET /projects.json?membership=true`
  - Issue statistics: `GET /issues.json` with various filters

### Activity Feed
- **UI Component**: Recent activity, activity timeline
- **API Endpoint**: `GET /activities.json`

## Users Module

### Users List
- **UI Component**: Users table, user management
- **API Endpoint**: `GET /users.json`

### Current User
- **UI Component**: User profile, user menu
- **API Endpoint**: `GET /users/current.json`

### User Details
- **UI Component**: User profile page
- **API Endpoint**: `GET /users/{id}.json`

## Search Module

### Global Search
- **UI Component**: Search bar, search results
- **API Endpoint**: `GET /search.json`
- **Query Parameters**:
  - `q`: Search query
  - `scope`: Search scope (all, issues, projects, etc.)
  - `limit`: Number of results

```javascript
// Example API call
const searchResults = await fetch('/search.json?q=bug&scope=all&limit=20').then(r => r.json());
```

## File Attachments

### Upload File
- **UI Component**: File upload, attachment form
- **API Endpoint**: `POST /uploads.json`

### Download File
- **UI Component**: File download links
- **API Endpoint**: `GET /attachments/{id}/{filename}`

## Time Tracking

### Time Entries
- **UI Component**: Time logging, time reports
- **API Endpoint**: `GET /time_entries.json`

### Create Time Entry
- **UI Component**: Time entry form
- **API Endpoint**: `POST /time_entries.json`

## Custom Fields

### Custom Field Values
- **UI Component**: Custom field inputs, dynamic forms
- **API Endpoint**: `GET /custom_fields.json`

## Error Handling

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Unprocessable Entity
- `500`: Internal Server Error

### Error Response Format
```json
{
  "errors": ["Error message 1", "Error message 2"]
}
```

## Rate Limiting

- **Rate Limit**: 100 requests per minute per API key
- **Headers**: `X-Redmine-API-Key` required for all requests
- **Response Headers**: Check `X-RateLimit-Limit` and `X-RateLimit-Remaining`

## Pagination

### Standard Pagination
- **Parameters**: `limit`, `offset`
- **Response Headers**: `X-Total-Count`, `X-Offset`, `X-Limit`

### Example Pagination Implementation
```javascript
const loadIssues = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  const response = await fetch(`/issues.json?limit=${limit}&offset=${offset}`);
  const data = await response.json();
  
  return {
    issues: data.issues,
    totalCount: response.headers.get('X-Total-Count'),
    currentPage: page,
    totalPages: Math.ceil(response.headers.get('X-Total-Count') / limit)
  };
};
```

## Real-time Updates

### WebSocket Integration
- **WebSocket URL**: `wss://your-redmine-instance.com/websocket`
- **Events**: `issue_updated`, `issue_created`, `issue_deleted`

### Polling Alternative
- **Interval**: 30 seconds for active pages
- **Endpoint**: `GET /issues.json?updated_on=>={last_update}`

## Implementation Notes

1. **Authentication**: Store API key securely (localStorage with encryption or secure cookies)
2. **Caching**: Implement client-side caching for frequently accessed data
3. **Error Handling**: Provide user-friendly error messages for common API errors
4. **Loading States**: Show loading indicators during API calls
5. **Offline Support**: Consider implementing offline capabilities for critical features
6. **Performance**: Use pagination and lazy loading for large datasets
7. **Accessibility**: Ensure all API-driven content is accessible to screen readers

## Testing

### API Testing Endpoints
- **Test Connection**: `GET /users/current.json`
- **Test Permissions**: `GET /projects.json` (should return user's accessible projects)
- **Test Search**: `GET /search.json?q=test`

### Mock Data
For development and testing, use the provided mock data files:
- `mock-projects.json`
- `mock-issues.json`
- `mock-users.json`
