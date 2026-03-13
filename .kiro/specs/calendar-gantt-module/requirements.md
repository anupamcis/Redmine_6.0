# Calendar and Gantt Module - Requirements

## 1. Overview
The calendar and Gantt module provides visual project planning and scheduling tools, integrating with Redmine 6.0.7 backend and plugins including mega_calendar and advanced_roadmap_v2.

## 2. User Stories

### 2.1 View Project Calendar
**As a** user  
**I want to** see project tasks and events in calendar view  
**So that** I can understand project timeline

### 2.2 View Gantt Chart
**As a** project manager  
**I want to** see project tasks in Gantt chart  
**So that** I can plan and track project schedule

### 2.3 Manage Task Dependencies
**As a** project manager  
**I want to** create and visualize task dependencies  
**So that** I can model project workflow

### 2.4 Track Milestones
**As a** project manager  
**I want to** view milestones on timeline  
**So that** I can track project phases

### 2.5 Adjust Task Dates
**As a** project manager  
**I want to** adjust task dates via drag-and-drop  
**So that** I can quickly reschedule work

### 2.6 View Resource Allocation
**As a** project manager  
**I want to** see resource allocation on timeline  
**So that** I can balance workload

### 2.7 Export Timeline
**As a** project manager  
**I want to** export Gantt chart  
**So that** I can share with stakeholders

## 3. Acceptance Criteria

### 3.1 Calendar View
- System displays month/week/day views
- System shows tasks with due dates
- System displays milestones
- System shows holidays (from mega_calendar plugin)
- System color-codes tasks by status/priority
- System allows clicking tasks to view details
- System supports navigation between months
- System displays multiple projects (optional)

### 3.2 Gantt Chart View
- System displays tasks on timeline
- System shows task bars with start/end dates
- System displays task dependencies as arrows
- System shows milestones as diamonds
- System displays critical path
- System supports zoom levels (day/week/month/quarter)
- System shows today indicator
- System displays task progress bars
- System allows horizontal scrolling

### 3.3 Task Dependencies
- System displays dependency arrows
- System supports dependency types: FS, SS, FF, SF
- System validates dependency logic
- System prevents circular dependencies
- System allows creating dependencies via drag
- System allows deleting dependencies
- System updates dependent tasks on date changes
- System highlights critical path

### 3.4 Milestone Management
- System displays milestones on timeline
- System shows milestone dates
- System indicates milestone completion status
- System allows clicking milestones for details
- System groups tasks by milestone
- System shows milestone dependencies

### 3.5 Interactive Scheduling
- System allows dragging task bars to change dates
- System allows resizing task bars to change duration
- System updates backend on date changes
- System validates date changes
- System shows validation errors
- System updates dependent tasks automatically
- System provides undo functionality

### 3.6 Resource Allocation
- System displays assigned users per task
- System shows workload per user
- System highlights over-allocated resources
- System allows filtering by resource
- System displays resource availability

### 3.7 Export Functionality
- System exports Gantt chart as PNG
- System exports Gantt chart as PDF
- System exports task list as CSV
- System includes all visible tasks in export
- System preserves formatting in export

## 4. Technical Requirements

### 4.1 Backend Integration
- Redmine 6.0.7 Issues API
- mega_calendar plugin (calendar features)
- advanced_roadmap_v2 plugin (Gantt enhancements)
- Versions API for milestones

### 4.2 API Endpoints
- `GET /projects/:id/issues.json` - Get tasks for timeline
- `GET /projects/:id/versions.json` - Get milestones
- `GET /projects/:id/calendar` - Get calendar data
- `GET /issues/:id/relations.json` - Get task dependencies
- `POST /issues/:id/relations.json` - Create dependency
- `DELETE /relations/:id.json` - Delete dependency
- `PUT /issues/:id.json` - Update task dates

### 4.3 Frontend Implementation
- React components for calendar and Gantt
- SVG rendering for Gantt chart
- Canvas rendering for performance (optional)
- Drag-and-drop for interactive scheduling
- Zoom and pan controls
- Export functionality

### 4.4 Data Model
```javascript
GanttTask {
  id: number
  subject: string
  start_date: date
  due_date: date
  done_ratio: number
  assigned_to: { id, name }
  dependencies: array<{
    id: number
    type: string (precedes, follows, blocks, blocked)
    delay: number
  }>
  milestone: { id, name, date }
}

CalendarEvent {
  id: number
  title: string
  start: datetime
  end: datetime
  type: string (task, milestone, holiday)
  color: string
  project: { id, name }
}
```

## 5. Dependencies

### 5.1 Backend Dependencies
- Redmine 6.0.7 core
- mega_calendar plugin
- advanced_roadmap_v2 plugin
- mini_magick gem (for PNG export)

### 5.2 Frontend Dependencies
- React 18.2.0
- Redux 5.0.1
- D3.js or similar for timeline rendering
- React DnD (drag-and-drop)
- date-fns for date manipulation
- html2canvas for export

## 6. Plugin Integration Requirements

### 6.1 Mega Calendar Plugin
- System integrates with plugin's calendar features
- System displays holidays from plugin
- System uses plugin's color coding
- System respects plugin's settings
- System supports plugin's custom events

### 6.2 Advanced Roadmap V2 Plugin
- System uses plugin's Gantt enhancements
- System displays baseline comparison
- System shows resource allocation
- System supports plugin's export features
- System integrates with plugin's milestones

## 7. Performance Requirements

### 7.1 Loading Performance
- Calendar view load < 2 seconds
- Gantt chart load < 3 seconds (100 tasks)
- Gantt chart load < 10 seconds (500 tasks)
- Dependency calculation < 1 second
- Export generation < 5 seconds

### 7.2 Optimization Strategies
- Lazy loading of tasks outside viewport
- Virtual scrolling for large timelines
- Cached dependency calculations
- Incremental rendering
- Web workers for complex calculations
- Debounced drag updates

## 8. Constraints

### 8.1 Technical Constraints
- Must support large project timelines (500+ tasks)
- Must handle complex dependency graphs
- Must maintain data consistency with backend
- Must support concurrent editing
- Must work on various screen sizes

### 8.2 Business Constraints
- No changes to core Redmine data model
- Must support existing workflows
- Must maintain plugin compatibility
- Must respect project permissions

## 9. Non-Functional Requirements

### 9.1 Scalability
- Support 500+ tasks on Gantt chart
- Handle 100+ dependencies
- Efficient rendering of long timelines
- Support multiple projects

### 9.2 Usability
- Intuitive drag-and-drop interface
- Clear visual indicators
- Responsive design
- Keyboard shortcuts
- Accessible UI components
- Smooth animations

### 9.3 Reliability
- Graceful handling of invalid dates
- Conflict resolution for concurrent edits
- Error recovery for failed updates
- Data consistency across views
- Automatic save for changes

### 9.4 Performance
- Smooth scrolling and zooming
- Responsive drag-and-drop
- Fast rendering of large timelines
- Efficient dependency calculations
