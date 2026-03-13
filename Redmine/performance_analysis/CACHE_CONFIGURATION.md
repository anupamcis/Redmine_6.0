# Cache Configuration for Production

## Quick Setup Guide

### Step 1: Choose Cache Store

For production, use **Redis** (recommended) or **Memcached**.

### Step 2: Install Redis (if using Redis)

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Step 3: Add Redis Gem

```ruby
# In Gemfile
gem 'redis', '~> 5.0'

# Run
bundle install
```

### Step 4: Configure Cache Store

**File**: `config/environments/production.rb`

```ruby
# Replace the cache_store line with:
config.cache_store = :redis_cache_store, {
  url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
  namespace: 'redmine_cache',
  expires_in: 2.minutes,
  reconnect_attempts: 3
}
```

### Step 5: Set Environment Variable (Optional)

```bash
# In .env or environment configuration
export REDIS_URL=redis://localhost:6379/0
```

### Step 6: Test Cache

```bash
# In Rails console
Rails.cache.write('test', 'hello')
Rails.cache.read('test')  # Should return 'hello'
```

---

## Alternative: Memcached Setup

### Install Memcached

```bash
sudo apt-get install memcached
sudo systemctl start memcached
```

### Configure

```ruby
# In config/environments/production.rb
config.cache_store = :mem_cache_store, 'localhost:11211', {
  namespace: 'redmine_cache',
  expires_in: 2.minutes
}
```

---

## Cache Monitoring

### Check Cache Statistics

**Redis**:
```bash
redis-cli INFO stats
# Look for keyspace_hits and keyspace_misses
```

**Memcached**:
```bash
echo stats | nc localhost 11211
# Look for get_hits and get_misses
```

### Calculate Hit Rate

```
Hit Rate = hits / (hits + misses) * 100%
Target: > 60%
```

---

## Cache Maintenance

### Clear Cache

```bash
# Rails console
rails console
> Rails.cache.clear

# Or Redis directly
redis-cli FLUSHDB

# Or Memcached
echo flush_all | nc localhost 11211
```

### Monitor Cache Size

**Redis**:
```bash
redis-cli INFO memory
# Check used_memory_human
```

**Memcached**:
```bash
echo stats | nc localhost 11211 | grep bytes
```

---

## Performance Tuning

### Redis Settings

**redis.conf**:
```
maxmemory 1gb
maxmemory-policy allkeys-lru
```

### Memcached Settings

**/etc/memcached.conf**:
```
-m 1024        # 1GB memory limit
-I 64m         # Max item size
```

---

## Troubleshooting

### Cache Not Working

1. Check service is running:
   ```bash
   redis-cli ping  # Should return PONG
   # or
   echo stats | nc localhost 11211  # Should return stats
   ```

2. Check Rails can connect:
   ```ruby
   Rails.cache.redis.ping rescue nil
   ```

3. Check permissions:
   ```bash
   # Redis
   redis-cli CONFIG GET requirepass
   
   # If password required, update config:
   config.cache_store = :redis_cache_store, {
     url: 'redis://:password@localhost:6379/0'
   }
   ```

---

## Expected Results

After configuring Redis/Memcached:
- **Cache writes**: <5ms
- **Cache reads**: <1ms  
- **Cache hit rate**: 60-80% for issues/index
- **Overall improvement**: 70-85% faster response times

