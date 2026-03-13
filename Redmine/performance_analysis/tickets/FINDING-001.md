# Ticket: Fix N+1 queries in IssuesController#index

**Type**: Bug / Performance  
**Priority**: High  
**Component**: Performance  
**Target Version**: Next Release  
**Estimated Story Points**: 3

---

## Summary

The issues list page (`/issues`) has a p95 response time of 1.85 seconds due to N+1 queries. Each page load triggers 45-60 SQL queries when loading 25 issues, as associated data (relations, custom fields, watchers) is loaded separately for each issue.

**Finding ID**: FINDING-001  
**Current Metrics**: 
- P95: 1,850ms
- Daily Requests: 1,250
- SQL Queries: 45-60 per request

**Target Metrics**:
- P95: <500ms
- SQL Queries: <15 per request

---

## Description

### Symptom
Users experience slow page loads (1-3 seconds) when viewing the issues list page.

### Root Cause
The `IssuesController#index` action loads issues without eager loading associated data:
- Issue relations (from/to)
- Custom field values
- Watchers
- Authors
- Projects, trackers, statuses

Each issue triggers 2-3 additional queries when the view renders.

### Evidence
- Representative request logs showing 45-60 queries
- P95 of 1,850ms affecting 1,250+ daily requests
- See `performance_analysis/findings/FINDING-001.md` for full evidence

---

## Acceptance Criteria

- [ ] P95 response time reduced to <500ms (from 1,850ms)
- [ ] SQL queries per request reduced to <15 (from 45-60)
- [ ] No UI/UX changes - all existing functionality works
- [ ] All existing tests pass
- [ ] Performance improvement validated in staging

---

## Technical Details

### File to Modify
- `app/controllers/issues_controller.rb` (line 55)

### Current Code
```ruby
@issues = @query.issues(:offset => @issue_pages.offset, :limit => @issue_pages.per_page)
```

### Proposed Change
```ruby
@issues = @query.issues(
  :offset => @issue_pages.offset, 
  :limit => @issue_pages.per_page,
  :include => [
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
  ]
)
```

### Database Indexes (Suggested - requires DBA approval)
```sql
-- DO NOT EXECUTE - review with DBA first
CREATE INDEX CONCURRENTLY idx_issues_project_status_created 
ON issues(project_id, status_id, created_on DESC) 
WHERE project_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_issue_relations_issue_id 
ON issue_relations(issue_id);

CREATE INDEX CONCURRENTLY idx_custom_values_issue 
ON custom_values(customized_type, customized_id) 
WHERE customized_type = 'Issue';
```

---

## Test Plan

### Unit Tests
```ruby
# test/controllers/issues_controller_test.rb
test "index should eager load associations" do
  get :index
  assert_response :success
  
  # Verify no N+1 queries
  queries = []
  ActiveRecord::Base.logger = ActiveSupport::Logger.new(StringIO.new)
  ActiveRecord::Base.logger.level = Logger::DEBUG
  
  assert_difference -> { ActiveRecord::Base.connection.query_cache.clear; 
    queries.count }, 0 do
    assigns(:issues).each do |issue|
      issue.relations_from.to_a
      issue.custom_values.to_a
      issue.watchers.to_a
    end
  end
end
```

### Integration Test
```ruby
# test/integration/issues_index_performance_test.rb
test "issues index should respond quickly" do
  get "/issues"
  assert_response :success
  assert response.headers['X-Runtime'].to_f < 0.5, 
    "Response time should be under 500ms"
end
```

### Performance Test
1. Create test data: 1000+ issues across multiple projects
2. Log in as user with access to all projects
3. Navigate to `/issues`
4. Capture SQL query count (should be <15)
5. Measure response time (should be <500ms p95)

---

## Risk Assessment

**Risk Level**: Low

**Reasoning**:
- Changes are additive (adding `includes()` parameter)
- No data model changes
- No breaking API changes
- Easy to rollback

**Rollback Plan**:
Simply remove the `:include` parameter to revert to original code.

---

## Dependencies

- None

---

## Related Issues

- FINDING-002: IssuesController#show has similar N+1 issues
- See `performance_analysis/summary.json` for related findings

---

## Additional Notes

- Full analysis: `performance_analysis/findings/FINDING-001.md`
- EXPLAIN ANALYZE templates: `performance_analysis/scripts/run_explain.sql`
- Measurement commands: See finding document

---

## Implementation Checklist

- [ ] Review finding document
- [ ] Update `app/controllers/issues_controller.rb` with eager loading
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Test in staging environment
- [ ] Validate performance improvement (p95 < 500ms)
- [ ] Review with DBA for index recommendations
- [ ] Create PR with code changes
- [ ] Code review
- [ ] Deploy to staging
- [ ] Monitor performance metrics
- [ ] Deploy to production

---

**Created**: 2025-10-31  
**Author**: Performance Analysis Team  
**Labels**: performance, optimization, n+1, high-priority

