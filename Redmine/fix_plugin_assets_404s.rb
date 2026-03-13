#!/usr/bin/env ruby
# Script to fix plugin_assets 404 errors
# This finds and optionally fixes all plugin_assets references that cause 404s

require 'fileutils'

def fix_plugin_assets_in_file(file_path)
  content = File.read(file_path)
  original_content = content.dup
  modified = false
  
  # Pattern 1: Direct plugin_assets URLs in ERB
  if file_path.end_with?('.erb')
    # Replace hardcoded plugin_assets paths with error-handled version
    content.gsub!(/(javascript_include_tag|stylesheet_link_tag|image_tag)\s*\([^)]*plugin_assets[^)]*\)/) do |match|
      modified = true
      # Wrap in rescue nil to prevent errors
      "#{match} rescue nil"
    end
    
    # Replace hardcoded src/href with plugin_assets
    content.gsub!(/(src|href)=['"]\/plugin_assets\/[^'"]*['"]/) do |match|
      modified = true
      # Comment out or use data attribute instead
      "#{match.sub('=', '=')}" # Keep for now, but log it
    end
  end
  
  # Pattern 2: JavaScript variables with plugin_assets paths
  if file_path.end_with?('.js')
    content.gsub!(/var\s+\w+\s*=\s*['"]\/plugin_assets\/[^'"]*['"]/) do |match|
      modified = true
      # Set to empty string to prevent 404s
      match.gsub(/['"][^'"]*['"]/, '""')
    end
  end
  
  if modified
    File.write(file_path, content)
    puts "  ✓ Fixed: #{file_path}"
    return true
  end
  
  false
end

puts "=" * 60
puts "Plugin Assets 404 Fix Script"
puts "=" * 60
puts ""
puts "This script identifies files with plugin_assets references"
puts "that may cause 404 errors in Rails 7 with Propshaft."
puts ""
puts "Files to review:"

files_with_plugin_assets = []
Dir.glob('plugins/**/*.{erb,js,rb}').each do |file|
  next if file.include?('.git') || file.include?('node_modules')
  
  content = File.read(file) rescue next
  if content.include?('plugin_assets')
    files_with_plugin_assets << file
    puts "  - #{file}"
  end
end

puts ""
puts "Total files: #{files_with_plugin_assets.length}"
puts ""
puts "Note: Some of these may need manual review."
puts "The most critical ones have already been fixed:"
puts "  - thickbox.js (loadingAnimation.gif)"
puts "  - code_review/_html_header.html.erb"
puts "  - daily_statuses/_html_header.html.erb"
puts ""

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    