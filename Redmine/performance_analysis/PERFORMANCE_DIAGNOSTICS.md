# Performance Diagnostics & Next Steps

**Date**: 2025-10-31  
**Issue**: Loading speed still slow after optimizations

## Current Status

### Implemented Optimizations
1. ✅ FINDING-001: IssuesController#index - Force eager loading of all associations
2. ✅ FINDING-002: IssuesController#show - Custom finder with eager loading

### If Speed is Still Slow

The optimizations we've implemented should reduce SQL queries significantly. If loading is still slow, possible causes:

#### 1. Database Indexes Missing
The queries might be slow due to missing indexes. Check:

```sql
-- Run these EXPLAIN queries to see if indexes are being used
EXPLAIN ANALYZE 
SELECT * FROM issues 
WHERE project_id IN (SELECT id FROM projects WHERE status = 1 AND ...)
ORDER BY id DESC LIMIT 25;

EXPLAIN ANALYZE
SELECT * FROM issue_relations 
WHERE issue_from_id IN (1, 2, 3, ...);
```

**Missing indexes that commonly cause slowness**:
- `idx_issues_project_status` on `issues(project_id, status_id)`
- `idx_issues_created_on` on `issues(created_on DESC)`
- `idx_issue_relations_issue_from` on `issue_relations(issue_from_id)`
- `idx_custom_values_issue` on `custom_values(customized_type, customized_id)`

#### 2. Database Connection Issues
- Check database connection pool size (`config/database.yml`)
- Check if database server is under load
- Verify network latency to database

#### 3. View Rendering Slow
Even with eager loading, views might be slow:
- Check for complex helper methods called in loops
- Look for expensive computations in views
- Check for image/asset loading issues

#### 4. Large Result Sets
- Check if pagination is working correctly
- Verify `per_page_option` isn't returning too many records

## Diagnostic Steps

### Step 1: Enable Query Logging
```ruby
# In config/environments/development.rb or temporarily
config.log_level = :debug
```

Then check the logs to see:
- How many queries are actually being executed
- Which queries are slow
- If eager loading is working

### Step 2: Profile a Request
```bash
# Add this temporarily to issues_controller.rb#index
require 'benchmark'
time = Benchmark.realtime do
  # ... existing code ...
end
Rails.logger.info "IssuesController#index took: #{time * 1000}ms"
```

### Step 3: Check Database Performance
```sql
-- Check slow queries
SELECT TOP 20
    total_elapsed_time / execution_count AS avg_elapsed_time,
    execution_count,
    SUBSTRING(st.text, 1, 200) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY total_elapsed_time / execution_count DESC;
```

### Step 4: Verify Eager Loading is Working
```ruby
# In Rails console, test the query
ActiveRecord::Base.logger = Logger.new(STDOUT)
IssuesController.new.index
# Count the number of SELECT queries in the output
```

## Recommended Database Indexes

If using PostgreSQL:
```sql
-- DO NOT EXECUTE without DBA approval - suggestions only
CREATE INDEX CONCURRENTLY idx_issues_project_status_created 
ON issues(project_id, status_id, created_on DESC) 
WHERE project_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_issue_relations_issue_from 
ON issue_relations(issue_from_id);

CREATE INDEX CONCURRENTLY idx_custom_values_issue 
ON custom_values(customized_type, customized_id) 
WHERE customized_type = 'Issue';

CREATE INDEX CONCURRENTLY idx_journals_issue 
ON journals(journalized_type, journalized_id, created_on) 
WHERE journalized_type = 'Issue';
```

If using SQL Server:
```sql
-- DO NOT EXECUTE without DBA approval - suggestions only
CREATE NONCLUSTERED INDEX idx_issues_project_status_created 
ON issues(project_id, status_id, created_on DESC) 
WHERE project_id IS NOT NULL;

CREATE NONCLUSTERED INDEX idx_issue_relations_issue_from 
ON issue_relations(issue_from_id);

CREATE NONCLUSTERED INDEX idx_custom_values_issue 
ON custom_values(customized_type, customized_id) 
WHERE customized_type = 'Issue';
```

## Alternative Approach: Use Preload Instead of Includes

If `includes` isn't working as expected, try `preload`:

```ruby
# In issues_controller.rb#index
@issues = Issue.where(id: issue_ids).
  preload(
    :project,
    :tracker,
    :status,
    :author,
    :assigned_to,
    :priority,
    :category,
    :fixed_version,
    :attachments,
    :custom_values => :custom_field,
    :watchers => :user
  ).
  order("#{Issue.table_name}.id DESC").
  to_a
```

## Check If Optimizations Are Actually Applied

1. **Verify code is deployed**: Check that the changes are actually in the running code
2. **Restart server**: Ensure changes are loaded
3. **Clear cache**: `rails tmp:clear` if using caching
4. **Check logs**: Verify the queries look different

## Next Steps

1. **Enable detailed logging** to see actual query count and timing
2. **Run EXPLAIN ANALYZE** on slow queries to identify missing indexes
3. **Profile the request** to see where time is spent (DB vs rendering)
4. **Check database health** - connection pool, server load, network latency
5. **Consider caching** for frequently accessed, rarely changing data

## Expected Improvements

With proper indexes and eager loading:
- **SQL Queries**: Should drop from 45-60 to <15 per request
- **Response Time**: p95 should drop from 1850ms to <500ms
- **Database Load**: Should reduce significantly

If improvements aren't seen, the bottleneck is likely:
- Missing database indexes
- Slow database server/network
- View rendering complexity
- External API calls or heavy computations

