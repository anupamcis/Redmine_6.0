# Quick Performance Test Guide

## ✅ Pre-flight Checks (Completed)

Your test script confirms:
- ✓ Cache Store: ActiveSupport::Cache::MemoryStore (working)
- ✓ Caching is enabled
- ✓ Cache read/write is working
- ✓ Development cache file exists

## 🧪 Manual Testing Steps

### Step 1: Start/Verify Server

Make sure your server is running:
```bash
# Check if server is running
curl -I http://192.168.2.156

# If not running, start it:
cd /home/cis/pms/new-pms-cursur/redmine-6.0
rbenv exec bundle exec puma -p 80
```

### Step 2: Test Project Page (Main Optimization)

1. **Open browser**: `http://192.168.2.156/projects/test-akeel`

2. **Open Browser DevTools** (F12):
   - Go to **Network** tab
   - Enable **"Disable cache"** checkbox
   - Clear browser cache

3. **First Load** (Cache Miss):
   - Load the page
   - Note the time in Network tab (may be 7-8 seconds)
   - Check server logs for `[CACHE MISS]` messages

4. **Second Load** (Cache Hit):
   - Disable "Disable cache" checkbox
   - Reload page (F5)
   - Should be **much faster** (< 1 second)
   - Check server logs for `[CACHE HIT]` messages

### Step 3: Check Server Logs

Watch the logs in real-time:
```bash
tail -f log/development.log | grep -E "CACHE|Completed|Rendered"
```

**Expected messages:**
```
[CACHE MISS] projects/show/...
[CACHE HIT] projects/show/...
Completed 200 OK in XXXms
```

### Step 4: Test Other Endpoints

Test these URLs (first load slow, second fast):
- Projects list: `http://192.168.2.156/projects`
- Issues list: `http://192.168.2.156/issues`
- Reports: `http://192.168.2.156/projects/test-akeel/issues/report`
- Calendar: `http://192.168.2.156/projects/test-akeel/calendar`
- Gantt: `http://192.168.2.156/projects/test-akeel/gantt`

## 📊 Expected Results

| Endpoint | First Load | Second Load | Improvement |
|----------|-----------|-------------|-------------|
| Projects#show | 7-8s | <1s | 85-90% |
| Projects#index | 2-3s | <500ms | 75-85% |
| Issues#index | 1.8s | <100ms | 90-95% |

## 🔍 Verification Commands

### Check if cache is populated:
```bash
cd /home/cis/pms/new-pms-cursur/redmine-6.0

# In Rails console
rails console

# Then run:
project = Project.find_by(identifier: 'test-akeel')
user_id = User.current.id
cache_key = "projects/show/#{project.id}/#{user_id}/false/issue_stats"
Rails.cache.exist?(cache_key)
# Should return: true (after first page load)
```

### Clear cache (if needed):
```ruby
Rails.cache.clear
```

## ⚠️ Troubleshooting

### If second load is still slow:

1. **Check cache is actually being used:**
   ```bash
   # Look for cache messages in logs
   grep "CACHE" log/development.log | tail -20
   ```

2. **Verify cache store:**
   ```ruby
   Rails.cache.class
   # Should be: ActiveSupport::Cache::MemoryStore
   ```

3. **Check if cache keys match:**
   - Cache keys include user ID, project ID, query params
   - Make sure you're logged in as the same user

4. **Restart server:**
   ```bash
   # Kill current server (Ctrl+C)
   # Restart:
   rbenv exec bundle exec puma -p 80
   ```

### If you see errors:

1. **Check server logs:**
   ```bash
   tail -f log/development.log
   ```

2. **Verify configuration:**
   ```bash
   ./test_performance.sh
   ```

## ✅ Success Indicators

- ✓ Second page load is significantly faster
- ✓ Cache hits logged in development logs
- ✓ Response time < 1 second for cached pages
- ✓ No errors in application logs

## 📝 Test Results Template

Fill this out after testing:

```
Test Date: ___________
Tester: ___________

Projects#show:
  First load: _____ seconds
  Second load: _____ seconds
  Improvement: _____ %

Projects#index:
  First load: _____ seconds
  Second load: _____ seconds
  Improvement: _____ %

Issues#index:
  First load: _____ seconds
  Second load: _____ seconds
  Improvement: _____ %

Notes:
_________________________________________________
_________________________________________________
```

