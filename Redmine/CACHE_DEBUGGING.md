# Cache Debugging Guide

## Issue: Second Load Still Slow (8.70 seconds)

The cache is configured correctly, but second load is still taking 8+ seconds. This suggests:

1. **Cache keys may not match** between requests
2. **Expensive queries inside cache blocks** are still running
3. **Other uncached operations** are taking time

## Debugging Steps

### Step 1: Check Cache Logs

After restarting server, load the page twice and check logs:

```bash
tail -f log/development.log | grep -E "CACHE|ISSUE_STATS|Completed"
```

**Expected on First Load:**
```
[CACHE MISS] projects/show/...
[CACHE MISS - Computing issue_stats]
[ISSUE_STATS COMPUTED] in XXXXms
```

**Expected on Second Load:**
```
[CACHE HIT] projects/show/...
[CACHE HIT - Using cached issue_stats]
```

### Step 2: Verify Cache Keys Match

In Rails console:
```ruby
project = Project.find_by(identifier: 'test-akeel')
user = User.current
with_subprojects = Setting.display_subprojects_issues?

cache_key_base = "projects/show/#{project.id}/#{user.id}/#{with_subprojects}"
puts "Cache key base: #{cache_key_base}"

# Check all cache keys
keys = [
  "#{cache_key_base}/principals_by_role",
  "#{cache_key_base}/subprojects",
  "#{cache_key_base}/news",
  "#{cache_key_base}/trackers",
  "#{cache_key_base}/issue_stats",
  "#{cache_key_base}/time_entries"
]

keys.each do |key|
  exists = Rails.cache.exist?(key)
  puts "#{exists ? '✓' : '✗'} #{key}"
end
```

### Step 3: Check Query Count

The logs show "132 queries" which is still high. Check what's generating these:

```ruby
# In Rails console after loading page
ActiveRecord::Base.logger = Logger.new(STDOUT)
# Load page again and count queries
```

### Step 4: Test Cache Directly

```ruby
# Test if cache is working for issue_stats specifically
project = Project.find_by(identifier: 'test-akeel')
user_id = User.current.id
cache_key = "projects/show/#{project.id}/#{user_id}/false/issue_stats"

# Write test data
test_data = { open: {}, total: {}, total_estimated_hours: nil }
Rails.cache.write(cache_key, test_data, expires_in: 30.minutes)

# Verify
Rails.cache.exist?(cache_key) # Should be true
Rails.cache.read(cache_key) # Should return test_data
```

## Possible Issues

### Issue 1: Cache Keys Not Matching

**Symptoms:**
- Second load shows `[CACHE MISS]` instead of `[CACHE HIT]`
- Cache keys differ between requests

**Solution:**
- Check if `User.current.id` is consistent
- Check if `with_subprojects` setting changed
- Verify project ID is consistent

### Issue 2: Queries Still Expensive

**Symptoms:**
- Cache is hit, but page still slow
- Logs show slow queries even with cache

**Solution:**
- The queries inside cache blocks are still slow
- Need to optimize the query itself or add timeout
- Consider making queries optional/async

### Issue 3: Other Uncached Operations

**Symptoms:**
- Cache is working, but other operations are slow
- View rendering, plugin hooks, etc.

**Solution:**
- Profile the request to find bottlenecks
- Check for N+1 queries in views
- Review plugin hooks

## Quick Fix: Make Issue Stats Optional

If issue statistics are causing the slowdown, we can make them lazy-load:

```ruby
# Skip expensive queries if they take too long
# Use defaults if timeout exceeded
```

## Monitoring Commands

### Watch Cache Operations in Real-Time:
```bash
tail -f log/development.log | grep --color=always -E "CACHE|ISSUE_STATS"
```

### Check Cache Memory Usage:
```ruby
# In Rails console
Rails.cache.respond_to?(:stats) && Rails.cache.stats
```

### Clear All Cache:
```ruby
Rails.cache.clear
```

## Next Steps

1. **Restart server** with new debug logging
2. **Load page twice** and check logs
3. **Share log output** to identify exact bottleneck
4. **Check if cache keys match** between requests
5. **Profile queries** to find slow ones

## Expected Behavior

After fixes:
- First load: 7-8 seconds (populating cache)
- Second load: < 1 second (from cache)
- Logs show clear cache hits/misses

