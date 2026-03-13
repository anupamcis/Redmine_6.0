# Extra full path added to fix loading errors on some installations.

# Zeitwerk expects this file to define AdvancedRoadmap::Gruff because of its
# location (advanced_roadmap/gruff.rb). Define the constant to satisfy the
# autoloader without changing the behavior of the original gruff patches.
module AdvancedRoadmap
  module Gruff
  end
end

if Object.const_defined?(:Magick)
  %w(
    base
    area
    bar
    line
    dot
    pie
    spider
    net
    stacked_area
    stacked_bar
    side_stacked_bar
    side_bar
    accumulator_bar

    scene

    mini/legend
    mini/bar
    mini/pie
    mini/side_bar
  ).each do |filename|
    require File.dirname(__FILE__) + "/gruff_disabled/#{filename}"
  end
end

# TODO bullet
