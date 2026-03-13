# Authentication Module - Requirements

## 1. Overview
The authentication module handles user login, session management, and credential persistence for the Redmine frontend application connecting to the upgraded Redmine 6.0.7 backend.

## 2. User Stories

### 2.1 User Login
**As a** user  
**I want to** log in with my Redmine credentials  
**So that** I can access my projects and tasks

### 2.2 Session Persistence
**As a** user  
**I want to** remain logged in across browser sessions  
**So that** I don't have to re-enter credentials frequently

### 2.3 Automatic Session Restoration
**As a** user  
**I want to** have my session automatically restored when I return  
**So that** I can continue working seamlessly

### 2.4 Secure Logout
**As a** user  
**I want to** securely log out of the application  
**So that** my account remains protected

### 2.5 GitLab Token Integration
**As a** user with GitLab integration  
**I want to** have my GitLab token automatically retrieved  
**So that** I can access GitLab-integrated features

## 3. Acceptance Criteria

### 3.1 Login Functionality
- System accepts username and password
- System validates credentials against Redmine backend using Basic Auth
- System retrieves user profile including API key and GitLab token
- System stores credentials securely in localStorage
- System handles authentication failures gracefully
- System redirects to home page on successful login

### 3.2 Session Management
- System persists authentication state in localStorage
- System maintains session across page refreshes
- System validates stored credentials on app initialization
- System clears invalid sessions automatically

### 3.3 Token Management
- System retrieves GitLab token from user profile
- System stores GitLab token securely
- System includes GitLab token in user object
- System handles missing GitLab tokens gracefully

### 3.4 Logout Functionality
- System clears all stored credentials on logout
- System clears session storage
- System redirects to login page
- System prevents access to protected routes after logout

### 3.5 API Integration
- System uses Basic Authentication for Redmine API calls
- System includes Authorization header in all authenticated requests
- System handles 401/403 responses appropriately
- System supports both JSON and HTML response formats

## 4. Technical Requirements

### 4.1 Backend Integration
- Redmine 6.0.7 REST API endpoints
- Rails 7.2.2.2 framework compatibility
- Basic Authentication support
- CSRF token handling for state-changing operations

### 4.2 Frontend Implementation
- React 18.2.0 with Redux state management
- localStorage for credential persistence
- sessionStorage for temporary auth tokens
- Axios for HTTP requests with proxy support

### 4.3 Security Requirements
- Credentials stored in localStorage (encrypted in production)
- Basic Auth tokens generated client-side
- HTTPS required for production
- CSRF tokens for POST/PUT/DELETE operations
- Session validation on app initialization

### 4.4 API Endpoints Used
- `GET /users/current.json` - Get current user profile
- `GET /my/account.json` - Get user account details including API key
- `GET /my/account` - HTML page for extracting GitLab token

## 5. Dependencies

### 5.1 Backend Dependencies
- Redmine 6.0.7 with REST API enabled
- redmine_scm plugin (for GitLab token column)
- Database: SQL Server (dev) / PostgreSQL (prod)

### 5.2 Frontend Dependencies
- React 18.2.0
- Redux 5.0.1
- React-Redux 9.2.0
- Axios 1.7.9
- React Router DOM 6.30.1

## 6. Constraints

### 6.1 Technical Constraints
- Must support CRA proxy for development (localhost:3000 → localhost:4000)
- Must handle both JSON and HTML responses from Redmine
- Must support legacy Redmine authentication mechanisms
- Must work with existing Redmine session management

### 6.2 Business Constraints
- No changes to Redmine backend authentication logic
- Must maintain compatibility with existing Redmine plugins
- Must support multiple authentication methods (Basic Auth, API key)

## 7. Non-Functional Requirements

### 7.1 Performance
- Login response time < 2 seconds
- Session restoration < 500ms
- Token retrieval < 1 second

### 7.2 Reliability
- 99.9% authentication success rate for valid credentials
- Graceful degradation on network failures
- Automatic retry for transient failures

### 7.3 Usability
- Clear error messages for authentication failures
- Loading indicators during authentication
- Automatic redirect after successful login

### 7.4 Security
- No credentials logged to console in production
- Secure credential storage
- Automatic session expiration on token invalidation
