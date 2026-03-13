#!/usr/bin/env ruby
# frozen_string_literal: true

# SQL Query Analyzer for Redmine Performance Analysis
# Extracts SQL queries from logs and identifies heavy queries
# Usage: ruby sql_analyzer.rb [log_file_path]

require 'json'
require 'time'

LOG_FILE = ARGV[0] || 'log/production.log'

sql_queries = []
current_request = nil

puts "Analyzing SQL queries from: #{LOG_FILE}"
puts "=" * 80

File.foreach(LOG_FILE) do |line|
  # Match: Processing by Controller#action
  if line =~ /Processing by (\w+)#(\w+)/
    current_request = "#{$1}##{$2}"
  end
  
  # Match SQL queries with timing: (123.4ms)
  # Common patterns:
  # - SELECT ... (123.4ms)
  # - SELECT ... FROM ... WHERE ... (456.7ms)
  if line =~ /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i && line =~ /\((\d+(?:\.\d+)?)ms\)/
    duration = $1.to_f
    sql = line.strip
    
    # Extract table name
    table_match = sql.match(/\bFROM\s+(\w+)/i) || sql.match(/\bJOIN\s+(\w+)/i) || sql.match(/\bINTO\s+(\w+)/i)
    table = table_match ? table_match[1] : 'unknown'
    
    # Extract WHERE conditions (simplified)
    where_match = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|\()/i)
    conditions = where_match ? where_match[1].strip : nil
    
    sql_queries << {
      request: current_request,
      sql: sql,
      duration: duration,
      table: table,
      conditions: conditions,
      type: sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE)/i)[1].upcase rescue 'UNKNOWN'
    }
  end
  
  # Reset on Completed
  if line =~ /Completed/
    current_request = nil
  end
end

# Group by SQL pattern (normalized) to find repeated queries
sql_patterns = {}
sql_queries.each do |query|
  # Normalize SQL by removing specific values (basic normalization)
  normalized = query[:sql].gsub(/\d+/, '?').gsub(/'[^']*'/, '?')
  sql_patterns[normalized] ||= { count: 0, total_time: 0, avg_time: 0, queries: [], table: query[:table] }
  sql_patterns[normalized][:count] += 1
  sql_patterns[normalized][:total_time] += query[:duration]
  sql_patterns[normalized][:queries] << query
end

# Calculate averages
sql_patterns.each do |pattern, data|
  data[:avg_time] = data[:total_time] / data[:count]
end

# Sort by total impact (count * avg_time)
sorted_patterns = sql_patterns.sort_by { |pattern, data| -(data[:count] * data[:avg_time]) }

puts "\nTop 20 Most Impactful SQL Queries:\n"
puts "-" * 80
puts "%-6s %-10s %-8s %-8s %-30s" % ["Count", "Total(ms)", "Avg(ms)", "Max(ms)", "Table/Pattern"]
puts "-" * 80

sorted_patterns.first(20).each do |pattern, data|
  max_time = data[:queries].map { |q| q[:duration] }.max
  pattern_summary = pattern[0..80] + (pattern.length > 80 ? "..." : "")
  puts "%-6d %-10.2f %-8.2f %-8.2f %-30s" % [
    data[:count],
    data[:total_time],
    data[:avg_time],
    max_time,
    data[:table] || "unknown"
  ]
  puts "  Pattern: #{pattern_summary}"
  puts ""
end

# Detect N+1 patterns
puts "\n" + "=" * 80
puts "N+1 Query Detection:\n"
puts "-" * 80

# Group by request to detect multiple similar queries
requests_with_sql = sql_queries.group_by { |q| q[:request] }
n_plus_1_candidates = []

requests_with_sql.each do |request, queries|
  # Look for repeated queries with same pattern but different WHERE values
  queries_by_table = queries.group_by { |q| q[:table] }
  queries_by_table.each do |table, table_queries|
    if table_queries.size > 10 && table != 'unknown'
      # Check if they're similar (basic check - WHERE id = ? pattern)
      similar_count = table_queries.select { |q| q[:sql] =~ /WHERE.*id\s*=\s*\?/i }.size
      if similar_count > 10
        n_plus_1_candidates << {
          request: request,
          table: table,
          query_count: table_queries.size,
          sample_sql: table_queries.first[:sql]
        }
      end
    end
  end
end

if n_plus_1_candidates.any?
  n_plus_1_candidates.sort_by { |c| -c[:query_count] }.first(10).each do |candidate|
    puts "⚠️  #{candidate[:request]} - #{candidate[:query_count]} queries to #{candidate[:table]}"
    puts "   Sample: #{candidate[:sample_sql][0..100]}..."
    puts ""
  end
else
  puts "No obvious N+1 patterns detected in logs."
  puts "Note: This is a basic heuristic. Use Bullet gem for comprehensive detection."
end

# Output JSON
Dir.mkdir('performance_analysis/results') rescue nil
File.write('performance_analysis/results/sql_analysis.json', JSON.pretty_generate({
  generated_at: Time.now.iso8601,
  total_queries: sql_queries.size,
  unique_patterns: sql_patterns.size,
  top_queries: sorted_patterns.first(20).map { |pattern, data| {
    pattern: pattern,
    count: data[:count],
    avg_time: data[:avg_time],
    total_time: data[:total_time],
    table: data[:table]
  }},
  n_plus_1_candidates: n_plus_1_candidates
}))

puts "\n✓ SQL analysis complete. Results saved to performance_analysis/results/sql_analysis.json"

