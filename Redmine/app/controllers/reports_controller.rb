# frozen_string_literal: true

# Redmine - project management software
# Copyright (C) 2006-  Jean-Philippe Lang
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

class ReportsController < ApplicationController
  menu_item :issues
  before_action :find_project, :authorize, :find_issue_statuses

  include ReportsHelper
  def issue_report
    # Performance fix (FINDING-005): Cache expensive report aggregations
    with_subprojects = Setting.display_subprojects_issues?
    require 'digest/md5'
    cache_key_base = "reports/issue_report/#{@project.id}/#{User.current.id}/#{with_subprojects}"
    
    # Cache static data (changes infrequently)
    @trackers = Rails.cache.fetch("#{cache_key_base}/trackers", expires_in: 10.minutes) do
      @project.rolled_up_trackers(with_subprojects).visible.to_a
    end
    
    @versions = Rails.cache.fetch("#{cache_key_base}/versions", expires_in: 10.minutes) do
      (@project.shared_versions.sorted + [Version.new(:name => "[#{l(:label_none)}]")]).to_a
    end
    
    @priorities = Rails.cache.fetch("reports/priorities", expires_in: 30.minutes) do
      IssuePriority.all.reverse.to_a
    end
    
    @categories = Rails.cache.fetch("#{cache_key_base}/categories", expires_in: 10.minutes) do
      (@project.issue_categories + [IssueCategory.new(:name => "[#{l(:label_none)}]")]).to_a
    end
    
    @assignees = Rails.cache.fetch("#{cache_key_base}/assignees", expires_in: 10.minutes) do
      ((Setting.issue_group_assignment? ? @project.principals : @project.users).sorted + [User.new(:firstname => "[#{l(:label_none)}]")]).to_a
    end
    
    @authors = Rails.cache.fetch("#{cache_key_base}/authors", expires_in: 10.minutes) do
      @project.users.sorted.to_a
    end
    
    @subprojects = Rails.cache.fetch("#{cache_key_base}/subprojects", expires_in: 5.minutes) do
      @project.descendants.visible.to_a
    end
    
    # Cache expensive issue aggregations (30 min TTL - reports don't change frequently)
    report_data_cache_key = "#{cache_key_base}/data"
    report_data = Rails.cache.fetch(report_data_cache_key, expires_in: 30.minutes, race_condition_ttl: 10.seconds) do
      {
        by_tracker: Issue.by_tracker(@project, with_subprojects),
        by_version: Issue.by_version(@project, with_subprojects),
        by_priority: Issue.by_priority(@project, with_subprojects),
        by_category: Issue.by_category(@project, with_subprojects),
        by_assigned_to: Issue.by_assigned_to(@project, with_subprojects),
        by_author: Issue.by_author(@project, with_subprojects),
        by_subproject: Issue.by_subproject(@project) || []
      }
    end
    
    @issues_by_tracker = report_data[:by_tracker]
    @issues_by_version = report_data[:by_version]
    @issues_by_priority = report_data[:by_priority]
    @issues_by_category = report_data[:by_category]
    @issues_by_assigned_to = report_data[:by_assigned_to]
    @issues_by_author = report_data[:by_author]
    @issues_by_subproject = report_data[:by_subproject]

    render :template => "reports/issue_report"
  end

  def issue_report_details
    # Performance fix (FINDING-005): Cache report details data
    with_subprojects = Setting.display_subprojects_issues?
    detail = params[:detail]
    require 'digest/md5'
    cache_key_base = "reports/issue_report_details/#{@project.id}/#{User.current.id}/#{with_subprojects}/#{detail}"
    
    # Cache the entire detail data since it's expensive to compute
    detail_data = Rails.cache.fetch(cache_key_base, expires_in: 30.minutes, race_condition_ttl: 10.seconds) do
      case detail
      when "tracker"
        {
          field: "tracker_id",
          rows: @project.rolled_up_trackers(with_subprojects).visible.to_a,
          data: Issue.by_tracker(@project, with_subprojects),
          title: l(:field_tracker)
        }
      when "version"
        {
          field: "fixed_version_id",
          rows: (@project.shared_versions.sorted + [Version.new(:name => "[#{l(:label_none)}]")]).to_a,
          data: Issue.by_version(@project, with_subprojects),
          title: l(:field_version)
        }
      when "priority"
        {
          field: "priority_id",
          rows: IssuePriority.all.reverse.to_a,
          data: Issue.by_priority(@project, with_subprojects),
          title: l(:field_priority)
        }
      when "category"
        {
          field: "category_id",
          rows: (@project.issue_categories + [IssueCategory.new(:name => "[#{l(:label_none)}]")]).to_a,
          data: Issue.by_category(@project, with_subprojects),
          title: l(:field_category)
        }
      when "assigned_to"
        {
          field: "assigned_to_id",
          rows: ((Setting.issue_group_assignment? ? @project.principals : @project.users).sorted + [User.new(:firstname => "[#{l(:label_none)}]")]).to_a,
          data: Issue.by_assigned_to(@project, with_subprojects),
          title: l(:field_assigned_to)
        }
      when "author"
        {
          field: "author_id",
          rows: @project.users.sorted.to_a,
          data: Issue.by_author(@project, with_subprojects),
          title: l(:field_author)
        }
      when "subproject"
        {
          field: "project_id",
          rows: @project.descendants.visible.to_a,
          data: Issue.by_subproject(@project) || [],
          title: l(:field_subproject)
        }
      else
        nil
      end
    end
    
    if detail_data.nil?
      render_404
      return
    end
    
    @field = detail_data[:field]
    @rows = detail_data[:rows]
    @data = detail_data[:data]
    @report_title = detail_data[:title]
    respond_to do |format|
      format.html
      format.csv do
        send_data(issue_report_details_to_csv(@field, @statuses, @rows, @data),
                  :type => 'text/csv; header=present',
                  :filename => "report-#{params[:detail]}.csv")
      end
    end
  end

  private

  def find_issue_statuses
    @statuses = @project.rolled_up_statuses.sorted.to_a
  end
end
