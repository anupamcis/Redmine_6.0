#!/usr/bin/env ruby
# frozen_string_literal: true

# Code Analyzer for Redmine Performance Analysis
# Analyzes controllers and views for common performance anti-patterns
# Usage: ruby code_analyzer.rb

require 'json'

FINDINGS = []
BASE_PATH = File.expand_path('../..', __FILE__)

def analyze_file(file_path, file_type)
  return unless File.exist?(file_path)
  
  content = File.read(file_path)
  relative_path = file_path.sub(BASE_PATH + '/', '')
  
  # N+1 detection patterns
  patterns = {
    # Controller patterns
    'no_includes' => {
      regex: /def\s+\w+\s*.*?\n.*?(@\w+\s*=\s*\w+\.(all|where|find_by))[^}]*?(?!includes|preload|joins)/m,
      issue: 'Missing eager loading - potential N+1',
      severity: 'high'
    },
    'each_without_eager' => {
      regex: /@\w+\.each\s+do\s*\|\w+\|/,
      issue: 'Iteration without eager loading',
      severity: 'medium'
    },
    # View patterns
    'association_in_view' => {
      regex: /<%=\s*@?\w+\.\w+\.(each|map|collect|select)\s+do/,
      issue: 'Association access in view - potential N+1',
      severity: 'high'
    },
    'count_in_loop' => {
      regex: /\.count/,
      issue: 'Count query in loop - use counter_cache',
      severity: 'medium'
    },
    # Unbounded queries
    'all_without_limit' => {
      regex: /\.all\b(?!.*limit)/,
      issue: 'Unbounded query - consider pagination',
      severity: 'high'
    },
    'to_a_without_limit' => {
      regex: /\.to_a\b(?!.*limit)/,
      issue: 'Loading all records into memory',
      severity: 'medium'
    }
  }
  
  patterns.each do |pattern_name, config|
    matches = content.scan(config[:regex])
    next if matches.empty?
    
    # Get line numbers
    content.lines.each_with_index do |line, idx|
      if line =~ config[:regex]
        FINDINGS << {
          file: relative_path,
          file_type: file_type,
          line: idx + 1,
          pattern: pattern_name,
          issue: config[:issue],
          severity: config[:severity],
          code_snippet: line.strip[0..100]
        }
      end
    end
  end
end

def analyze_controllers
  puts "Analyzing controllers..."
  controllers_dir = File.join(BASE_PATH, 'app/controllers')
  
  Dir.glob("#{controllers_dir}/**/*_controller.rb").each do |file|
    analyze_file(file, 'controller')
  end
  
  # Analyze plugin controllers
  Dir.glob("#{BASE_PATH}/plugins/*/app/controllers/**/*_controller.rb").each do |file|
    analyze_file(file, 'plugin_controller')
  end
end

def analyze_views
  puts "Analyzing views..."
  views_dir = File.join(BASE_PATH, 'app/views')
  
  Dir.glob("#{views_dir}/**/*.erb").each do |file|
    analyze_file(file, 'view')
  end
  
  # Analyze plugin views
  Dir.glob("#{BASE_PATH}/plugins/*/app/views/**/*.erb").each do |file|
    analyze_file(file, 'plugin_view')
  end
end

def analyze_models
  puts "Analyzing models..."
  models_dir = File.join(BASE_PATH, 'app/models')
  
  Dir.glob("#{models_dir}/**/*.rb").each do |file|
    content = File.read(file)
    relative_path = file.sub(BASE_PATH + '/', '')
    
    # Check for missing indexes hints
    if content =~ /has_many|has_one|belongs_to/ && content !~ /index|counter_cache/
      # This is a hint - not a finding, but could indicate missing indexes
    end
  end
end

puts "=" * 80
puts "Code Performance Analysis"
puts "=" * 80

analyze_controllers
analyze_views
analyze_models

# Group findings by file
grouped = FINDINGS.group_by { |f| f[:file] }

puts "\n" + "=" * 80
puts "Summary: Found #{FINDINGS.size} potential performance issues"
puts "=" * 80

# Show top files with issues
top_files = grouped.sort_by { |file, findings| -findings.size }.first(10)

puts "\nTop 10 Files with Potential Issues:"
puts "-" * 80
top_files.each do |file, findings|
  puts "#{file}: #{findings.size} issues"
  findings.first(3).each do |finding|
    puts "  Line #{finding[:line]}: #{finding[:issue]} (#{finding[:severity]})"
  end
end

# Output JSON
Dir.mkdir('performance_analysis/results') rescue nil
File.write('performance_analysis/results/code_analysis.json', JSON.pretty_generate({
  generated_at: Time.now.iso8601,
  total_findings: FINDINGS.size,
  findings_by_severity: FINDINGS.group_by { |f| f[:severity] }.transform_values(&:count),
  findings: FINDINGS,
  top_files: top_files.map { |file, findings| { file: file, count: findings.size } }
}))

puts "\n✓ Code analysis complete. Results saved to performance_analysis/results/code_analysis.json"

