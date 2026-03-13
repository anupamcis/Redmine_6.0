-- EXPLAIN ANALYZE Template for Redmine Performance Analysis
-- Usage: Run these queries on a read-only database replica
-- Replace placeholder values (?) with actual representative values

-- ============================================================
-- Common Heavy Queries to Analyze
-- ============================================================

-- 1. Projects List Query
-- Typical query from ProjectsController#index
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  projects.*,
  COUNT(DISTINCT members.user_id) as member_count
FROM projects
LEFT JOIN members ON members.project_id = projects.id
WHERE projects.status = 1
  AND (projects.is_public = true OR projects.id IN (
    SELECT DISTINCT project_id FROM members WHERE user_id = ?
  ))
GROUP BY projects.id
ORDER BY projects.created_on DESC
LIMIT 25 OFFSET 0;

-- 2. Issues List Query
-- Typical query from IssuesController#index
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  issues.*,
  projects.name as project_name,
  trackers.name as tracker_name,
  issue_statuses.name as status_name,
  priorities.name as priority_name
FROM issues
LEFT JOIN projects ON issues.project_id = projects.id
LEFT JOIN trackers ON issues.tracker_id = trackers.id
LEFT JOIN issue_statuses ON issues.status_id = issue_statuses.id
LEFT JOIN enumerations as priorities ON issues.priority_id = priorities.id
WHERE issues.project_id IN (
  SELECT id FROM projects WHERE status = 1 
  AND (is_public = true OR id IN (SELECT project_id FROM members WHERE user_id = ?))
)
ORDER BY issues.created_on DESC
LIMIT 25 OFFSET 0;

-- 3. Issue Show with Relations
-- From IssuesController#show
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  issues.*,
  projects.*,
  trackers.*,
  issue_statuses.*,
  priorities.*
FROM issues
INNER JOIN projects ON issues.project_id = projects.id
LEFT JOIN trackers ON issues.tracker_id = trackers.id
LEFT JOIN issue_statuses ON issues.status_id = issue_statuses.id
LEFT JOIN enumerations as priorities ON issues.priority_id = priorities.id
WHERE issues.id = ?;

-- 4. Journals for Issue (N+1 candidate)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT journals.*, users.*
FROM journals
LEFT JOIN users ON journals.user_id = users.id
WHERE journals.journalized_id = ? 
  AND journals.journalized_type = 'Issue'
ORDER BY journals.created_on ASC;

-- 5. Members Query (Common N+1)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT members.*, users.*, roles.*
FROM members
LEFT JOIN users ON members.user_id = users.id
LEFT JOIN member_roles ON member_roles.member_id = members.id
LEFT JOIN roles ON member_roles.role_id = roles.id
WHERE members.project_id = ?;

-- 6. Custom Fields Query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT custom_fields.*, custom_values.*
FROM custom_fields
LEFT JOIN custom_values ON custom_values.custom_field_id = custom_fields.id
WHERE custom_values.customized_type = 'Issue'
  AND custom_values.customized_id IN (?, ?, ?, ?, ?);

-- 7. Time Entries Query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT time_entries.*, users.*, activities.*
FROM time_entries
LEFT JOIN users ON time_entries.user_id = users.id
LEFT JOIN enumerations as activities ON time_entries.activity_id = activities.id
WHERE time_entries.issue_id = ?
ORDER BY time_entries.spent_on DESC;

-- 8. Watchers Query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT watchers.*, users.*
FROM watchers
LEFT JOIN users ON watchers.user_id = users.id
WHERE watchers.watchable_type = 'Issue'
  AND watchers.watchable_id = ?;

-- 9. Attachments Query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT attachments.*
FROM attachments
WHERE attachments.container_type = 'Issue'
  AND attachments.container_id IN (?, ?, ?, ?, ?)
ORDER BY attachments.created_on DESC;

-- 10. Project Hierarchy Query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH RECURSIVE project_tree AS (
  SELECT id, name, parent_id, 0 as level
  FROM projects
  WHERE id = ?
  UNION ALL
  SELECT p.id, p.name, p.parent_id, pt.level + 1
  FROM projects p
  INNER JOIN project_tree pt ON p.parent_id = pt.id
)
SELECT * FROM project_tree;

-- ============================================================
-- Index Recommendations (DO NOT EXECUTE - suggestions only)
-- ============================================================

-- Example index suggestions based on common query patterns:

-- Composite index for projects filtering
-- CREATE INDEX CONCURRENTLY idx_projects_status_public ON projects(status, is_public) WHERE status = 1;

-- Composite index for issues with project and status
-- CREATE INDEX CONCURRENTLY idx_issues_project_status ON issues(project_id, status_id) WHERE project_id IS NOT NULL;

-- Index for journals lookup
-- CREATE INDEX CONCURRENTLY idx_journals_journalized ON journals(journalized_type, journalized_id, created_on);

-- Index for members lookup
-- CREATE INDEX CONCURRENTLY idx_members_project_user ON members(project_id, user_id);

-- Index for custom values
-- CREATE INDEX CONCURRENTLY idx_custom_values_lookup ON custom_values(customized_type, customized_id, custom_field_id);

-- ============================================================
-- Notes:
-- ============================================================
-- 1. Replace ? with actual representative values (e.g., user_id = 1, project_id = 123)
-- 2. Run on read-only replica to avoid impacting production
-- 3. Look for:
--    - Seq Scan (should prefer Index Scan)
--    - High buffer reads
--    - High execution time
--    - Missing indexes (shown in plan)
-- 4. Save output to evidence/<finding_id>/explain_analyze_<query_name>.txt

