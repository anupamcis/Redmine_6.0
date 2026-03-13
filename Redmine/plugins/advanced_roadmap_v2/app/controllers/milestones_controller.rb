require "advanced_roadmap/gruff/pie" if Object.const_defined?(:Magick)

class MilestonesController < ApplicationController
  menu_item :roadmap, only: [:show, :total_graph, :status_by]
  
  before_action :find_project, :only => [:new, :create, :index], :unless => -> { request.options? }
  before_action :find_milestone, :only => [:show, :edit, :update, :destroy, :status_by, :dates_log]
  before_action :authorize, :except => [:total_graph, :status_by, :index]
  before_action :authorize_milestone_view, :only => [:index, :show], :if => -> { !request.options? }
  before_action :check_comment_for_milestone, only: [:update]
  
  # Allow API authentication for index action (JSON format)
  # This must be declared BEFORE skip_before_action calls
  accept_api_auth :index
  
  # Skip all authentication/authorization for OPTIONS requests (CORS preflight)
  # These must be defined after the callbacks are declared to avoid missing callback errors
  skip_before_action :check_if_login_required, :only => [:index], :if => -> { request.options? }
  skip_before_action :user_setup, :only => [:index], :if => -> { request.options? }
  skip_before_action :session_expiration, :only => [:index], :if => -> { request.options? }
  skip_before_action :set_localization, :only => [:index], :if => -> { request.options? }
  skip_before_action :check_password_change, :only => [:index], :if => -> { request.options? }
  skip_before_action :check_twofa_activation, :only => [:index], :if => -> { request.options? }
  skip_before_action :authorize, :only => [:index], :if => -> { api_request? || request.options? }
  

  helper :custom_fields
  helper :projects
  helper :versions
  include CustomFieldsHelper
  include ProjectsHelper

  def show
    projects = {}
    @trackers = @project.trackers.sorted.to_a
    retrieve_selected_tracker_ids(@trackers, @trackers.select {|t| t.is_in_roadmap?})
    @milestone.fixed_issues.each do |issue|
      if !(projects.include?(issue.project.id))
        projects[issue.project.id] = issue.project.id
      end
    end
    if @selected_tracker_ids.any?
      @issues = @milestone.fixed_issues.visible.
            includes(:status, :tracker, :priority).
            where(:tracker_id => @selected_tracker_ids, :fixed_milestone_id => @milestone.id).
            to_a
    end
    @more_than_one_project = (projects.length > 1)
    @totals = Milestone.calculate_totals(@milestone)
  end

  def new
    @projects = Project.order(:name).where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME)
    @versions = @project.versions
    @milestone = Milestone.new
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def index
    # Handle CORS preflight OPTIONS request
    if request.options?
      headers['Access-Control-Allow-Origin'] = '*'
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
      headers['Access-Control-Max-Age'] = '1728000'
      head :ok
      return
    end
    
    # Manual API authentication for JSON requests
    if request.format.json? && request.headers['Authorization'].present?
      authenticate_with_http_basic do |username, password|
        user = User.try_to_login(username, password)
        if user
          User.current = user
          Rails.logger.info "[MilestonesController#index] Authenticated user: #{user.login} (ID: #{user.id})"
        else
          Rails.logger.warn "[MilestonesController#index] Authentication failed for: #{username}"
        end
      end
    end
    
    respond_to do |format|
      format.html {
        # HTML format requires authorization (handled by before_action :authorize)
        @projects = Project.order(:name).where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME)
        @versions = @project.versions
        @milestones = @project.milestones.order(:name)
      }
      format.json {
        # Set CORS headers for JSON responses when origin present (React dev server)
        if request.headers['Origin'].present?
          headers['Access-Control-Allow-Origin'] = request.headers['Origin']
          headers['Access-Control-Allow-Credentials'] = 'true'
          headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
          headers['Access-Control-Expose-Headers'] = 'ETag, Link, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-Id, X-Runtime'
        end

        # For API requests, authentication is handled by accept_api_auth
        # Authorization is handled by authorize_milestone_view before_action
        # Debug logging for authentication issues
        Rails.logger.info "[MilestonesController#index] User: #{User.current.login} (ID: #{User.current.id}, Type: #{User.current.class.name})"
        Rails.logger.info "[MilestonesController#index] Project: #{@project.identifier} (ID: #{@project.id}, Public: #{@project.is_public?})"
        Rails.logger.info "[MilestonesController#index] Can view milestones? #{User.current.allowed_to?(:view_milestones, @project)}"
        
        if @project.present?
          milestones = @project.milestones.order(:name)
          # Filter by version_id if provided
          if params[:version_id].present?
            version_id = params[:version_id].to_i
            milestones = milestones.where(version_id: version_id)
          end
          # Filter to only show open milestones (not closed)
          # A milestone is considered closed if:
          # 1. It has an actual_end_date set, OR
          # 2. The planed_end_date has passed (is in the past)
          today = Date.today
          milestones = milestones.where(
            "(actual_end_date IS NULL OR actual_end_date > ?) AND (planed_end_date IS NULL OR planed_end_date >= ?)",
            today, today
          )
          # Ensure version_id is included and is an integer
          render json: { milestones: milestones.map { |m| 
            { 
              id: m.id, 
              name: m.name, 
              version_id: m.version_id.to_i,  # Ensure it's an integer
              project_id: m.project_id,
              description: m.description,
              effective_date: m.effective_date,
              planed_end_date: m.planed_end_date
            } 
          } }
        else
          render json: { milestones: [] }, status: :not_found
        end
      }
    end
  rescue ActiveRecord::RecordNotFound
    if request.format.json?
      render json: { error: 'Project not found' }, status: :not_found
    else
      render_404
    end
  end

  def create
    @milestone = @project.milestones.build(milestone_params)
    @milestone.name = @milestone.name.strip if @milestone.name.present?
    @milestone.user_id = User.current.id
    @milestone.add_coordination_plan
    if @milestone.save
      flash[:notice] = l(:notice_successful_create)
      respond_to do |format|
        format.html { redirect_to :controller => :projects, :action => :settings, :tab => "milestones", :id => @project }
        format.js
      end
    else
      render 'new'
    end
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def edit
    @projects = Project.order(:name).where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME)
    @versions = @project.versions
  end

  def update
    milestone_params_hash = milestone_params.to_h
    milestone_params_hash[:name] = milestone_params_hash[:name].strip if milestone_params_hash[:name].present?
    if @milestone.update(milestone_params_hash)
      if @milestone.fixed_issues.present? && @milestone.previous_changes().include?('version_id')
        @milestone.fixed_issues.update_all(fixed_version_id: @milestone.version.id)
      end
      flash[:notice] = l(:notice_successful_update)
      redirect_to :controller => :projects, :action => :settings, :tab => "milestones", :id => @project
    else
      render 'edit'
    end
    rescue ActiveRecord::RecordNotFound
      render_404
  end

  def destroy
    if @milestone.deletable?
      @milestone.destroy
      redirect_to :controller => :projects, :action => :settings, :tab => "milestones", :id => @project
    else
      flash[:error] = l(:notice_unable_delete_milestone)
      redirect_to :controller => :projects, :action => :settings, :tab => "milestones", :id => @project
    end
  end

  def total_graph
    g = AdvancedRoadmap::Gruff::Pie.new(params[:size] || "500x400")
    g.hide_title = true
    g.theme = graph_theme
    g.margins = 0

    versions = params[:versions] || []
    percentajes = params[:percentajes] || []
    i = 0
    while i < versions.size and i < percentajes.size
      percentajes[i] = percentajes[i].to_f
      g.data(versions[i], percentajes[i])
      i += 1
    end

    headers["Content-Type"] = "image/png"
    send_data(g.to_blob, :type => "image/png", :disposition => "inline")
  end

  def status_by
    respond_to do |format|
      format.html { render :action => 'show' }
      format.js
    end
  end

  def dates_log
    @milestone_planed_date_comments = @milestone.milestone_comments.where(field_name: "planed_end_date")
    @milestone_actual_date_comments = @milestone.milestone_comments.where(field_name: "actual_end_date")
  end

private

  def find_project
    @project = Project.find(params[:project_id])
  rescue ActiveRecord::RecordNotFound
    if request.format.json?
      render json: { error: 'Project not found' }, status: :not_found
    else
      render_404
    end
  end

  def find_milestone
    @milestone = Milestone.find(params[:id])
    @project = @milestone.project
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def graph_theme
    {
      :colors => ["#DB2626", "#6A6ADB", "#64D564", "#F727F7", "#EBEB20", "#303030", "#12ABAD", "#808080", "#B7580B", "#316211"],
      :marker_color => "#AAAAAA",
      :background_colors => ["#FFFFFF", "#FFFFFF"]
    }
  end

  def retrieve_selected_tracker_ids(selectable_trackers, default_trackers=nil)
    if ids = params[:tracker_ids]
      @selected_tracker_ids = (ids.is_a? Array) ? ids.collect { |id| id.to_i.to_s } : ids.split('/').collect { |id| id.to_i.to_s }
    else
      @selected_tracker_ids = (default_trackers || selectable_trackers).collect {|t| t.id.to_s }
    end
  end

  def check_comment_for_milestone
    milestone_params_hash = milestone_params.to_h
    if milestone_params_hash[:planed_end_date].present? && !@milestone.planed_end_date.eql?(milestone_params_hash[:planed_end_date].to_date)
      @milestone.milestone_comments.build(comment: params[:comment], changed_date: milestone_params_hash[:planed_end_date], previous_date: @milestone.planed_end_date,
      author_id: User.current.id, field_name: "planed_end_date")
    end
  end

  def milestone_params
    params.require(:milestone).permit(:name, :description, :effective_date, :version_id,
                                      :actual_start_date, :actual_end_date, :planed_end_date)
  end

  def authorize_milestone_view
    # Check if user has permission to view milestones
    # Allow access if user has any of these permissions:
    # 1. view_milestones (specific milestone permission)
    # 2. manage_milestones (milestone management)
    # 3. view_issues (can see issues, so should see milestones)
    # 4. Is a project member with any role
    can_view = User.current.allowed_to?(:view_milestones, @project) ||
               User.current.allowed_to?(:manage_milestones, @project) ||
               User.current.allowed_to?(:view_issues, @project)
    
    unless can_view
      if request.format.json?
        Rails.logger.warn "[MilestonesController] Access denied for user: #{User.current.login} (ID: #{User.current.id}), Project: #{@project.identifier}"
        render json: { 
          error: 'Forbidden', 
          message: 'You do not have permission to view milestones in this project. You need one of: view_milestones, manage_milestones, or view_issues permission.',
          user: User.current.login,
          project: @project.identifier,
          authenticated: !User.current.is_a?(AnonymousUser),
          required_permission: 'view_milestones or view_issues'
        }, status: :forbidden
      else
        render_403
      end
      return false
    end
    true
  end
end
