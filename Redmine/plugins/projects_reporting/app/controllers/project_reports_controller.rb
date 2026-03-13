class ProjectReportsController < ApplicationController
  before_action :authorize_global

  helper :admin
  include AdminHelper

  def index
    @limit = per_page_option
    @user_project_status = params[:user_project_status] || 1
    @untoched_project_status = params[:untoched_project_status] || 1
    @delayed_by_project_status = params[:delayed_by_project_status] || 1
    @user = User.current
    # @blocks = @user.pref[:my_page_layout] ||  {'left' => ['issuesassignedtome'],'right' => ['issuesreportedbyme']}.freeze
    # default_reports_params
    # projects_for_chart_data
    @uhs = UserHierarchy.joins("INNER JOIN users AS child ON user_hierarchies.child_id = child.id INNER JOIN users AS parent ON user_hierarchies. parent_id = parent.id").select("user_hierarchies.*, CONCAT(parent.firstname, ' ', SUBSTRING(parent.lastname, 1, 1)) AS pname, CONCAT(child.firstname, ' ', SUBSTRING(child.lastname, 1, 1)) AS cname")
    valid_manager =  User.current.self_and_descendents.map(&:id).include?(params[:project_manager].try(:to_i)) unless User.current.admin?
    @all_project_s = if params[:project_manager] && !User.current.is_client? && (User.current.admin? || valid_manager)
      Project.joins(memberships: :member_roles).where("member_roles.role_id=9 AND members.user_id=#{params[:project_manager]}")
    elsif User.current.admin?
       Project.where.not(id: 1)
    else
       User.current.projects.where.not(id: 1)
    end

    if User.current.allowed_to?(:project_paid_hours_reports, nil, global: true)
      pm = "SELECT projects.id, CONCAT(users.firstname, ' ', SUBSTRING(users.lastname, 1, 1))  FROM users LEFT JOIN members ON members.user_id = users.id LEFT JOIN member_roles ON member_roles.member_id = members.id LEFT JOIN projects ON projects.id = members.project_id WHERE (member_roles.role_id = 9)"
      @project_managers = ActiveRecord::Base.connection.exec_query(pm).rows.to_h
      if User.current.admin?
        @project_s = @all_project_s.where(status: 1).includes(:time_entries, issues: :status)
        @hierarchy_projects = []
      else
        project_ids = User.current.group_hierarchies.pluck(:project_id)
        @project_s = @all_project_s.where.not(id: project_ids).where(status: 1).includes(:time_entries, issues: :status)
        @hierarchy_projects = User.current.projects.where.not(id: 1).where(id: project_ids, status: 1).includes(:time_entries, issues: :status)
        @hierarchy_project_count = @hierarchy_projects.size
        @hierarchy_project_limit = per_page_option
        @hierarchy_project_pages =  Redmine::Pagination::Paginator.new @hierarchy_project_count, @hierarchy_project_limit, params['page']
        @hierarchy_project_offset ||= @hierarchy_project_pages.offset
        @hierarchy_projects = @hierarchy_projects.offset(@hierarchy_project_offset).limit(@hierarchy_project_limit)
      end
      @project_count = @project_s.size
      @limit = per_page_option
      @project_pages = Redmine::Pagination::Paginator.new @project_count, @limit, params['page']
      @offset ||= @project_pages.offset
      @projects = @project_s.offset(@offset).limit(@limit)
    end
    all_projects = if User.current.admin?
      Project.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME)
    else
      User.current.projects.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME)
    end

    @projects = []
    @late_projects = []

    all_projects.status(@untoched_project_status).each do |project|
      subproject_condition = true
      if project.descendants.present?
        subprojects_max_issue_date = project.descendants.map(&:issues).flatten.map(&:updated_on).max
        subproject_condition = subprojects_max_issue_date.present? && subprojects_max_issue_date <= 5.days.ago
      end
      daily_statuses_count = project.respond_to?(:daily_statuses) ? project.daily_statuses.count : 0
      if (project.issues.count == 0 && daily_statuses_count == 0 && project.created_on <= 5.days.ago && subproject_condition)
        @projects << [{"project" => project, "datetime" =>project.created_on}]
      else
        latest_issue_update = project.issues.pluck("updated_on").compact.max
        daily_latest = project.respond_to?(:daily_statuses) ? project.daily_statuses.pluck("created_at").compact.max : nil
        if (project.created_on <= 5.days.ago && (project.issues.count != 0 && latest_issue_update <= 5.days.ago) &&  (daily_statuses_count != 0 && daily_latest && daily_latest <= 5.days.ago) && subproject_condition)
          @projects << [{"project" => project, "datetime" => latest_issue_update}]
        end
      end
    end

    all_projects.status(@delayed_by_project_status).each do |project|
      if (project.respond_to?(:opened_due_date) && project.opened_due_date.present? &&  (project.opened_due_date < User.current.today) && project.issues.open.size > 0)
        @late_projects << [{"project" => project, "datetime" => project.opened_due_date}]
      end
    end

    if params[:user].present?
      @user = User.find(params[:user])
      @user_projects = @user.projects.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).status(@user_project_status)
      # Paginate ActiveRecord::Relation using Redmine paginator
      @project_count = @user_projects.count
      @project_pages = Redmine::Pagination::Paginator.new @project_count, per_page_option, params['page']
      @project_offset ||= @project_pages.offset
      @user_projects = @user_projects.offset(@project_offset).limit(per_page_option)
    end

    @projects = @projects.flatten.sort_by {|vn| vn['datetime']}
    @late_projects = @late_projects.flatten.sort_by {|vn| vn['datetime']}

    # Paginate arrays using Redmine paginator
    @projects_count = @projects.size
    @projects_limit = per_page_option
    @projects_pages = Redmine::Pagination::Paginator.new @projects_count, @projects_limit, params['page']
    @projects_offset ||= @projects_pages.offset
    @projects = @projects.slice(@projects_offset, @projects_limit) || []

    @late_projects_count = @late_projects.size
    @late_projects_limit = per_page_option
    @late_projects_pages = Redmine::Pagination::Paginator.new @late_projects_count, @late_projects_limit, params['page']
    @late_projects_offset ||= @late_projects_pages.offset
    @late_projects = @late_projects.slice(@late_projects_offset, @late_projects_limit) || []

    respond_to do |format|
      format.html { render :locals => { :tab => "untoched_projects" } }
      format.js
    end
  end

  private

  def query(model_name, field, from_date, to_date)
    model_name.where.not(':field between :from_date and :to_date', field: field, from_date: from_date, to_date: to_date).map(&:project_id)
  end
end
