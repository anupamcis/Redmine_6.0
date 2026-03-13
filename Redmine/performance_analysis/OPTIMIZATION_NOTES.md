# Performance Optimization Notes

**Date**: 2025-10-31

## Additional Optimizations Applied

### FINDING-001: IssuesController#index

**Initial Implementation**:
- Added explicit `:include` parameter with multiple associations
- This was redundant as IssueQuery already handles conditional preloading

**Optimized Implementation**:
- Removed redundant includes
- IssueQuery already preloads associations based on visible columns (see `issue_query.rb:422-432`)
- Only added `Issue.load_visible_relations(@issues)` call to ensure relations are always loaded
- This is more efficient as it uses IssueQuery's optimized preloading logic

**Performance Impact**:
- Fewer redundant includes = cleaner query generation
- IssueQuery's conditional preloading is more efficient (only loads what's needed)
- Relations are batch-loaded efficiently via `load_visible_relations`

### FINDING-002: IssuesController#show

**Initial Implementation**:
- Reloaded issue with eager loading inside `show` action
- This caused two queries: one from `find_issue` before_action, then reload

**Optimized Implementation**:
1. **Created `find_issue_with_eager_load` method**:
   - Replaces standard `find_issue` for show action only
   - Loads issue with all associations from the start
   - Eliminates the need to reload

2. **Optimized show action**:
   - Removed redundant `.visible.preload()` calls on time_entries
   - Uses preloaded `@issue.time_entries.to_a` and filters in memory
   - Removed redundant `.exists?` query on changesets
   - Uses preloaded `@issue.changesets.to_a` to check in memory

**Performance Impact**:
- Single query to load issue with all associations (instead of 1 + reload)
- Eliminated N+1 queries for time_entries (was calling `.visible.preload()`)
- Eliminated unnecessary query for changesets existence check
- All data loaded upfront, filtered in memory

## Key Learnings

1. **IssueQuery is already optimized**: It conditionally preloads based on visible columns. Adding redundant includes can actually hurt performance.

2. **Batch loading is better**: `Issue.load_visible_relations` does efficient batch loading, better than individual includes for relations.

3. **Avoid reloading**: Instead of reloading with eager loading, create a custom finder method that loads correctly from the start.

4. **Use preloaded data**: Once associations are eager-loaded, use `.to_a` to work with in-memory collections instead of triggering new queries.

5. **In-memory filtering**: For scopes like `.visible`, if data is already loaded, filter in memory instead of querying again.

## Testing Recommendations

After these optimizations, verify:

1. **SQL Query Count**:
   - IssuesController#index: Should be <15 queries (down from 45-60)
   - IssuesController#show: Should be <10 queries (down from 35-50)

2. **Response Time**:
   - IssuesController#index: p95 <500ms (target)
   - IssuesController#show: p95 <400ms (target)

3. **No Regressions**:
   - All visible data still displays correctly
   - Relations, journals, time entries, etc. all show properly
   - No missing data due to filtering

