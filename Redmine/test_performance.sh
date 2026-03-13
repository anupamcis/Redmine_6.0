#!/bin/bash

# Performance Testing Script
# Tests that caching and optimizations are working correctly

cd /home/cis/pms/new-pms-cursur/redmine-6.0 || exit 1

echo "=========================================="
echo "Performance Optimizations Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run Rails runner command
run_rails() {
    rails runner "$1" 2>&1
}

# Test 1: Check Cache Store
echo "1. Checking Cache Store..."
CACHE_STORE=$(run_rails "puts Rails.cache.class.name")
if [[ "$CACHE_STORE" == *"MemoryStore"* ]]; then
    echo -e "${GREEN}✓ Cache Store: $CACHE_STORE${NC}"
else
    echo -e "${RED}✗ Cache Store: $CACHE_STORE (Expected MemoryStore)${NC}"
fi
echo ""

# Test 2: Check if caching is enabled
echo "2. Checking if caching is enabled..."
CACHING_ENABLED=$(run_rails "puts Rails.application.config.action_controller.perform_caching")
if [[ "$CACHING_ENABLED" == *"true"* ]]; then
    echo -e "${GREEN}✓ Caching is enabled${NC}"
else
    echo -e "${RED}✗ Caching is disabled${NC}"
fi
echo ""

# Test 3: Test cache write/read
echo "3. Testing cache write/read..."
CACHE_TEST=$(run_rails "
    Rails.cache.write('performance_test_key', 'test_value', expires_in: 1.minute)
    if Rails.cache.read('performance_test_key') == 'test_value'
      puts 'SUCCESS'
    else
      puts 'FAILED'
    end
")
if [[ "$CACHE_TEST" == *"SUCCESS"* ]]; then
    echo -e "${GREEN}✓ Cache read/write is working${NC}"
else
    echo -e "${RED}✗ Cache read/write failed${NC}"
fi
echo ""

# Test 4: Check cache-dev file
echo "4. Checking development cache file..."
if [ -f "tmp/caching-dev.txt" ]; then
    echo -e "${GREEN}✓ tmp/caching-dev.txt exists${NC}"
else
    echo -e "${YELLOW}⚠ tmp/caching-dev.txt not found (may still work)${NC}"
fi
echo ""

# Test 5: Check environment configuration
echo "5. Checking environment..."
ENV_MODE=$(run_rails "puts Rails.env")
echo "Environment: $ENV_MODE"
echo ""

# Test 6: List cache keys (if possible)
echo "6. Checking for cached data..."
echo "Run the following in Rails console to check specific cache keys:"
echo "  Rails.cache.exist?('projects/show/[PROJECT_ID]/[USER_ID]/false/issue_stats')"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start your Rails server: rbenv exec bundle exec puma -p 80"
echo "2. Visit http://192.168.2.156/projects/test-akeel"
echo "3. Check logs for [CACHE HIT] or [CACHE MISS] messages"
echo "4. Reload the page - second load should be much faster"
echo ""
echo "For detailed testing instructions, see: PERFORMANCE_TESTING.md"
echo ""

