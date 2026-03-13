# Caching Implementation Guide

**Date**: 2025-10-31  
**Status**: ✅ Implemented

## Overview

Caching has been added to critical endpoints to improve performance. The caching strategy includes:
- **Query Result Caching**: Cache the entire issue list query result
- **Eager Loading**: Combined with caching for maximum performance
- **Cache Invalidation**: Automatic expiration and manual clear options

---

## Implementation Details

### FINDING-001: IssuesController#index

**Location**: `app/controllers/issues_controller.rb` (lines 57-103)

**Caching Strategy**:
- **Cache Key**: Based on query signature (filters, columns, sort, group), page number, user ID, and per_page
- **TTL**: 2 minutes (balances freshness with performance)
- **Race Condition Protection**: 10 second grace period
- **Cache Scope**: Entire query result with all eager-loaded associations

**Cache Key Format**:
```
issues/index/{query_hash}/{page}/{user_id}/{per_page}
```

**What's Cached**:
- Complete issue list (25 issues by default)
- All eager-loaded associations (project, tracker, status, author, etc.)
- Batch-loaded relations and computed data

**Cache Invalidation**:
- Automatic: Expires after 2 minutes
- Manual: `Rails.cache.clear` or `Rails.cache.delete_matched("issues/index/*")`

### FINDING-002: IssuesController#show

**Location**: `app/controllers/issues_controller.rb` (lines 149-179)

**Caching Strategy**:
- Issue is eager-loaded from the start via `find_issue_with_eager_load`
- No additional caching added (eager loading should be sufficient)
- Can add fragment caching in views if needed

---

## Cache Configuration

### Current Setup

**Development** (config/environments/development.rb):
```ruby
config.cache_store = :memory_store  # or :null_store if debugging
```

**Production** (config/environments/production.rb):
```ruby
# Default: :file_store (uses tmp/cache)
# Recommended: Use :mem_cache_store or :redis_cache_store for better performance
```

### Recommended Production Cache Store

For best performance in production, use **Redis** or **Memcached**:

**Option 1: Redis (Recommended)**
```ruby
# In config/environments/production.rb
config.cache_store = :redis_cache_store, {
  url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
  expires_in: 2.minutes,
  namespace: 'redmine_cache'
}
```

**Option 2: Memcached**
```ruby
# In config/environments/production.rb
config.cache_store = :mem_cache_store, 'localhost:11211', {
  namespace: 'redmine_cache',
  expires_in: 2.minutes
}
```

**Benefits**:
- Faster cache reads/writes
- Shared cache across multiple application servers
- Better memory management
- Can persist cache across application restarts (Redis)

---

## Cache Performance Impact

### Expected Improvements

**Before Caching**:
- IssuesController#index: 1.85s p95, 45-60 SQL queries
- Each request: Full query execution + eager loading

**After Caching**:
- **First Request**: Same as before (cache miss)
- **Subsequent Requests (within 2 min)**: 
  - Response time: **<50ms** (cache hit)
  - SQL queries: **0** (everything from cache)
  - Expected improvement: **95%+ reduction** in response time for cached requests

**Cache Hit Rate Expected**:
- Assuming users browse multiple pages: **60-80% cache hit rate**
- Overall p95 improvement: **70-85% reduction** in average response time

---

## Monitoring Cache Performance

### Check Cache Hit Rate

```ruby
# In Rails console or add to controller temporarily
Rails.cache.stats rescue nil  # Works with memcached_store
# Or check logs for cache hits/misses
```

### Enable Cache Logging

```ruby
# In config/environments/production.rb (temporarily for debugging)
config.cache_store = :file_store
config.log_level = :debug
```

Then check logs for:
```
Cache read: issues/index/abc123...
Cache write: issues/index/abc123...
```

### Manual Cache Management

```ruby
# Clear all cache
Rails.cache.clear

# Clear specific pattern
Rails.cache.delete_matched("issues/index/*")

# Check if key exists
Rails.cache.exist?("issues/index/abc123/1/123/25")

# Delete specific key
Rails.cache.delete("issues/index/abc123/1/123/25")
```

---

## Cache Invalidation Strategy

### Automatic Invalidation
- **TTL-based**: Cache expires after 2 minutes automatically
- **Race condition protection**: 10 second grace period prevents thundering herd

### Manual Invalidation Options

**Option 1: Clear on Issue Update (Recommended)**
```ruby
# In app/models/issue.rb, add after_update callback
after_update :clear_issues_index_cache

def clear_issues_index_cache
  # Clear cache for all pages and queries that might include this issue
  Rails.cache.delete_matched("issues/index/*") rescue nil
end
```

**Option 2: Clear via Rails Console**
```ruby
Rails.cache.delete_matched("issues/index/*")
```

**Option 3: Scheduled Clear (via cron/background job)**
```ruby
# Every 2 minutes (slightly after cache TTL)
Rails.cache.delete_matched("issues/index/*")
```

---

## Tuning Cache Settings

### Adjust TTL

**For Fresh Data (Shorter TTL)**:
```ruby
expires_in: 30.seconds  # More fresh, less cache benefit
```

**For Better Performance (Longer TTL)**:
```ruby
expires_in: 5.minutes  # Better cache hit rate, slightly stale data
```

**Recommended**: 2 minutes (current) - good balance

### Adjust Race Condition TTL

```ruby
race_condition_ttl: 5.seconds   # Shorter grace period
race_condition_ttl: 30.seconds  # Longer grace period (better for high traffic)
```

---

## Cache Size Management

### File Store (Default)
- Location: `tmp/cache`
- Size: Limited by disk space
- Cleanup: Automatic via Rails, or manual: `rails tmp:cache:clear`

### Redis Store
- Set max memory in Redis config
- Use eviction policy: `allkeys-lru`
- Monitor: `redis-cli INFO memory`

### Memcached Store
- Set `-m` flag for memory limit (e.g., `-m 1024` for 1GB)
- Monitor: `echo stats | nc localhost 11211`

---

## Troubleshooting

### Cache Not Working

1. **Check cache store is enabled**:
   ```ruby
   Rails.cache.class  # Should not be NullStore
   ```

2. **Check cache is writable**:
   ```ruby
   Rails.cache.write('test', 'value')
   Rails.cache.read('test')  # Should return 'value'
   ```

3. **Check cache key generation**:
   ```ruby
   # In controller, log the cache key
   Rails.logger.info "Cache key: #{cache_key}"
   ```

### Cache Causing Stale Data

- **Reduce TTL**: Change `expires_in: 2.minutes` to `expires_in: 30.seconds`
- **Add manual invalidation**: Clear cache on issue updates (see above)
- **Use cache versioning**: Include issue.updated_on in cache key (more complex)

### Memory Issues

- **Use external cache store**: Redis or Memcached instead of :memory_store
- **Reduce cache size**: Clear cache more frequently
- **Monitor cache growth**: Check cache size regularly

---

## Best Practices

1. **Monitor cache hit rate**: Aim for 60%+ hit rate
2. **Set appropriate TTL**: Balance freshness vs performance
3. **Use external cache store**: For production, use Redis/Memcached
4. **Clear cache on updates**: Invalidate related cache when data changes
5. **Test cache behavior**: Verify cache hits/misses in staging
6. **Monitor memory**: Ensure cache doesn't grow unbounded

---

## Next Steps

1. **Configure production cache store**: Set up Redis or Memcached
2. **Monitor performance**: Track cache hit rates and response times
3. **Add cache invalidation**: Implement hooks to clear cache on updates
4. **Extend to other endpoints**: Apply caching to ProjectsController, etc.

---

## Rollback

If caching causes issues:

```ruby
# Remove caching from issues_controller.rb
# Change:
@issues = Rails.cache.fetch(cache_key, expires_in: 2.minutes) do
  # ... code ...
end

# To:
@issues = begin
  # ... code ...
end
```

Or disable caching entirely:
```ruby
# In config/environments/production.rb
config.action_controller.perform_caching = false
```

