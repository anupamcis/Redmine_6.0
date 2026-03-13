#!/usr/bin/env ruby
# Performance Cache Testing Script
# Tests actual cache performance for optimized endpoints

require 'benchmark'
require 'net/http'
require 'uri'

# Configuration
BASE_URL = 'http://192.168.2.156'
TEST_PROJECT = 'test-akeel'
USER_AGENT = 'Performance-Test-Script/1.0'

# Test endpoints
ENDPOINTS = {
  'Projects#show' => "/projects/#{TEST_PROJECT}",
  'Projects#index' => '/projects',
  'Issues#index' => '/issues',
  'Reports#issue_report' => "/projects/#{TEST_PROJECT}/issues/report",
  'Calendars#show' => "/projects/#{TEST_PROJECT}/calendar",
  'Gantts#show' => "/projects/#{TEST_PROJECT}/gantt"
}

def make_request(endpoint, clear_cache: false)
  uri = URI("#{BASE_URL}#{endpoint}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.read_timeout = 30
  http.open_timeout = 10
  
  request = Net::HTTP::Get.new(uri)
  request['User-Agent'] = USER_AGENT
  request['Cache-Control'] = 'no-cache' if clear_cache
  
  response = nil
  time = Benchmark.realtime do
    response = http.request(request)
  end
  
  {
    code: response.code.to_i,
    time: (time * 1000).round(2), # Convert to milliseconds
    size: response.body.length
  }
rescue => e
  {
    code: 0,
    time: 0,
    error: e.message
  }
end

def test_endpoint(name, endpoint)
  puts "\n#{'=' * 60}"
  puts "Testing: #{name}"
  puts "#{endpoint}"
  puts "#{'=' * 60}"
  
  # First request (cache miss)
  puts "\n[1st Request] (Cache Miss - Populating Cache)..."
  first_result = make_request(endpoint, clear_cache: true)
  
  if first_result[:error]
    puts "  ✗ Error: #{first_result[:error]}"
    return
  end
  
  puts "  Status: #{first_result[:code]}"
  puts "  Time: #{first_result[:time]} ms"
  puts "  Size: #{first_result[:size]} bytes"
  
  # Wait a moment
  sleep 1
  
  # Second request (cache hit)
  puts "\n[2nd Request] (Cache Hit - Should be faster)..."
  second_result = make_request(endpoint, clear_cache: false)
  
  if second_result[:error]
    puts "  ✗ Error: #{second_result[:error]}"
    return
  end
  
  puts "  Status: #{second_result[:code]}"
  puts "  Time: #{second_result[:time]} ms"
  puts "  Size: #{second_result[:size]} bytes"
  
  # Calculate improvement
  if first_result[:time] > 0 && second_result[:time] > 0
    improvement = ((first_result[:time] - second_result[:time]) / first_result[:time] * 100).round(1)
    puts "\n  Improvement: #{improvement}% faster"
    
    if improvement > 50
      puts "  ✓ Excellent cache performance!"
    elsif improvement > 20
      puts "  ✓ Good cache performance"
    else
      puts "  ⚠ Cache may not be working optimally"
    end
  end
end

# Main execution
puts "\n" + "=" * 60
puts "Performance Cache Testing"
puts "=" * 60
puts "\nBase URL: #{BASE_URL}"
puts "Note: This script requires the server to be running"
puts "      and proper authentication cookies may be needed"
puts "\nPress Ctrl+C to cancel, or Enter to continue..."
STDIN.gets

ENDPOINTS.each do |name, endpoint|
  test_endpoint(name, endpoint)
  sleep 2 # Brief pause between endpoints
end

puts "\n" + "=" * 60
puts "Testing Complete!"
puts "=" * 60
puts "\nNote: If you see authentication errors, you may need to:"
puts "  1. Log in via browser first"
puts "  2. Copy authentication cookies to this script"
puts "  3. Or test manually via browser DevTools"
puts "\n"

