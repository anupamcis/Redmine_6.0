#!/usr/bin/env ruby
# frozen_string_literal: true

# Log Parser for Redmine Performance Analysis
# Parses Rails production logs to extract slow endpoints
# Usage: ruby log_parse.rb [log_file_path] [--top-n=50]

require 'json'
require 'time'

TOP_N = (ARGV.find { |a| a.start_with?('--top-n=') } || '--top-n=50').split('=').last.to_i
LOG_FILE = ARGV.find { |a| !a.start_with?('--') } || 'log/production.log'

# Stats structure: { "Controller#action" => { requests: [], p50: 0, p95: 0, max: 0, count: 0 } }
stats = Hash.new { |h, k| h[k] = { requests: [], count: 0, controller: nil, action: nil } }

current_request = nil
request_start_time = nil

puts "Parsing log file: #{LOG_FILE}"
puts "Top N endpoints to analyze: #{TOP_N}"
puts "=" * 80

File.foreach(LOG_FILE) do |line|
  # Match: Processing by ProjectsController#index as HTML
  if line =~ /Processing by (\w+)#(\w+)/
    current_request = "#{$1}##{$2}"
    stats[current_request][:controller] = $1
    stats[current_request][:action] = $2
    
    # Extract timestamp if available
    if line =~ /\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+)/ 
      request_start_time = Time.parse($1) rescue nil
    end
  end
  
  # Match: Completed 200 OK in 1234ms (Views: 234.5ms | ActiveRecord: 890.1ms)
  # Or: Completed 200 OK in 1234ms
  if current_request && line =~ /Completed (\d{3})/ 
    # Extract timing
    if line =~ /in (\d+(?:\.\d+)?)ms/
      duration = $1.to_f
      stats[current_request][:requests] << duration
      stats[current_request][:count] += 1
      
      # Extract DB time if available
      if line =~ /ActiveRecord[:\s]+(\d+(?:\.\d+)?)ms/
        db_time = $1.to_f
        stats[current_request][:db_avg] ||= []
        stats[current_request][:db_avg] << db_time
      end
      
      # Extract View time if available
      if line =~ /Views[:\s]+(\d+(?:\.\d+)?)ms/
        view_time = $1.to_f
        stats[current_request][:view_avg] ||= []
        stats[current_request][:view_avg] << view_time
      end
    end
    
    current_request = nil
    request_start_time = nil
  end
  
  # Match SQL queries: (123.4ms)
  if current_request && line =~ /\((\d+(?:\.\d+)?)ms\)/
    stats[current_request][:sql_count] ||= 0
    stats[current_request][:sql_count] += 1
    stats[current_request][:sql_times] ||= []
    stats[current_request][:sql_times] << $1.to_f
  end
end

# Calculate percentiles and aggregates
results = []
stats.each do |endpoint, data|
  next if data[:requests].empty?
  
  requests = data[:requests].sort
  count = requests.size
  
  p50_idx = (count * 0.5).floor
  p95_idx = (count * 0.95).floor
  p99_idx = (count * 0.99).floor
  
  median = requests[p50_idx] || 0
  p95 = requests[p95_idx] || requests.last || 0
  p99 = requests[p99_idx] || requests.last || 0
  max = requests.last || 0
  min = requests.first || 0
  avg = requests.sum / count
  
  db_avg = data[:db_avg] ? (data[:db_avg].sum / data[:db_avg].size) : 0
  view_avg = data[:view_avg] ? (data[:view_avg].sum / data[:view_avg].size) : 0
  sql_count_avg = data[:sql_count] ? (data[:sql_count].to_f / count) : 0
  
  results << {
    endpoint: endpoint,
    controller: data[:controller],
    action: data[:action],
    count: count,
    metrics: {
      min: min.round(2),
      median: median.round(2),
      p50: median.round(2),
      p95: p95.round(2),
      p99: p99.round(2),
      max: max.round(2),
      avg: avg.round(2)
    },
    db_time_avg: db_avg.round(2),
    view_time_avg: view_avg.round(2),
    sql_queries_per_request: sql_count_avg.round(2),
    priority_score: calculate_priority_score(p95, count, db_avg)
  }
end

# Sort by priority score (p95 * request_count normalized)
results.sort_by! { |r| -r[:priority_score] }

# Output top N
puts "\nTop #{TOP_N} Slow Endpoints:\n"
puts "-" * 80
puts "%-30s %8s %8s %8s %8s %8s %8s %8s" % [
  "Endpoint", "Count", "Min", "P50", "P95", "Max", "Avg", "Priority"
]
puts "-" * 80

results.first(TOP_N).each_with_index do |result, idx|
  puts "%-30s %8d %8.1f %8.1f %8.1f %8.1f %8.1f %8.1f" % [
    result[:endpoint],
    result[:count],
    result[:metrics][:min],
    result[:metrics][:p50],
    result[:metrics][:p95],
    result[:metrics][:max],
    result[:metrics][:avg],
    result[:priority_score]
  ]
end

# Output JSON for further processing
puts "\n\nJSON Output (saving to performance_analysis/results/log_analysis.json):"
Dir.mkdir('performance_analysis/results') rescue nil
File.write('performance_analysis/results/log_analysis.json', JSON.pretty_generate({
  generated_at: Time.now.iso8601,
  log_file: LOG_FILE,
  top_n: TOP_N,
  findings: results.first(TOP_N)
}))

puts "✓ Analysis complete. Results saved to performance_analysis/results/log_analysis.json"

def calculate_priority_score(p95, count, db_avg)
  # Normalized priority: p95 (40%) + count*10 (30%) + db_avg (30%)
  # Using simple normalization factors
  p95_norm = p95 / 1000.0 * 40  # Assume 1s = 40 points
  count_norm = [Math.log10([count, 1].max) * 10, 30].min  # Log scale, max 30 points
  db_norm = db_avg / 1000.0 * 30  # Assume 1s DB = 30 points
  
  (p95_norm + count_norm + db_norm).round(2)
end

