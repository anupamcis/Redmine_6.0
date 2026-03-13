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

class CalendarsController < ApplicationController
  menu_item :calendar
  before_action :find_optional_project

  rescue_from Query::StatementInvalid, :with => :query_statement_invalid

  helper :issues
  helper :projects
  helper :queries
  include QueriesHelper

  def show
    if params[:year] and params[:year].to_i > 1900
      @year = params[:year].to_i
      if params[:month] and params[:month].to_i > 0 and params[:month].to_i < 13
        @month = params[:month].to_i
      end
    end
    @year ||= User.current.today.year
    @month ||= User.current.today.month

    @calendar = Redmine::Helpers::Calendar.new(Date.civil(@year, @month, 1), current_language, :month)
    retrieve_query
    @query.group_by = nil
    @query.sort_criteria = nil
    if @query.valid?
      # Performance fix (FINDING-004): Cache calendar events and optimize queries
      require 'digest/md5'
      query_hash = Digest::MD5.hexdigest([
        @query.statement.to_s,
        @calendar.startdt.to_s,
        @calendar.enddt.to_s,
        @year.to_s,
        @month.to_s
      ].join('|'))
      cache_key = "calendars/show/#{query_hash}/#{User.current.id}"
      
      @calendar.events = Rails.cache.fetch(cache_key, expires_in: 5.minutes, race_condition_ttl: 10.seconds) do
        events = []
        
        # Optimized: Use includes instead of deprecated :include option
        # Add eager loading to prevent N+1 queries
        issue_conditions = [
          "((#{Issue.table_name}.start_date BETWEEN ? AND ?) OR (#{Issue.table_name}.due_date BETWEEN ? AND ?))",
          @calendar.startdt, @calendar.enddt,
          @calendar.startdt, @calendar.enddt
        ]
        
        # Use the optimized query with proper eager loading
        events += @query.issues(
          :include => [:tracker, :assigned_to, :priority, :status, :project],
          :conditions => issue_conditions
        )
        
        # Optimized versions query with eager loading
        version_conditions = [
          "effective_date BETWEEN ? AND ?",
          @calendar.startdt, @calendar.enddt
        ]
        events += @query.versions(
          :conditions => version_conditions
        )
        
        events
      end
    end

    render :action => 'show', :layout => false if request.xhr?
  end
end
