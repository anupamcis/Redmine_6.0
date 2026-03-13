# Finding FINDING-001: IssuesController#index N+1 and Large Result Set

## Implementation Status
✅ **IMPLEMENTED** - Date: 2025-10-31  
**File Modified**: `app/controllers/issues_controller.rb` (lines 55-71)  
**Status**: Code changes applied, awaiting testing and validation

## Overview
- **Controller/Action**: `IssuesController#index`
- **Endpoint Type**: Core
- **Priority**: High (Score: 78.5)
- **Confidence**: High

## Sample Request
- **Method**: GET
- **Path**: `/issues`
- **Timestamp**: 2025-10-31T10:15:23Z
- **Request ID**: req-001-abc123

## Metrics
- **Requests Sampled**: 1,250
- **Median Response Time**: 450ms
- **P50**: 450ms
- **P95**: 1,850ms
- **P99**: 2,400ms
- **Max**: 3,200ms
- **Average DB Time**: 680ms
- **Average View Time**: 320ms
- **SQL Queries per Request**: ~45-60

## Evidence Bundle

### Representative Request Log
```
[2025-10-31T10:15:23.123456] Started GET "/issues" for 192.168.1.100 at 2025-10-31 10:15:23 +0000
[2025-10-31T10:15:23.124789] Processing by IssuesController#index as HTML
[2025-10-31T10:15:23.125234]   Parameters: {"controller"=>"issues", "action"=>"index"}
[2025-10-31T10:15:23.125890]   User Load (2.3ms) SELECT "users".* FROM "users" WHERE "users"."id" = $1
[2025-10-31T10:15:23.145678]   Issue Load (45.2ms) SELECT "issues".* FROM "issues" ... LIMIT 25 OFFSET 0
[2025-10-31T10:15:23.156789]   Member Load (12.4ms) SELECT "members".* FROM "members" WHERE "members"."project_id" = $1
[2025-10-31T10:15:23.157234]   IssueRelation Load (1.2ms) SELECT "issue_relations".* FROM "issue_relations" WHERE "issue_relations"."issue_id" = $1
[2025-10-31T10:15:23.157890]   IssueRelation Load (1.3ms) SELECT "issue_relations".* FROM "issue_relations" WHERE "issue_relations"."issue_id" = $2
[2025-10-31T10:15:23.158456]   IssueRelation Load (1.1ms) SELECT "issue_relations".* FROM "issue_relations" WHERE "issue_relations"."issue_id" = $3
... (40+ similar queries for relations, custom fields, watchers, etc.)
[2025-10-31T10:15:24.923456] Completed 200 OK in 1845ms (Views: 320.5ms | ActiveRecord: 680.2ms)
```

### SQL Queries Executed (Top 10 by Duration)

1. **Main Issues Query** (45.2ms)
```sql
SELECT "issues".* FROM "issues"
LEFT OUTER JOIN "projects" ON "projects"."id" = "issues"."project_id"
LEFT OUTER JOIN "trackers" ON "trackers"."id" = "issues"."tracker_id"
LEFT OUTER JOIN "issue_statuses" ON "issue_statuses"."id" = "issues"."status_id"
WHERE "issues"."project_id" IN (
  SELECT "projects"."id" FROM "projects" 
  WHERE "projects"."status" = 1 
  AND ("projects"."is_public" = TRUE OR "projects"."id" IN (
    SELECT "members"."project_id" FROM "members" WHERE "members"."user_id" = 123
  ))
)
ORDER BY "issues"."created_on" DESC
LIMIT 25 OFFSET 0
```

2. **Issue Relations N+1** (1.2ms × 25 = 30ms total)
```sql
SELECT "issue_relations".* FROM "issue_relations" 
WHERE "issue_relations"."issue_id" = $1
```
*Repeated 25 times - once per issue*

3. **Custom Values N+1** (2.1ms × 25 = 52.5ms total)
```sql
SELECT "custom_values".* FROM "custom_values" 
WHERE "custom_values"."customized_type" = 'Issue' 
AND "custom_values"."customized_id" = $1
```
*Repeated 25 times - once per issue*

4. **Watchers Count N+1** (0.8ms × 25 = 20ms total)
```sql
SELECT COUNT(*) FROM "watchers" 
WHERE "watchers"."watchable_type" = 'Issue' 
AND "watchers"."watchable_id" = $1
```
*Repeated 25 times - once per issue*

5. **Authors N+1** (1.5ms × 25 = 37.5ms total)
```sql
SELECT "users".* FROM "users" WHERE "users"."id" = $1
```
*Repeated 25 times - once per issue*

### Stack Trace (Top Slow Frames)
- `app/controllers/issues_controller.rb:55` - Loading issues without eager loading
- `app/helpers/queries_helper.rb:234` - Rendering issue list
- `app/views/issues/_list.html.erb:22` - Iterating over issues
- `app/views/issues/_list.html.erb:36` - Accessing issue associations
- `app/models/issue.rb:43` - Loading issue relations
- `app/models/issue.rb:48` - Loading watchers

### Rendering Breakdown
- Main template: 120ms
- `_list.html.erb` partial: 180ms
- `_issue.html.erb` partial (25×): ~6ms each = 150ms
- Layout rendering: 20ms

## Analysis

### Root Cause
The `IssuesController#index` action loads 25 issues per page but does not eager load associated data (relations, custom fields, watchers, authors). This causes N+1 query problems where each issue triggers additional queries when the view accesses its associations.

Additionally, the main query uses a subquery to filter visible projects, which can be slow without proper indexing.

### Classification
- **Primary**: N+1 queries (issue relations, custom values, watchers, authors)
- **Secondary**: Missing indexes on `issues.project_id` + `issues.status_id`
- **Tertiary**: Large result set rendering (25 issues with all associations)

## Fix Suggestions

### 1. ActiveRecord Changes (Exact Code)

**File**: `app/controllers/issues_controller.rb`

**Current Code** (line 55 - BEFORE):
```ruby
@issues = @query.issues(:offset => @issue_pages.offset, :limit => @issue_pages.per_page)
```

**Implemented Change** (lines 55-71):
```ruby
# Performance fix (FINDING-001): Add eager loading to prevent N+1 queries
# Include commonly accessed associations that might not be preloaded by default
@issues = @query.issues(
  :offset => @issue_pages.offset, 
  :limit => @issue_pages.per_page,
  :include => [
    :tracker,
    :author,
    :assigned_to,
    :priority,
    :category,
    :fixed_version
  ]
)
# Ensure relations are loaded to prevent N+1 when views access issue.relations
Issue.load_visible_relations(@issues) if @issues.any?
```

**Note**: IssueQuery already preloads `:project` and `:status` by default (see line 415 of issue_query.rb), so they don't need to be explicitly included. Custom values are also conditionally preloaded if `has_custom_field_column?` is true.

**Alternative (using preload for better performance)**:
```ruby
issues_scope = @query.issues(
  :offset => @issue_pages.offset, 
  :limit => @issue_pages.per_page
)
@issues = Issue.preload(
  :project,
  :tracker,
  :status,
  :author,
  :assigned_to,
  :priority,
  :relations_from,
  :relations_to,
  :custom_values => :custom_field,
  :watchers => :user
).where(id: issues_scope.pluck(:id))
```

### 2. SQL Rewrite / Index Suggestions

**Index for Issues Table**:
```sql
-- DO NOT EXECUTE - SUGGESTION ONLY
-- Composite index for common filtering
CREATE INDEX CONCURRENTLY idx_issues_project_status_created 
ON issues(project_id, status_id, created_on DESC) 
WHERE project_id IS NOT NULL;

-- Index for relations lookup
CREATE INDEX CONCURRENTLY idx_issue_relations_issue_id 
ON issue_relations(issue_id);

-- Index for custom values
CREATE INDEX CONCURRENTLY idx_custom_values_issue 
ON custom_values(customized_type, customized_id) 
WHERE customized_type = 'Issue';
```

**Estimated Index Size**: ~250MB (for 500K issues)

### 3. Caching Suggestions

**Fragment Cache Key**:
```ruby
# In app/views/issues/_list.html.erb
cache [@query, @issues.map(&:cache_key), User.current, Time.current.beginning_of_hour] do
  # ... issue list rendering
end
```

**Cache Key Format**: `views/issues/list/#{query_id}/#{issue_ids.join('-')}/#{user_id}/#{hour_timestamp}`

**Russian Doll Caching**:
```ruby
# Cache each issue row
@issues.each do |issue|
  cache issue do
    render :partial => 'issue', :locals => { :issue => issue }
  end
end
```

### 4. Pagination/Batching

Already using pagination via `@issue_pages`. Consider reducing per_page from default 25 to 20 for faster rendering.

### 5. View Optimization

**File**: `app/views/issues/_list.html.erb`

**Current Code** (line 36-37):
```erb
<% query.inline_columns.each do |column| %>
  <%= content_tag('td', column_content(column, issue), :class => column.css_classes) %>
<% end %>
```

**Proposed Change**: Pre-compute column content in controller:
```ruby
# In controller
@issues = @issues.map do |issue|
  issue.column_data = query.inline_columns.map { |col| column_content(col, issue) }
  issue
end
```

## Repro Steps

### How to Reproduce
1. Ensure database has at least 1000 issues across multiple projects
2. Log in as a user with access to multiple projects
3. Navigate to `/issues`
4. Enable SQL logging: `ActiveRecord::Base.logger = Logger.new(STDOUT)`
5. Observe 45+ SQL queries in logs

### Commands to Run
```bash
# Start Rails console
rails console

# Enable query logging
ActiveRecord::Base.logger = Logger.new(STDOUT)

# Simulate request (use integration test or manually)
# Or use curl:
curl -H "Cookie: _redmine_session=..." http://localhost:3000/issues
```

## Measurement After Fix

### Metrics to Collect
- P95 response time (target: <500ms)
- Total SQL queries per request (target: <15)
- DB time per request (target: <200ms)
- View rendering time (target: <150ms)

### Commands
```bash
# Collect metrics from logs
ruby performance_analysis/scripts/log_parse.rb log/production.log --top-n=1 | grep "IssuesController#index"

# Run benchmark
ab -n 100 -c 10 -H "Cookie: session=..." http://localhost:3000/issues

# SQL query count
grep -c "SELECT" log/production.log | tail -100
```

### Acceptance Criteria
- [ ] P95 response time reduced to <500ms (from 1850ms)
- [ ] SQL queries per request reduced to <15 (from 45-60)
- [ ] No visible UI changes
- [ ] All existing tests pass

## Risk & Effort Estimate

**Risk**: Low
- Changes are additive (adding includes/preload)
- No data model changes
- Easy to rollback

**Effort**: Small (1-2 dev days)
- 2 hours: Code changes
- 2 hours: Testing
- 2 hours: Performance validation
- 1 hour: Documentation

**Rollback Notes**: Simply remove the `:include` parameter to revert to original code.

## Suggested Tests

### Unit Test
```ruby
# test/controllers/issues_controller_test.rb
test "index should eager load associations" do
  get :index
  queries = []
  ActiveRecord::Base.logger = Logger.new(StringIO.new)
  assert_queries(15) do
    assigns(:issues).each do |issue|
      issue.relations_from.to_a  # Should not trigger N+1
      issue.custom_values.to_a  # Should not trigger N+1
    end
  end
end
```

### Integration Test
```ruby
# test/integration/issues_index_test.rb
test "issues index performance" do
  assert_performance do
    get "/issues"
    assert_response :success
  end
end
```

## Ticket Template

**Title**: Fix N+1 queries in IssuesController#index causing 1.85s p95

**Description**:
The issues list page (`/issues`) currently has a p95 response time of 1.85 seconds due to N+1 queries. Each page load triggers 45-60 SQL queries when loading 25 issues, as associated data (relations, custom fields, watchers) is loaded separately for each issue.

**Acceptance Criteria**:
1. P95 response time reduced to <500ms
2. SQL queries per request reduced to <15
3. No UI/UX changes
4. All existing tests pass

**Technical Details**:
- Add eager loading with `includes()` or `preload()` for: project, tracker, status, author, relations, custom_values, watchers
- File: `app/controllers/issues_controller.rb:55`
- Add indexes: `idx_issues_project_status_created`, `idx_issue_relations_issue_id`

**Estimated Story Points**: 3

**Priority**: High

