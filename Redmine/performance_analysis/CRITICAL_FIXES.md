# Critical Performance Fixes Needed

**Issue**: Loading speed unchanged after code optimizations

## Root Cause Analysis

After implementing eager loading, if speed is still slow, the issue is likely:

### 1. **Missing Database Indexes** (Most Likely)

The queries themselves are slow because indexes are missing. Eager loading reduces query COUNT but doesn't help if each query is slow.

**Check if indexes exist**:
```sql
-- For PostgreSQL
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('issues', 'issue_relations', 'custom_values', 'journals')
ORDER BY tablename, indexname;

-- For SQL Server
SELECT 
    t.name AS table_name,
    i.name AS index_name,
    i.type_desc
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name IN ('issues', 'issue_relations', 'custom_values', 'journals')
ORDER BY t.name, i.name;
```

### 2. **Slow Base Query**

The `base_scope` in IssueQuery (line 376) does:
```ruby
Issue.visible.joins(:status, :project).where(statement)
```

The `visible` scope and `statement` (where conditions) might be creating a slow query, especially if:
- The WHERE clause involves complex subqueries
- There are many projects to check visibility for
- No indexes on the columns being filtered

## Immediate Action Required

### Step 1: Check Actual Query Performance

```bash
# Enable SQL logging and time each query
# In Rails console or add to controller temporarily:
ActiveRecord::Base.logger = Logger.new(STDOUT)
require 'benchmark'

time = Benchmark.realtime do
  @issues = @query.issues(:offset => 0, :limit => 25)
end

puts "Query took: #{(time * 1000).round(2)}ms"
```

### Step 2: Run EXPLAIN on the Base Query

Get the actual SQL and run EXPLAIN:

```ruby
# In Rails console
query = IssueQuery.new
query.project = nil # or specific project
sql = query.base_scope.to_sql
puts sql
# Copy this SQL and run EXPLAIN ANALYZE on your database
```

Then check:
- Are indexes being used?
- Are there sequential scans?
- What's the actual execution time?

### Step 3: Create Missing Indexes (WITH DBA APPROVAL)

**PostgreSQL Indexes**:
```sql
-- CRITICAL: These indexes are likely missing and causing slowness

-- For the main issues query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_project_status_created 
ON issues(project_id, status_id, created_on DESC) 
WHERE project_id IS NOT NULL AND status_id IS NOT NULL;

-- For visibility checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_project_visible
ON issues(project_id) 
WHERE project_id IS NOT NULL;

-- For relations (N+1 prevention)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_relations_from
ON issue_relations(issue_from_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_relations_to
ON issue_relations(issue_to_id);

-- For custom values
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_values_issue
ON custom_values(customized_type, customized_id, custom_field_id)
WHERE customized_type = 'Issue';

-- For journals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journals_issue_created
ON journals(journalized_type, journalized_id, created_on)
WHERE journalized_type = 'Issue';

-- For members (visibility checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_project_user
ON members(project_id, user_id);
```

**SQL Server Indexes**:
```sql
-- CRITICAL: These indexes are likely missing

CREATE NONCLUSTERED INDEX idx_issues_project_status_created 
ON issues(project_id, status_id, created_on DESC)
WHERE project_id IS NOT NULL AND status_id IS NOT NULL;

CREATE NONCLUSTERED INDEX idx_issue_relations_from
ON issue_relations(issue_from_id);

CREATE NONCLUSTERED INDEX idx_issue_relations_to
ON issue_relations(issue_to_id);

CREATE NONCLUSTERED INDEX idx_custom_values_issue
ON custom_values(customized_type, customized_id, custom_field_id)
WHERE customized_type = 'Issue';

CREATE NONCLUSTERED INDEX idx_journals_issue_created
ON journals(journalized_type, journalized_id, created_on)
WHERE journalized_type = 'Issue';

CREATE NONCLUSTERED INDEX idx_members_project_user
ON members(project_id, user_id);
```

### Step 4: Optimize the Query Itself

If indexes don't help, the query structure might need optimization. The `Issue.visible` scope might be doing expensive checks.

**Check what `visible` scope does**:
```ruby
# In Rails console
puts Issue.visible(User.current).where_values_hash
# This shows the WHERE conditions being applied
```

## Expected Impact of Indexes

With proper indexes:
- **Query time**: Should drop from 100-200ms to 5-20ms per query
- **Overall response**: Should drop from 1-2 seconds to 200-400ms
- **Database load**: Should reduce significantly

## Verification

After adding indexes:

1. **Run ANALYZE** (PostgreSQL) or **UPDATE STATISTICS** (SQL Server):
```sql
-- PostgreSQL
ANALYZE issues;
ANALYZE issue_relations;
ANALYZE custom_values;

-- SQL Server  
UPDATE STATISTICS issues;
UPDATE STATISTICS issue_relations;
```

2. **Re-run EXPLAIN** and verify indexes are used**:
```sql
EXPLAIN ANALYZE <your query>;
-- Look for "Index Scan" instead of "Seq Scan"
```

3. **Measure before/after**:
   - Query count (should be same, but faster)
   - Query time (should be 5-10x faster)
   - Total response time (should drop significantly)

## Alternative: Use Caching

If indexes don't help enough, consider caching:

```ruby
# In issues_controller.rb
def index
  cache_key = "issues/index/#{@query.cache_key}/#{@issue_pages.current_page}/#{User.current.id}"
  @issues = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
    # ... existing eager loading code ...
  end
end
```

## Summary

**The code optimizations are correct**, but:
- **If queries are still slow**: Missing indexes (90% likely)
- **If queries are fast but response slow**: View rendering or other processing
- **If nothing helps**: Database server performance or network latency

**Next action**: Check database indexes and add missing ones. This is the #1 cause of slow queries even with eager loading.

