# Daily Status Module - Requirements

## 1. Overview
The daily status module provides email-like threaded communication for project teams, integrating with the redmine_daily_status plugin on Redmine 6.0.7 backend.

## 2. User Stories

### 2.1 View Inbox
**As a** user  
**I want to** see all daily status threads for my project  
**So that** I can stay informed about team updates

### 2.2 Compose Daily Status
**As a** user  
**I want to** create new daily status messages  
**So that** I can share updates with my team

### 2.3 Reply to Thread
**As a** user  
**I want to** reply to existing daily status threads  
**So that** I can participate in discussions

### 2.4 Select Recipients
**As a** user  
**I want to** choose who receives my daily status  
**So that** I can target relevant team members

### 2.5 Mark as Read/Unread
**As a** user  
**I want to** mark threads as read or unread  
**So that** I can track which updates I've reviewed

### 2.6 Rich Text Editing
**As a** user  
**I want to** format my daily status with rich text  
**So that** I can communicate effectively

## 3. Acceptance Criteria

### 3.1 Inbox View
- System displays list of daily status threads
- System shows thread subject, sender, date, and preview
- System indicates unread threads
- System supports pagination
- System displays recipient count
- System shows last reply date
- System provides search functionality
- System allows filtering by read/unread status

### 3.2 Thread Detail View
- System displays complete thread with all messages
- System shows message sender and timestamp
- System displays message content with formatting
- System shows recipient list
- System provides reply functionality
- System allows marking as read/unread
- System displays message history chronologically

### 3.3 Compose Functionality
- System provides rich text editor (CKEditor)
- System allows entering subject
- System provides recipient selection
- System validates required fields
- System supports draft saving
- System allows immediate sending
- System displays composition errors clearly
- System redirects to thread on success

### 3.4 Reply Functionality
- System pre-fills recipient list from thread
- System provides rich text editor
- System quotes previous message (optional)
- System validates message content
- System updates thread immediately
- System sends notifications to recipients

### 3.5 Recipient Management
- System displays all project members as potential recipients
- System allows selecting multiple recipients
- System shows recipient names and roles
- System validates at least one recipient selected
- System persists recipient preferences

### 3.6 Read/Unread Tracking
- System tracks read status per user per thread
- System allows marking individual threads as read/unread
- System allows bulk marking as read
- System displays unread count
- System updates read status in real-time

### 3.7 Rich Text Support
- System supports bold, italic, underline formatting
- System supports lists (ordered/unordered)
- System supports links
- System supports code blocks
- System supports tables
- System sanitizes HTML for security
- System preserves formatting on display

## 4. Technical Requirements

### 4.1 Backend Integration
- redmine_daily_status plugin
- Rails 7.2.2.2 framework
- ActionMailer for email notifications
- ActiveRecord for data persistence

### 4.2 API Endpoints
- `GET /projects/:id/daily_statuses.json` - List threads
- `GET /projects/:id/daily_statuses/:id.json` - Get thread detail
- `POST /projects/:id/daily_statuses.json` - Create thread
- `POST /projects/:id/daily_statuses/:id/daily_status_replies.json` - Reply to thread
- `PUT /projects/:id/daily_statuses/:id.json` - Update thread (mark read/unread)
- `GET /projects/:id/recipients.json` - Get available recipients
- `GET /projects/:id/daily_statuses/today_status.json` - Check if user submitted today

### 4.3 Frontend Implementation
- React components for inbox and thread views
- Redux state management for daily status
- CKEditor 5 for rich text editing
- Real-time updates for new messages
- Optimistic UI updates

### 4.4 Data Model
```javascript
DailyStatus {
  id: number
  project_id: number
  subject: string
  body_html: string
  author: { id, name }
  recipients: array<{ id, name, role }>
  created_on: datetime
  updated_on: datetime
  unread: boolean
  replies: array<DailyStatusReply>
}

DailyStatusReply {
  id: number
  daily_status_id: number
  body_html: string
  author: { id, name }
  created_on: datetime
}
```

## 5. Dependencies

### 5.1 Backend Dependencies
- Redmine 6.0.7 core
- redmine_daily_status plugin
- ActionMailer for notifications
- HTML sanitization library

### 5.2 Frontend Dependencies
- React 18.2.0
- Redux 5.0.1
- CKEditor 5 (39.0.2)
- @ckeditor/ckeditor5-react (7.0.0)
- Axios 1.7.9

## 6. Plugin Integration Requirements

### 6.1 Redmine Daily Status Plugin
- System integrates with plugin's data model
- System uses plugin's API endpoints
- System respects plugin's permissions
- System triggers plugin's email notifications
- System follows plugin's workflow rules

### 6.2 Email Notifications
- System triggers email on new thread creation
- System triggers email on thread reply
- System includes thread content in email
- System provides link back to thread
- System respects user notification preferences

## 7. Performance Requirements

### 7.1 Loading Performance
- Inbox load < 2 seconds
- Thread detail load < 1 second
- Message composition < 500ms
- Reply submission < 1 second
- Recipient list load < 500ms

### 7.2 Optimization Strategies
- Paginated inbox loading
- Lazy loading of thread details
- Cached recipient lists
- Debounced search
- Optimistic UI updates

## 8. Constraints

### 8.1 Technical Constraints
- Must use redmine_daily_status plugin API
- Must support HTML content
- Must integrate with Redmine permissions
- Must trigger email notifications
- Must maintain thread integrity

### 8.2 Business Constraints
- No changes to plugin data model
- Must support existing workflows
- Must maintain email notification compatibility
- Must respect project membership

## 9. Non-Functional Requirements

### 9.1 Scalability
- Support 1000+ threads per project
- Handle 100+ recipients per thread
- Efficient rendering of long threads

### 9.2 Usability
- Intuitive email-like interface
- Clear unread indicators
- Easy recipient selection
- Rich text editing toolbar
- Mobile-responsive design

### 9.3 Reliability
- Graceful handling of send failures
- Draft auto-save
- Conflict resolution for concurrent replies
- Error recovery for failed API calls

### 9.4 Security
- HTML sanitization for XSS prevention
- Permission-based access control
- Secure recipient validation
- CSRF protection for state changes
