# Performance Cache Configuration

## Overview
This document describes the caching configuration for performance optimizations in both development and production environments.

## Environment Configuration

### Development Environment
- **Cache Store**: `:memory_store` (64MB limit)
- **Status**: Always enabled for performance testing
- **Logging**: Cache hits/misses logged to console
- **File**: `config/environments/development.rb`

**Key Features:**
- Caching enabled by default (no need for `tmp/caching-dev.txt`)
- 64MB memory limit for cache
- Fragment cache logging enabled
- Cache operation logging for debugging

### Production Environment
- **Cache Store**: `:memory_store` (256MB limit)
- **Status**: Enabled by default
- **File**: `config/environments/production.rb`

**Key Features:**
- 256MB memory limit for cache
- Optimized for single-server deployments
- Can be upgraded to Memcached or Redis for multi-server setups

## Upgrading to Multi-Server Cache (Optional)

### Using Memcached
Uncomment and configure in `config/environments/production.rb`:
```ruby
config.cache_store = :mem_cache_store, 
  'cache-1.example.com', 
  'cache-2.example.com', 
  { namespace: 'redmine', expires_in: 30.minutes }
```

### Using Redis (Recommended)
Uncomment and configure in `config/environments/production.rb`:
```ruby
config.cache_store = :redis_cache_store, { 
  url: ENV['REDIS_URL'], 
  expires_in: 30.minutes, 
  namespace: 'redmine' 
}
```

## Cached Data

### ProjectsController#show
- **Principals by role**: 10 minutes TTL
- **Subprojects**: 5 minutes TTL (with eager loading)
- **News**: 2 minutes TTL
- **Trackers**: 10 minutes TTL
- **Issue statistics**: 30 minutes TTL
  - Open issues by tracker
  - Total issues by tracker
  - Estimated hours
- **Time entries**: 30 minutes TTL

### ProjectsController#index
- **Project list**: 2 minutes TTL
- **Board view**: 2 minutes TTL

### IssuesController#index
- **Issue list**: 2 minutes TTL
- **Query results**: Cached based on query signature

### CalendarsController#show
- **Calendar events**: 5 minutes TTL

## Cache Keys

Cache keys are constructed to include:
- Controller/Action
- Query parameters/signatures
- User ID (for permission-based caching)
- Project ID (where applicable)

Example: `projects/show/123/456/false/issue_stats`

## Verification

### Development
1. Check logs for `[CACHE HIT]` or `[CACHE MISS]` messages
2. Second page load should be significantly faster (<500ms)
3. Check Rails console:
   ```ruby
   Rails.cache.respond_to?(:read)
   ```

### Production
1. Monitor response times - cached requests should be <100ms
2. Check cache store memory usage
3. Monitor cache hit rates

## Clearing Cache

### Development
```bash
# Clear entire cache
rails runner "Rails.cache.clear"

# Or in Rails console
Rails.cache.clear
```

### Production
```bash
# Clear cache (be careful - will cause performance degradation)
rails runner "Rails.cache.clear" RAILS_ENV=production
```

## Performance Impact

### Expected Improvements
- **First request**: 30-50% faster (query optimizations)
- **Cached requests**: 70-90% faster (<100ms response time)
- **Database queries**: Reduced by 60-80% on cached pages

### Monitoring
- Watch for cache expiration patterns
- Monitor memory usage of cache store
- Track cache hit rates in logs

## Troubleshooting

### Cache Not Working
1. Verify `tmp/caching-dev.txt` exists (development)
2. Check `Rails.cache` is not `NullStore`
3. Verify `config.action_controller.perform_caching = true`
4. Check logs for cache operations

### Slow First Load
- This is expected - cache is being populated
- Second load should be fast
- If persistent, check database indexes

### Memory Issues
- Reduce cache TTL values
- Reduce cache store size
- Consider upgrading to Redis/Memcached

