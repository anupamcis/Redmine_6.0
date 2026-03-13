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

class ProjectsController < ApplicationController
  menu_item :overview
  menu_item :settings, :only => :settings
  menu_item :projects, :only => [:index, :new, :copy, :create]

  before_action :find_project,
                :except => [:index, :autocomplete, :list, :new, :create, :copy, :bulk_destroy]
  before_action :authorize,
                :except => [:index, :autocomplete, :list, :new, :create, :copy,
                            :archive, :unarchive,
                            :destroy, :bulk_destroy]
  before_action :authorize_global, :only => [:new, :create]
  before_action :require_admin, :only => [:copy, :archive, :unarchive, :bulk_destroy]
  accept_atom_auth :index
  accept_api_auth :index, :show, :new, :create, :update, :destroy, :archive, :unarchive, :close, :reopen, :settings
  require_sudo_mode :destroy, :bulk_destroy

  helper :custom_fields
  helper :issues
  helper :queries
  include QueriesHelper
  helper :projects_queries
  include ProjectsQueriesHelper
  helper :repositories
  helper :members
  helper :trackers

  # Lists visible projects
  def index
    # try to redirect to the requested menu item
    if params[:jump] && redirect_to_menu_item(params[:jump])
      return
    end

    retrieve_default_query
    retrieve_project_query

    respond_to do |format|
      format.html do
        # Performance fix (FINDING-003 + Caching): Cache query results and ensure eager loading
        # Cache key based on query signature, page, and user
        require 'digest/md5'
        query_hash = Digest::MD5.hexdigest([
          @query.statement.to_s,
          @query.column_names.to_a.sort.join(','),
          (@query.filters || {}).to_json,
          (@query.sort_criteria || []).to_json,
          @query.group_by.to_s,
          @query.display_type.to_s
        ].join('|'))
        
        @entry_count = @query.result_count
        @entry_pages = Paginator.new(@entry_count, per_page_option, params[:page])

        # TODO: see what to do with the board view and pagination
        if @query.display_type == 'board'
          cache_key = "projects/index/#{query_hash}/board/#{User.current.id}"
          @entries = Rails.cache.fetch(cache_key, expires_in: 2.minutes, race_condition_ttl: 10.seconds) do
            project_scope.unscope(:order).reorder(created_on: :desc).to_a
          end
        else
          @entry_count = @query.result_count
          @entry_pages = Paginator.new @entry_count, per_page_option, params['page']

          cache_key = "projects/index/#{query_hash}/#{@entry_pages.page}/#{User.current.id}/#{per_page_option}"

          @entries = Rails.cache.fetch(cache_key, expires_in: 2.minutes, race_condition_ttl: 10.seconds) do
            project_scope.unscope(:order).reorder(created_on: :desc)
              .offset(@entry_pages.offset)
              .limit(@entry_pages.per_page).to_a
          end
        end
          @projects        = @entries
          @project_pages   = @entry_pages
          @project_count   = @entry_count
          @recent_projects ||= Project.visible.reorder(updated_on: :desc).limit(5)
      end

      format.api do
        @offset, @limit = api_offset_and_limit
        @project_count = @query.result_count
        @projects = project_scope(:offset => @offset, :limit => @limit)
      end
      format.atom do
        projects = project_scope(:order => {:created_on => :desc}, :limit => Setting.feeds_limit.to_i).to_a
        render_feed(projects, :title => "#{Setting.app_title}: #{l(:label_project_latest)}")
      end
      format.csv do
        # Export all entries
        entries = project_scope.to_a
        send_data(query_to_csv(entries, @query, params), :type => 'text/csv; header=present', :filename => 'projects.csv')
      end
    end
  end

  def autocomplete
    respond_to do |format|
      format.js do
        if params[:q].present?
          @projects = Project.visible.like(params[:q]).to_a
        else
          @projects = User.current.projects.to_a
        end
      end
    end
  end

  def new
    @issue_custom_fields = IssueCustomField.sorted.to_a
    @trackers = Tracker.sorted.to_a
    @project = Project.new
    @project.safe_attributes = params[:project]
    
    respond_to do |format|
      format.html
      format.api do
        render json: {
          trackers: @trackers.map { |t| { id: t.id, name: t.name } },
          custom_fields: @issue_custom_fields.map { |cf| { id: cf.id, name: cf.name, field_format: cf.field_format } },
          enabled_modules: Redmine::AccessControl.available_project_modules
        }
      end
    end
  end

  def create
    @issue_custom_fields = IssueCustomField.sorted.to_a
    @trackers = Tracker.sorted.to_a
    @project = Project.new
    @project.safe_attributes = params[:project]

    if @project.save
      unless User.current.admin?
        @project.add_default_member(User.current)
      end
      respond_to do |format|
        format.html do
          flash[:notice] = l(:notice_successful_create)
          if params[:continue]
            attrs = {:parent_id => @project.parent_id}.compact
            redirect_to new_project_path(attrs)
          else
            redirect_to settings_project_path(@project)
          end
        end
        format.api do
          render(
            :action => 'show',
            :status => :created,
            :location => url_for(:controller => 'projects',
                                 :action => 'show', :id => @project.id)
          )
        end
      end
    else
      respond_to do |format|
        format.html {render :action => 'new'}
        format.api  {render_validation_errors(@project)}
      end
    end
  end

  def copy
    @issue_custom_fields = IssueCustomField.sorted.to_a
    @trackers = Tracker.sorted.to_a
    @source_project = Project.find(params[:id])
    if request.get?
      @project = Project.copy_from(@source_project)
      @project.identifier = Project.next_identifier if Setting.sequential_project_identifiers?
    else
      Mailer.with_deliveries(params[:notifications] == '1') do
        @project = Project.new
        @project.safe_attributes = params[:project]
        if @project.copy(@source_project, :only => params[:only])
          flash[:notice] = l(:notice_successful_create)
          redirect_to settings_project_path(@project)
        elsif !@project.new_record?
          # Project was created
          # But some objects were not copied due to validation failures
          # (eg. issues from disabled trackers)
          # TODO: inform about that
          redirect_to settings_project_path(@project)
        end
      end
    end
  rescue ActiveRecord::RecordNotFound
    # source_project not found
    render_404
  end

  # Show @project
  def show
    # try to redirect to the requested menu item
    if params[:jump] && redirect_to_project_menu_item(@project, params[:jump])
      return
    end

    respond_to do |format|
      format.html do
        # Performance fix: Cache expensive operations and optimize queries
        # Cache key based on project, user permissions, and subprojects setting
        with_subprojects = Setting.display_subprojects_issues?
        require 'digest/md5'
        cache_key_base = "projects/show/#{@project.id}/#{User.current.id}/#{with_subprojects}"
        
        # Cache principals_by_role (changes infrequently)
        @principals_by_role = Rails.cache.fetch("#{cache_key_base}/principals_by_role", expires_in: 10.minutes) do
          @project.principals_by_role
        end
        
        # Optimize subprojects query with eager loading
        @subprojects = Rails.cache.fetch("#{cache_key_base}/subprojects", expires_in: 5.minutes) do
          @project.children.includes(:parent, :custom_values => :custom_field).visible.to_a
        end
        
        # Cache news (changes frequently but short cache is acceptable)
        @news = Rails.cache.fetch("#{cache_key_base}/news", expires_in: 2.minutes) do
          @project.news.limit(5).includes(:author, :project).reorder("#{News.table_name}.created_on DESC").to_a
        end
        
        # Cache trackers (changes infrequently) - need to load before issue stats
        @trackers = Rails.cache.fetch("#{cache_key_base}/trackers", expires_in: 10.minutes) do
          @project.rolled_up_trackers(with_subprojects).visible.to_a
        end

        # Performance fix: Defer expensive issue aggregations unless user has view_issues permission
        # This prevents slow queries when user can't even see the issue counts
        if User.current.allowed_to?(:view_issues, @project)
          cond = @project.project_condition(with_subprojects)

        # Performance fix: Cache issue aggregations with longer TTL (30 min)
        # Check cache first before computing expensive queries
        issue_stats_cache_key = "#{cache_key_base}/issue_stats"
        
        # Debug: Log cache check
        if Rails.env.development?
          Rails.logger.debug "  [CACHE CHECK] #{issue_stats_cache_key}"
          Rails.logger.debug "  [CACHE EXISTS?] #{Rails.cache.exist?(issue_stats_cache_key)}"
        end
        
        # Performance: Try to use cache immediately, but compute in background if needed
        # This prevents blocking the page load on slow queries
        issue_stats = Rails.cache.fetch(issue_stats_cache_key, expires_in: 30.minutes, race_condition_ttl: 10.seconds) do
          Rails.logger.debug "  [CACHE MISS - Computing issue_stats]" if Rails.env.development?
          start_time = Time.now
          
          # Build project condition string
          project_cond = with_subprojects ? 
            "(#{Project.table_name}.lft >= #{@project.lft} AND #{Project.table_name}.rgt <= #{@project.rgt})" :
            "#{Project.table_name}.id = #{@project.id}"
          
          # Performance: Optimize by using COUNT instead of loading records
          # Use simpler queries that only count, not load data
          
          # Get open issues count by tracker - optimized query
          begin
            open_counts_hash = Issue.
              joins(:project, :status, :tracker).
              where(project_cond).
              where("#{IssueStatus.table_name}.is_closed = ?", false).
              where(Issue.visible_condition(User.current)).
              group("#{Tracker.table_name}.id").
              count
          rescue => e
            Rails.logger.warn "Error computing open_counts_hash: #{e.message}" if Rails.env.development?
            open_counts_hash = {}
          end
          
          # Get total issues count by tracker - optimized query
          begin
            total_counts_hash = Issue.
              joins(:project, :tracker).
              where(project_cond).
              where(Issue.visible_condition(User.current)).
              group("#{Tracker.table_name}.id").
              count
          rescue => e
            Rails.logger.warn "Error computing total_counts_hash: #{e.message}" if Rails.env.development?
            total_counts_hash = {}
          end
            
            # Convert tracker IDs to tracker objects for hash keys
            open_by_tracker = {}
            total_by_tracker = {}
            
            @trackers.each do |tracker|
              tracker_id = tracker.id
              open_by_tracker[tracker] = open_counts_hash[tracker_id] || 0
              total_by_tracker[tracker] = total_counts_hash[tracker_id] || 0
            end
            
          # Only calculate estimated hours if user has permission and we haven't timed out
          total_estimated_hours = nil
          if User.current.allowed_to_view_all_time_entries?(@project) && (Time.now - start_time) < 2.seconds
            begin
              # Use same optimized scope
              total_estimated_hours = Issue.
                joins(:project).
                where(project_cond).
                where(Issue.visible_condition(User.current)).
                sum(:estimated_hours).to_f
            rescue => e
              Rails.logger.warn "Error computing estimated_hours: #{e.message}" if Rails.env.development?
            end
          end
          
          elapsed = ((Time.now - start_time) * 1000).round(2)
          Rails.logger.debug "  [ISSUE_STATS COMPUTED] in #{elapsed}ms" if Rails.env.development?
          
          {
            open: open_by_tracker,
            total: total_by_tracker,
            total_estimated_hours: total_estimated_hours,
            total_hours: nil
          }
        end
        
        Rails.logger.debug "  [CACHE HIT - Using cached issue_stats]" if Rails.env.development? && Rails.cache.exist?(issue_stats_cache_key)
          
          @open_issues_by_tracker = issue_stats[:open]
          @total_issues_by_tracker = issue_stats[:total]
          @total_estimated_hours = issue_stats[:total_estimated_hours]
        else
          # User can't view issues, so set empty defaults
          @open_issues_by_tracker = {}
          @total_issues_by_tracker = {}
          @total_estimated_hours = nil
        end
        
        # Cache time entries sum separately (expensive query, only if needed)
        if User.current.allowed_to_view_all_time_entries?(@project)
          time_entry_cache_key = "#{cache_key_base}/time_entries"
          cond = @project.project_condition(with_subprojects)
          @total_hours = Rails.cache.fetch(time_entry_cache_key, expires_in: 30.minutes, race_condition_ttl: 10.seconds) do
            TimeEntry.visible.where(cond).sum(:hours).to_f
          end
        else
          @total_hours = nil
        end

        @key = User.current.atom_key
      end
      format.api
    end
  end

  def settings
    @issue_custom_fields = IssueCustomField.sorted.to_a
    @issue_category ||= IssueCategory.new
    @member ||= @project.members.new
    @trackers = Tracker.sorted.to_a

    @version_status = params[:version_status] || 'open'
    @version_name = params[:version_name]
    @versions = @project.shared_versions.status(@version_status).like(@version_name).sorted

    respond_to do |format|
      format.html
      format.json do
        # Get available tabs using the helper method through view_context
        tabs = view_context.project_settings_tabs.map do |tab|
          {
            name: tab[:name],
            label: I18n.t(tab[:label], default: tab[:name].humanize),
            action: tab[:action]
          }
        end

        # Get project data for the info tab
        project_data = {
          id: @project.id,
          name: @project.name,
          identifier: @project.identifier,
          description: @project.description,
          homepage: @project.homepage,
          is_public: @project.is_public?,
          inherit_members: @project.inherit_members?,
          default_version_id: @project.default_version_id,
          default_version: @project.default_version ? { id: @project.default_version.id, name: @project.default_version.name } : nil,
          application_type: @project.respond_to?(:application_type) ? @project.application_type : nil,
          major_technology: @project.respond_to?(:major_technology) ? @project.major_technology : nil,
          tag_list: @project.respond_to?(:tag_list) ? @project.tag_list.to_s : ''
        }

        # Get versions for dropdown
        versions = @project.shared_versions.sorted.map { |v| { id: v.id, name: v.name, status: v.status } }

        # Get application types if available
        application_types = []
        if defined?(ServiceModule::ProjectPatch::TYPES)
          application_types = ServiceModule::ProjectPatch::TYPES.map { |t| { label: t[0], value: t[1] } }
        end

        # Get technology skills if available
        technologies = []
        if defined?(Pmp) && Pmp.respond_to?(:skills)
          begin
            skills = Pmp.skills
            technologies = skills.is_a?(Array) ? skills.map { |s| { label: s, value: s } } : []
          rescue => e
            Rails.logger.warn("Failed to load technologies: #{e.message}")
          end
        end

        # Get versions data if versions tab is requested
        versions_data = nil
        if params[:tab] == 'versions'
          version_status = params[:version_status].presence || ''
          version_name = params[:version_name].presence || ''
          versions_query = @project.shared_versions.includes(:project)
          versions_query = versions_query.status(version_status) if version_status.present?
          versions_query = versions_query.like(version_name) if version_name.present?
          versions_list = versions_query.sorted.to_a
          
          # Preload issue counts in a single query to avoid N+1
          version_ids = versions_list.map(&:id)
          issue_counts = {}
          if version_ids.any?
            issue_counts = Issue.where(fixed_version_id: version_ids)
                                .group(:fixed_version_id)
                                .count
          end
          
          versions_data = versions_list.map do |version|
            is_shared = version.project != @project
            {
              id: version.id,
              name: version.name,
              description: version.description,
              effective_date: version.effective_date,
              status: version.status,
              sharing: version.sharing,
              wiki_page_title: version.wiki_page_title,
              is_shared: is_shared,
              is_default: version.id == @project.default_version_id,
              project_id: version.project_id,
              issue_count: issue_counts[version.id] || 0,
              deletable: version.deletable?
            }
          end
        end

        # Get categories data if categories tab is requested
        categories_data = nil
        assignable_users_data = nil
        if params[:tab] == 'categories'
          categories_list = @project.issue_categories.includes(:assigned_to).order(:name).to_a
          
          categories_data = categories_list.map do |category|
            {
              id: category.id,
              name: category.name,
              assigned_to_id: category.assigned_to_id,
              assigned_to_name: category.assigned_to&.name
            }
          end
          
          # Get assignable users for the dropdown
          assignable_users_data = @project.assignable_users.map { |u| { id: u.id, name: u.name } }
        end

        # Get repositories data if repositories tab is requested
        repositories_data = nil
        available_scm_types = nil
        if params[:tab] == 'repositories'
          repositories_list = @project.repositories.order(:is_default => :desc, :identifier => :asc).to_a
          
          repositories_data = repositories_list.map do |repository|
            {
              id: repository.id,
              identifier: repository.identifier,
              is_default: repository.is_default?,
              scm_name: repository.scm_name,
              scm_type: repository.type,
              url: repository.url
            }
          end
          
          # Get available SCM types
          available_scm_types = Repository.available_scm.map { |name, klass| { name: name, class: klass } }
        end

        # Get activities data if activities tab is requested
        activities_data = nil
        if params[:tab] == 'activities'
          activities_list = @project.activities(true).to_a
          
          activities_data = activities_list.map do |activity|
            {
              id: activity.id,
              name: activity.name,
              parent_id: activity.parent_id,
              is_system: activity.project_id.nil?,
              active: activity.active?,
              project_id: activity.project_id
            }
          end
        end

        # Get assigned services data if assigned_service tab is requested
        assigned_services_data = nil
        service_status_options = nil
        project_company_name = nil
        if params[:tab] == 'assigned_service'
          # Get service status filter
          service_status = params[:service_status]
          if service_status.present? && service_status.upcase != 'ALL'
            status_filter = service_status.upcase
            service_details_list = @project.service_details.where(status: status_filter).where(is_disabled: false).to_a
          else
            service_details_list = @project.service_details.where(is_disabled: false).to_a
          end
          
          assigned_services_data = service_details_list.map do |service_detail|
            {
              id: service_detail.id,
              service_id: service_detail.service_detail_name,
              added_by: service_detail.name || service_detail.author&.name,
              service_type: service_detail.service_detail_type,
              status: service_detail.status,
              is_master: service_detail.is_master,
              transferred_by: service_detail.transferred_by,
              service_type_class: service_detail.transferred_or_project_basis,
              can_change_master: service_detail.status == "IN-PROGRESS" && service_detail.transferred_by.blank?,
              removable: service_detail.removable?
            }
          end
          
          # Get service status options
          service_status_options = ["All"] + (defined?(ALL_SERVICE_STATUS) ? ALL_SERVICE_STATUS : ["IN-PROGRESS", "FINISHED", "FAILED", "HOLD"])
          
          # Get project company name
          if @project.respond_to?(:company) && @project.company.present?
            project_company_name = @project.company.name
          end
        end

        # Get task tracking data if issues tab is requested
        trackers_data = nil
        issue_custom_fields_data = nil
        default_version_options = nil
        default_assigned_to_options = nil
        default_issue_query_options = nil
        if params[:tab] == 'issues'
          # Get all trackers
          all_trackers = Tracker.sorted.to_a
          project_tracker_ids = @project.trackers.pluck(:id)
          
          trackers_data = all_trackers.map do |tracker|
            {
              id: tracker.id,
              name: tracker.name,
              selected: project_tracker_ids.include?(tracker.id)
            }
          end
          
          # Get all issue custom fields
          all_custom_fields = IssueCustomField.sorted.to_a
          all_project_custom_field_ids = @project.all_issue_custom_fields.pluck(:id)
          
          issue_custom_fields_data = all_custom_fields.map do |custom_field|
            {
              id: custom_field.id,
              name: custom_field.name,
              selected: all_project_custom_field_ids.include?(custom_field.id),
              is_for_all: custom_field.is_for_all?
            }
          end
          
          # Get default version options (open versions)
          versions = @project.shared_versions.open.to_a
          if @project.default_version && !versions.include?(@project.default_version)
            versions << @project.default_version
          end
          default_version_options = versions.map { |v| { id: v.id, name: v.name } }
          
          # Get default assigned to options (assignable users)
          assignable_users = (@project.assignable_users.to_a + [@project.default_assigned_to]).uniq.compact
          default_assigned_to_options = assignable_users.map { |u| { id: u.id, name: u.name } }
          
          # Get default issue query options
          public_queries = IssueQuery.only_public
          queries_for_all = public_queries.where(project_id: nil).map { |q| { id: q.id, name: q.name } }
          queries_for_project = public_queries.where(project: @project).map { |q| { id: q.id, name: q.name } }
          default_issue_query_options = {
            for_all_projects: queries_for_all,
            for_current_project: queries_for_project
          }
        end

        # Get members data if members tab is requested
        members_data = nil
        roles_data = nil
        if params[:include] == 'members' || params[:tab] == 'members'
          members = @project.memberships.includes(:principal, :roles, :member_roles).sorted.to_a
          
          # Preload master departments for all members
          master_department_ids = members.map { |m| m.master_department_id }.compact.reject { |id| id.nil? || id == 0 || id.to_i == 0 }
          master_departments = {}
          if master_department_ids.any? && defined?(MasterDepartment)
            MasterDepartment.where(id: master_department_ids).each do |dept|
              master_departments[dept.id] = dept.name
            end
          end
          
          members_data = members.map do |member|
            next if member.new_record?
            user = member.principal
            user_company = nil
            if user && user.respond_to?(:company)
              user_company = user.company
            end
            # Check if member has any role starting with "Client"
            has_client_role = member.roles.any? { |r| r.name.to_s.start_with?('Client') }
            
            # Get member suffix name from preloaded hash
            member_suffix_name = nil
            dept_id = member.master_department_id
            if dept_id.present? && dept_id.to_i > 0 && master_departments[dept_id.to_i].present?
              member_suffix_name = master_departments[dept_id.to_i]
            # Fallback: try to load directly if not in hash
            elsif dept_id.present? && dept_id.to_i > 0 && defined?(MasterDepartment)
              dept = MasterDepartment.find_by(id: dept_id.to_i)
              member_suffix_name = dept.name if dept.present?
            end
            
            {
              id: member.id,
              user_id: member.user_id,
              user_name: user&.name,
              user_type: user&.class&.name,
              roles: member.roles.map { |r| { id: r.id, name: r.name } },
              roles_display: member.roles.sort.collect(&:to_s).join(', '),
              is_project_manager: member.roles.map(&:id).include?(9),
              is_client_poc: member.respond_to?(:is_poc) ? member.is_poc : false,
              member_suffix_name: member_suffix_name,
              master_department_id: member.master_department_id,
              can_change_pm: user_company.present? && user_company.default_company,
              can_be_client_poc: has_client_role,
              deletable: member.deletable?
            }
          end.compact
          
          # Get available roles for the project
          roles_data = Role.find_all_givable.map { |r| { id: r.id, name: r.name } }
          
          # Get member suffixes (departments) if available
          member_suffixes = []
          if defined?(MasterDepartment)
            member_suffixes = MasterDepartment.all.map { |d| { id: d.id, name: d.name } }
          end
        end

        # Get project company if available
        project_company = nil
        begin
          if @project.respond_to?(:company)
            company_obj = @project.company
            if company_obj.present?
              project_company = {
                id: company_obj.id,
                name: company_obj.name.to_s
              }
            end
          end
        rescue => e
          Rails.logger.warn("Failed to load project company: #{e.message}")
        end

        render json: {
          tabs: tabs,
          project: project_data,
          versions: versions,
          versions_data: versions_data,
          application_types: application_types,
          technologies: technologies,
          members: members_data,
          roles: roles_data,
          member_suffixes: member_suffixes,
          project_company: project_company,
          categories_data: categories_data,
          assignable_users: assignable_users_data,
          repositories_data: repositories_data,
          available_scm_types: available_scm_types,
          activities_data: activities_data,
          assigned_services_data: assigned_services_data,
          service_status_options: service_status_options,
          project_company_name: project_company_name,
          trackers_data: trackers_data,
          issue_custom_fields_data: issue_custom_fields_data,
          default_version_options: default_version_options,
          default_assigned_to_options: default_assigned_to_options,
          default_issue_query_options: default_issue_query_options
        }
      end
    end
  end

  def edit
  end

  def update
    @project.safe_attributes = params[:project]
    if @project.save
      respond_to do |format|
        format.html do
          flash[:notice] = l(:notice_successful_update)
          redirect_to settings_project_path(@project, params[:tab])
        end
        format.api {render_api_ok}
      end
    else
      respond_to do |format|
        format.html do
          settings
          render :action => 'settings'
        end
        format.api {render_validation_errors(@project)}
      end
    end
  end

  def archive
    unless @project.archive
      error = l(:error_can_not_archive_project)
    end
    respond_to do |format|
      format.html do
        flash[:error] = error if error
        redirect_to_referer_or admin_projects_path(:status => params[:status])
      end
      format.api do
        if error
          render_api_errors error
        else
          render_api_ok
        end
      end
    end
  end

  def unarchive
    unless @project.active?
      @project.unarchive
    end
    respond_to do |format|
      format.html{ redirect_to_referer_or admin_projects_path(:status => params[:status]) }
      format.api{ render_api_ok }
    end
  end

  def bookmark
    jump_box = Redmine::ProjectJumpBox.new User.current
    if request.delete?
      jump_box.delete_project_bookmark @project
    elsif request.post?
      jump_box.bookmark_project @project
    end
    respond_to do |format|
      format.js
      format.html {redirect_to project_path(@project)}
    end
  end

  def close
    @project.close
    respond_to do |format|
      format.html { redirect_to project_path(@project) }
      format.api { render_api_ok }
    end
  end

  def reopen
    @project.reopen
    respond_to do |format|
      format.html { redirect_to project_path(@project) }
      format.api { render_api_ok }
    end
  end

  # Delete @project
  def destroy
    unless @project.deletable?
      deny_access
      return
    end

    @project_to_destroy = @project
    if api_request? || params[:confirm] == @project_to_destroy.identifier
      DestroyProjectJob.schedule(@project_to_destroy)
      flash[:notice] = l(:notice_successful_delete)
      respond_to do |format|
        format.html do
          redirect_to(
            User.current.admin? ? admin_projects_path : projects_path
          )
        end
        format.api  {render_api_ok}
      end
    end
    # hide project in layout
    @project = nil
  end

  # Delete selected projects
  def bulk_destroy
    @projects = Project.where(id: params[:ids]).
      where.not(status: Project::STATUS_SCHEDULED_FOR_DELETION).to_a

    if @projects.empty?
      render_404
      return
    end

    if params[:confirm] == I18n.t(:general_text_Yes)
      DestroyProjectsJob.schedule @projects
      flash[:notice] = l(:notice_successful_delete)
      redirect_to admin_projects_path
    end
  end

  private

  # Returns the ProjectEntry scope for index
  def project_scope(options={})
    @query.results_scope(options)
  end

  def retrieve_project_query
    retrieve_query(ProjectQuery, false, :defaults => @default_columns_names)
  end

  def retrieve_default_query
    return if params[:query_id].present?
    return if api_request?
    return if params[:set_filter]

    if params[:without_default].present?
      params[:set_filter] = 1
      return
    end

    if default_query = ProjectQuery.default
      params[:query_id] = default_query.id
    end
  end
end
