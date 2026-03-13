# Performance Optimizations Testing Guide

## Overview
This guide helps you test and verify that all performance optimizations are working correctly.

## Prerequisites
1. Rails server is running
2. Caching is enabled (already configured)
3. Access to Rails console and server logs

## Testing Checklist

### 1. Verify Caching is Enabled

#### In Rails Console:
```bash
cd /home/cis/pms/new-pms-cursur/redmine-6.0
rails runner "puts Rails.cache.class"
```

**Expected Output**: `ActiveSupport::Cache::MemoryStore` (not `NullStore`)

#### Check Development Cache File:
```bash
ls -la tmp/caching-dev.txt
```

**Expected**: File should exist

---

### 2. Test ProjectsController#show (FINDING-009)

#### Test URL:
- First load: `http://192.168.2.156/projects/test-akeel`
- Second load: Same URL (should be faster)

#### What to Check:
1. **First Request**:
   - Check server logs for cache operations
   - Look for `[CACHE MISS]` messages
   - Note response time (may still be 7-8 seconds on first load)

2. **Second Request** (within 30 minutes):
   - Should be **much faster** (< 1 second)
   - Look for `[CACHE HIT]` messages in logs
   - Response should be significantly faster

#### In Rails Console:
```ruby
# Check if cache is populated
cache_key = "projects/show/#{Project.find_by(identifier: 'test-akeel')&.id}/#{User.current.id}/false/issue_stats"
Rails.cache.exist?(cache_key)
```

**Expected**: `true` after first page load

---

### 3. Test ProjectsController#index (FINDING-003)

#### Test URL:
- `http://192.168.2.156/projects`

#### What to Check:
1. **First Load**:
   - Projects list loads
   - Check logs for cache misses

2. **Second Load**:
   - Should load from cache
   - Much faster response time

---

### 4. Test IssuesController#index (FINDING-001)

#### Test URL:
- `http://192.168.2.156/issues`

#### What to Check:
1. **First Load**:
   - Issues list loads normally
   - Check logs

2. **Second Load**:
   - Should be faster (cached)
   - Look for cache hits

---

### 5. Test ReportsController#issue_report (FINDING-005)

#### Test URL:
- `http://192.168.2.156/projects/test-akeel/issues/report`

#### What to Check:
1. **First Load**:
   - Report data loads (may take time)
   - Multiple `Issue.by_*` queries executed

2. **Second Load**:
   - Should load much faster from cache
   - All report data should be cached

---

### 6. Test CalendarsController#show (FINDING-004)

#### Test URL:
- `http://192.168.2.156/projects/test-akeel/calendar`

#### What to Check:
1. Calendar events load
2. Second load should be faster (cached for 5 minutes)

---

### 7. Test GanttsController#show (FINDING-007)

#### Test URL:
- `http://192.168.2.156/projects/test-akeel/gantt`

#### What to Check:
1. Gantt chart renders
2. Second load should be faster (cached for 5 minutes)

---

## Manual Performance Testing

### Using Browser DevTools:

1. **Open Browser Developer Tools** (F12)
2. **Go to Network Tab**
3. **Enable "Disable cache" toggle** (to test fresh loads)
4. **Clear browser cache**
5. **Load page** - Note the response time
6. **Disable "Disable cache"**
7. **Reload page** - Should be much faster

### Expected Improvements:

| Endpoint | First Load | Cached Load | Improvement |
|----------|-----------|-------------|-------------|
| Projects#show | 7-8s | <1s | 85-90% |
| Projects#index | 2-3s | <500ms | 75-85% |
| Issues#index | 1.8s | <100ms | 90-95% |
| Reports#issue_report | 5-10s | <500ms | 90-95% |
| Calendars#show | 3-5s | <500ms | 85-90% |
| Gantts#show | 4-6s | <1s | 80-85% |

---

## Automated Testing Script

Run the following script to check cache status:

```bash
#!/bin/bash
cd /home/cis/pms/new-pms-cursur/redmine-6.0

echo "=== Performance Testing ==="
echo ""

# Check cache store
echo "1. Checking cache store..."
rails runner "puts 'Cache Store: ' + Rails.cache.class.name"

# Check if cache is working
echo ""
echo "2. Testing cache write/read..."
rails runner "
  Rails.cache.write('test_key', 'test_value', expires_in: 1.minute)
  if Rails.cache.read('test_key') == 'test_value'
    puts '✓ Cache is working correctly'
  else
    puts '✗ Cache is NOT working'
  end
"

# Check cache statistics
echo ""
echo "3. Cache memory usage..."
rails runner "
  if Rails.cache.respond_to?(:stats)
    puts Rails.cache.stats
  else
    puts 'Memory store - stats not available'
  end
"
```

---

## Monitoring Cache Performance

### In Rails Console:

```ruby
# Check cache keys for a project
project = Project.find_by(identifier: 'test-akeel')
user_id = User.current.id
cache_base = "projects/show/#{project.id}/#{user_id}/false"

# Check what's cached
Rails.cache.exist?("#{cache_base}/principals_by_role")
Rails.cache.exist?("#{cache_base}/subprojects")
Rails.cache.exist?("#{cache_base}/trackers")
Rails.cache.exist?("#{cache_base}/issue_stats")
Rails.cache.exist?("#{cache_base}/time_entries")
```

### Clear Cache (if needed):

```ruby
# Clear all cache
Rails.cache.clear

# Clear specific cache
Rails.cache.delete("projects/show/#{project.id}/#{user_id}/false/issue_stats")
```

---

## Log Monitoring

### Watch for Cache Operations:

```bash
# In development, watch logs for cache hits/misses
tail -f log/development.log | grep -E "CACHE|Rendered|Completed"
```

### Expected Log Messages:

```
[CACHE MISS] projects/show/123/456/false/issue_stats
[CACHE HIT] projects/show/123/456/false/trackers
```

---

## Troubleshooting

### Cache Not Working?

1. **Check cache store**:
   ```ruby
   Rails.cache.class
   # Should NOT be NullStore
   ```

2. **Check if caching is enabled**:
   ```ruby
   Rails.application.config.action_controller.perform_caching
   # Should be true
   ```

3. **Restart Rails server** after configuration changes

### Still Slow After Caching?

1. **First load is expected to be slow** (cache is being populated)
2. **Check if cache keys match** between requests
3. **Verify cache TTL hasn't expired**
4. **Check for database query issues** (N+1 queries)

### Cache Memory Issues?

1. Monitor memory usage
2. Reduce cache TTL values if needed
3. Consider upgrading to Redis/Memcached for production

---

## Performance Metrics Collection

### Before Optimizations:
- Note baseline response times
- Check SQL query counts
- Monitor database time

### After Optimizations:
- Measure improvement percentage
- Verify SQL query reduction
- Check cache hit rates

---

## Success Criteria

✅ **Cache is enabled and working**  
✅ **Second page loads are significantly faster**  
✅ **Cache hits are logged in development**  
✅ **No errors in application logs**  
✅ **Database query count reduced on cached requests**

---

## Next Steps

1. Run through all test endpoints
2. Verify cache hits in logs
3. Measure performance improvements
4. Report any issues found
5. Consider database index optimizations for SearchController

