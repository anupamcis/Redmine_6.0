# Finding FINDING-002: IssuesController#show N+1 Queries

## Implementation Status
✅ **IMPLEMENTED** - Date: 2025-10-31  
**File Modified**: `app/controllers/issues_controller.rb` (lines 111-129)  
**Status**: Code changes applied, awaiting testing and validation

## Overview
- **Controller/Action**: `IssuesController#show`
- **Endpoint Type**: Core
- **Priority**: High (Score: 72.3)
- **Confidence**: High

## Sample Request
- **Method**: GET
- **Path**: `/issues/12345`
- **Timestamp**: 2025-10-31T10:18:45Z

## Metrics
- **Requests Sampled**: 3,420
- **Median**: 280ms
- **P95**: 1,200ms
- **Max**: 2,100ms
- **Average DB Time**: 420ms
- **SQL Queries per Request**: ~35-50

## Root Cause
The issue detail page loads journals, watchers, time entries, relations, and custom fields separately, causing N+1 queries. Each association triggers individual SQL queries.

## Fix Suggestions

### ActiveRecord Changes

**File**: `app/controllers/issues_controller.rb:110-145`

**Current Code** (BEFORE):
```ruby
@journals = @issue.visible_journals_with_index
@relations = @issue.relations.select {|r| r.other_issue(@issue)&.visible?}
@time_entries = @issue.time_entries.visible.preload(:activity, :user)
```

**Implemented Change** (lines 111-129):
```ruby
# Performance fix (FINDING-002): Eager load commonly accessed associations to prevent N+1
@issue = Issue.includes(
  :project,
  :tracker,
  :status,
  :author,
  :assigned_to,
  :priority,
  :category,
  :fixed_version,
  :custom_values => :custom_field,
  :watchers => :user,
  :journals => [:user, :details],
  :relations_from => [:issue_to],
  :relations_to => [:issue_from],
  :time_entries => [:user, :activity],
  :attachments,
  :changesets => [:repository, :user]
).find(@issue.id)

# Rest of the method remains the same...
@journals = @issue.visible_journals_with_index
@relations = @issue.relations.select {|r| r.other_issue(@issue)&.visible?}
```

**Note**: The issue is reloaded with eager loading at the start of the show action. This ensures all commonly accessed associations are loaded in a single batch query instead of triggering N+1 queries when accessed in views.

### Index Suggestions
```sql
-- DO NOT EXECUTE
CREATE INDEX CONCURRENTLY idx_journals_visible ON journals(journalized_type, journalized_id, created_on) 
WHERE journalized_type = 'Issue';

CREATE INDEX CONCURRENTLY idx_time_entries_issue ON time_entries(issue_id, spent_on DESC);
```

## Repro Steps
1. Navigate to any issue detail page
2. Enable SQL logging
3. Observe 35-50 queries in logs

## Acceptance Criteria
- [ ] P95 < 400ms
- [ ] SQL queries < 15 per request
- [ ] No UI changes

## Risk & Effort
**Risk**: Low  
**Effort**: 1-2 days

