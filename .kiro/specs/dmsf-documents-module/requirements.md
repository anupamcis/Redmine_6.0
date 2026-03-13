# DMSF Documents Module - Requirements

## 1. Overview
The DMSF (Document Management System Files) module provides document management functionality, integrating with the redmine_dmsf plugin on Redmine 6.0.7 backend for file storage, versioning, and access control.

## 2. User Stories

### 2.1 Browse Documents
**As a** user  
**I want to** browse project documents in folder structure  
**So that** I can find files I need

### 2.2 Upload Documents
**As a** user  
**I want to** upload files to project folders  
**So that** I can share documents with team

### 2.3 Download Documents
**As a** user  
**I want to** download documents  
**So that** I can work with files locally

### 2.4 Manage Folders
**As a** user with permissions  
**I want to** create and organize folders  
**So that** I can structure project documents

### 2.5 Document Versioning
**As a** user  
**I want to** upload new versions of documents  
**So that** I can track document evolution

### 2.6 Document Approval
**As a** approver  
**I want to** approve or reject documents  
**So that** I can control document quality

### 2.7 Document Locking
**As a** user  
**I want to** lock documents while editing  
**So that** I can prevent concurrent modifications

## 3. Acceptance Criteria

### 3.1 Document Browsing
- System displays folder tree structure
- System shows files in current folder
- System displays file name, size, type, and date
- System shows file version number
- System indicates locked files
- System displays approval status
- System supports breadcrumb navigation
- System provides search functionality

### 3.2 File Upload
- System allows selecting files from local system
- System supports multiple file upload
- System validates file size limits
- System validates file types
- System shows upload progress
- System creates new version if file exists
- System displays upload errors clearly
- System refreshes folder view on success

### 3.3 File Download
- System provides download link for each file
- System serves correct file version
- System tracks download count
- System enforces access permissions
- System handles large file downloads
- System provides download progress indicator

### 3.4 Folder Management
- System allows creating new folders
- System allows renaming folders
- System allows deleting empty folders
- System allows moving files between folders
- System validates folder names
- System enforces folder permissions
- System displays folder hierarchy

### 3.5 Version Control
- System tracks all file versions
- System displays version history
- System allows viewing specific versions
- System allows reverting to previous versions
- System shows version author and date
- System preserves all versions
- System allows comparing versions

### 3.6 Document Approval Workflow
- System displays approval status (pending, approved, rejected)
- System allows submitting for approval
- System notifies approvers
- System allows approving documents
- System allows rejecting with comments
- System tracks approval history
- System enforces approval permissions

### 3.7 Document Locking
- System allows locking files for editing
- System displays lock status and owner
- System prevents editing locked files by others
- System allows unlocking own files
- System auto-unlocks after timeout
- System notifies when file is locked

## 4. Technical Requirements

### 4.1 Backend Integration
- redmine_dmsf plugin (latest version)
- File storage on server filesystem
- Database metadata storage
- WebDAV support (optional)

### 4.2 API Endpoints
- `GET /projects/:id/dmsf.json` - List folders and files
- `GET /projects/:id/dmsf/folders/:folder_id.json` - Get folder contents
- `POST /projects/:id/dmsf/upload.json` - Upload file
- `GET /dmsf/files/:id/download` - Download file
- `POST /projects/:id/dmsf/folders.json` - Create folder
- `PUT /dmsf/files/:id.json` - Update file metadata
- `DELETE /dmsf/files/:id.json` - Delete file
- `POST /dmsf/files/:id/lock.json` - Lock file
- `DELETE /dmsf/files/:id/lock.json` - Unlock file
- `GET /dmsf/files/:id/versions.json` - Get version history

### 4.3 Frontend Implementation
- React components for file browser
- Tree view for folder navigation
- File upload with progress tracking
- Drag-and-drop file upload
- Context menu for file operations
- Modal dialogs for confirmations

### 4.4 Data Model
```javascript
DmsfFolder {
  id: number
  project_id: number
  title: string
  description: string
  parent_id: number
  created_at: datetime
  updated_at: datetime
}

DmsfFile {
  id: number
  project_id: number
  folder_id: number
  name: string
  size: number
  mime_type: string
  version: number
  created_at: datetime
  updated_at: datetime
  locked: boolean
  locked_by: { id, name }
  approval_status: string
  versions: array<DmsfFileRevision>
}

DmsfFileRevision {
  id: number
  file_id: number
  version: number
  size: number
  comment: string
  author: { id, name }
  created_at: datetime
}
```

## 5. Dependencies

### 5.1 Backend Dependencies
- Redmine 6.0.7 core
- redmine_dmsf plugin
- File system storage
- Database for metadata
- Xapian for full-text search (optional)

### 5.2 Frontend Dependencies
- React 18.2.0
- Redux 5.0.1
- Axios 1.7.9
- React DnD (drag-and-drop)
- File upload library

## 6. Plugin Integration Requirements

### 6.1 Redmine DMSF Plugin
- System integrates with plugin's data model
- System uses plugin's API endpoints
- System respects plugin's permissions
- System follows plugin's workflow rules
- System supports plugin's approval workflow
- System integrates with plugin's WebDAV (if enabled)

### 6.2 Permission System
- System enforces view permissions
- System enforces edit permissions
- System enforces delete permissions
- System enforces approval permissions
- System respects folder-level permissions
- System respects file-level permissions

## 7. Performance Requirements

### 7.1 Loading Performance
- Folder listing load < 2 seconds
- File upload < 5 seconds per MB
- File download starts < 1 second
- Version history load < 1 second
- Search results < 3 seconds

### 7.2 Optimization Strategies
- Lazy loading of folder contents
- Chunked file uploads for large files
- Streaming downloads
- Cached folder structure
- Indexed search

## 8. Constraints

### 8.1 Technical Constraints
- Must use redmine_dmsf plugin API
- Must support large files (up to 100MB)
- Must maintain version history
- Must integrate with Redmine permissions
- Must support concurrent access

### 8.2 Business Constraints
- No changes to plugin data model
- Must support existing workflows
- Must maintain approval workflow compatibility
- Must respect project membership

## 9. Non-Functional Requirements

### 9.1 Scalability
- Support 10,000+ files per project
- Handle 100+ concurrent uploads
- Efficient rendering of large folders

### 9.2 Usability
- Intuitive file browser interface
- Clear folder hierarchy
- Easy file upload (drag-and-drop)
- Progress indicators for operations
- Mobile-responsive design

### 9.3 Reliability
- Graceful handling of upload failures
- Resume interrupted uploads
- Conflict resolution for concurrent edits
- Error recovery for failed operations
- Data integrity for versions

### 9.4 Security
- Permission-based access control
- Secure file upload handling
- Virus scanning (optional)
- Audit trail for file operations
- Encrypted storage (optional)
