class ServicesController < ApplicationController

  before_action :require_login, only: [:index, :migrate_project_company]

  accept_api_auth :sync_services, :index, :migrate_project_company

  def sync_services
    if params[:service_id].present?
      service = Service.update_or_create_service(params)
      if service
        company = Company.create_company(params)
        service_detail = ServiceDetail.update_or_create_service_details(params)
        if service_detail
          render json: {
            "status" => 200,
            "success" => true
          }, status: 200
        else
          render json: {
            "status" => 422,
            "success" => false,
            "message" => l(:repush_to_error_message)
          }, status: 422
        end
      end
    else
      render json: {
        "status" => 422,
        "success" => false,
        "message" => l(:presence_of_service_id)
      }, status: 422
      return
    end
  end

  def index
    start_time = Time.now
    
    begin
      # Optimize: Only load companies on initial request (no params)
      # Load other data only when company is selected
      if params[:selected_client_company].present? || params[:services].present? || params[:client_project].present?
      Rails.logger.info "[ServicesController] Loading full data for params: #{params.inspect}"
      @master_services = User.current.get_services_with_hierarchy
      if @master_services.present?
        @companies = @master_services.map(&:company).uniq.compact
      end
    else
      # Fast path: Only load companies for initial page load
      Rails.logger.info "[ServicesController] Fast path: Loading only companies"
      # Use a simpler query: get distinct company IDs first, then load companies
      if User.current.admin?
        # Get company IDs from service_details directly (faster)
        query_start = Time.now
        company_ids = ServiceDetail.joins(:service)
          .where("service_details.project_id IS NULL AND service_details.status = ?", "IN-PROGRESS")
          .select("DISTINCT services.erp_client_id")
          .pluck("services.erp_client_id")
          .compact
        Rails.logger.info "[ServicesController] Company IDs query took: #{Time.now - query_start} seconds, found #{company_ids.size} companies"
        
        if company_ids.present?
          load_start = Time.now
          @companies = Company.where(erp_client_id: company_ids).order(:name)
          Rails.logger.info "[ServicesController] Company load took: #{Time.now - load_start} seconds"
        else
          @companies = []
        end
      else
        # For non-admin users, get company IDs from their service_details
        # Use the relationship through employee (supervisor_employee_id) instead of user_id
        query_start = Time.now
        # Get employee IDs for the current user and their descendants
        employee_ids = if User.current.respond_to?(:self_and_descendents)
          User.current.self_and_descendents.includes(:employee).map { |u| u.employee&.employee_id }.compact
        else
          [User.current.employee&.employee_id].compact
        end
        
        if employee_ids.present?
          company_ids = ServiceDetail.joins(:service)
            .where("service_details.supervisor_employee_id IN (?) AND service_details.project_id IS NULL AND service_details.period_to >= ? AND service_details.status = ?", 
                   employee_ids, Time.now.beginning_of_day, "IN-PROGRESS")
            .select("DISTINCT services.erp_client_id")
            .pluck("services.erp_client_id")
            .compact
        else
          company_ids = []
        end
        
        Rails.logger.info "[ServicesController] Company IDs query (non-admin) took: #{Time.now - query_start} seconds, found #{company_ids.size} companies"
        
        if company_ids.present?
          load_start = Time.now
          @companies = Company.where(erp_client_id: company_ids).order(:name)
          Rails.logger.info "[ServicesController] Company load (non-admin) took: #{Time.now - load_start} seconds"
        else
          @companies = []
        end
      end
      Rails.logger.info "[ServicesController] Total index action took: #{Time.now - start_time} seconds"
    end

    if @companies.present? || params[:selected_client_company].present?
      # Only call find_and_group_service_details if company is selected
      find_and_group_service_details if params[:selected_client_company].present?

      if params[:services].present?
        @services = ServiceDetail.where(id: params[:services])
        if ServiceDetail.is_selected_company_services?(@selectd_company, @services)
          @is_all_shared_service = (@services.present?  && params[:services].size == @services.map(&:transferred_by).compact.size && !@services.map(&:service_detail_type).map(&:downcase).include?("project"))
          @is_all_new_service = (@services.present? && !@services.map(&:transferred_by).compact.present? && !@services.map(&:service_detail_type).map(&:downcase).include?("project"))
          @both_service = (@services.present? && @services.map(&:transferred_by).include?(nil) && @services.map(&:transferred_by).compact.size >= 1 && !@services.map(&:service_detail_type).map(&:downcase).include?("project"))
          @all_project_basis_services_from_same_master = (@services.present? && @services.map(&:service).uniq.count == 1 && !@services.map(&:service_detail_type).map(&:downcase).include?("dedicated") && !@services.map(&:service_detail_type).map(&:downcase).include?("hourly"))
        else
          flash[:error] = l(:wrong_service_selection_error_message)
          redirect_to services_path(selected_client_company: params[:selected_client_company],
          supervisor: params[:supervisor])
        end
      end

      @selected_project = Project.find(params[:client_project])  if params[:client_project].present?

      if @selected_project.present? && @selectd_company.present?
        unless ServiceDetail.is_selected_company_project?(@selectd_company, @selected_project)
          flash[:error] = l(:wrong_project_selection_error_message)
          redirect_to services_path(selected_client_company: params[:selected_client_company],
          supervisor: params[:supervisor],  services: params[:services])
        end
      end

      @project_type = service_assignment_type(@both_service, @is_all_shared_service, @is_all_new_service, @all_project_basis_services_from_same_master)
      if params[:commit].present? && @selected_project.present? && @services.present?
        if !@services.present? || @services.map(&:project_id).compact.present?
          respond_to do |format|
            format.html do
              flash[:error] = l(:service_already_assigned_or_not_present)
              redirect_to services_path
            end
            format.api { render_api_errors([l(:service_already_assigned_or_not_present)]) }
          end
        else
          @selected_project.service_details << @services
          existing_master = @selected_project.service_details.where(is_master: true).first
          canditate_of_new_master = @services.where(transferred_by: nil).first
          if canditate_of_new_master.present?
            new_master_if_project_is_not_active(@selected_project, existing_master, canditate_of_new_master)
          end
          @services.update_all(added_by_id: User.current.id)
          @selected_project.attch_project_to_services_on_erp
          respond_to do |format|
            format.html do
              flash[:notice] = l(:notice_successful_assigned)
              redirect_to :controller => :projects, :action => :settings, :tab => "assigned_service", :id => @selected_project
            end
            format.api { render_api_ok }
          end
        end
        # update_service_count
      else
        respond_to do |format|
          format.html { return }
          format.api do
            # Build grouped projects by status only if projects exist
            grouped_projects = {}
            if @projects.present?
              if Project.respond_to?(:group_projects_by_status)
                begin
                  grouped_projects = Project.group_projects_by_status(@projects.to_a)
                rescue => e
                  # If method exists but fails, use fallback
                  Rails.logger.warn("group_projects_by_status failed: #{e.message}")
                  grouped_projects = group_projects_by_status_fallback(@projects.to_a)
                end
              else
                # Fallback: group projects by status manually
                grouped_projects = group_projects_by_status_fallback(@projects.to_a)
              end
            end

            # Optimize: Only serialize what's needed
            response_data = {
              companies: (@companies || []).map { |c| { id: c.id, name: c.name } }
            }
            
            # Only include other data if company is selected
            if @selectd_company
              response_data[:selected_company] = { id: @selectd_company.id, name: @selectd_company.name }
              response_data[:supervisors] = (@supervisors || []).map { |s| { employee_id: s.employee_id, name: s.name } }
              response_data[:grouped_service_details] = @grouped_service_details || []
              response_data[:projects] = (@projects || []).map { |p| { id: p.id, name: p.name, status: p.status, identifier: p.identifier } }
              response_data[:grouped_projects] = grouped_projects || {}
              response_data[:selected_project] = @selected_project ? { id: @selected_project.id, name: @selected_project.name, identifier: @selected_project.identifier } : nil
              response_data[:project_type] = @project_type || "None"
              response_data[:services] = (@services || []).map { |s| { id: s.id, name: s.service_detail_name, service_detail_type: s.service_detail_type, transferred_by: s.transferred_by } }
            end
            
            render json: response_data
          end
        end
      end
    else
      respond_to do |format|
        format.html { return }
        format.api do
          # Fast check: Only verify if user has any service details (don't load all)
          # Use limit(1) for faster exists check
          has_service_details = if User.current.admin?
            ServiceDetail.where("project_id IS NULL AND status = ?", "IN-PROGRESS").limit(1).exists?
          else
            User.current.service_details.where("project_id IS NULL AND period_to >= ? AND status = ?", Time.now.beginning_of_day, "IN-PROGRESS").limit(1).exists?
          end
          
          render json: {
            companies: [],
            error: has_service_details ? l(:companies_not_connected) : l(:label_no_servcies)
          }
        end
      end
    end
    rescue => e
      # Catch any unexpected errors and ensure we return JSON for API requests
      Rails.logger.error "[ServicesController] Unexpected error in index: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      
      respond_to do |format|
        format.html do
          flash[:error] = "An error occurred while loading services. Please try again."
          redirect_to root_path
        end
        format.api do
          render json: {
            companies: [],
            error: "An error occurred while loading services: #{e.message}"
          }, status: :internal_server_error
        end
      end
    end
  end

  def update_service
    @service = Service.find(params[:id])
    @company = Company.find_by(erp_client_id: @service.erp_client_id)
    updated_service_params =  ErpServiceProjects.new.get_updated_service(@service.erp_service_id).with_indifferent_access
    if updated_service_params[:service_id].present?
      after_update_service = Service.update_or_create_service(updated_service_params)
      service_detail = ServiceDetail.update_or_create_service_details(updated_service_params) if after_update_service
    end
    flash[:notice] = l(:service_synced_successfully)
    redirect_to company_path(@company)
  end

  # def existing_project_migration
  #   @companies = User.current.get_companies
  #   if params[:company].present?
  #     @company = Company.find(params[:company].to_i)
  #     @projects = User.current.get_company_projects(@company)
  #     @service_details  = User.current.get_unassigned_service_details_for_company(@company.erp_client_id).uniq
  #   end

  #   if params[:projects].present? && params[:final_services].present?
  #     project_ids = params[:projects][0].split(",")
  #     if project_ids.present?
  #       project_ids.each do |id|
  #         project = Project.find(id)
  #         @services = ServiceDetail.where(id: params[:final_services][id])
  #         if @services.present? && @services.map(&:project_id).compact.present?
  #           flash[:error] = l(:service_already_assigned_or_not_present)
  #           redirect_to services_existing_project_migration_path
  #           return
  #         end
  #         project.service_details <<  @services
  #         @services.update_all(added_by_id: User.current.id)
  #         project.attch_project_to_services_on_erp
  #         have_master = (project.service_details.present? && project.service_details.where(is_master: true).present?)
  #         unless have_master
  #           master_service = project.service_details.where(transferred_by: nil).first
  #           master_service.update_attribute(:is_master, true) if master_service.present?
  #         end
  #       end
  #     end
  #     flash[:notice] = l(:assigned_service_exsiting)
  #     redirect_to services_existing_project_migration_path
  #   elsif !params[:final_services].present? && params[:commit].present?
  #     flash[:error] = "Please add services"
  #     redirect_to services_existing_project_migration_path(company: @company.id)
  #     return
  #   end
  # end

  def migrate_project_company
    # Handle connecting company to project (both HTML and API)
    if params[:client_company_id].present? && params[:client_project].present?
      @project = Project.find(params[:client_project])
      @project.update_column(:erp_client_id, params[:client_company_id])
      
      respond_to do |format|
        format.html do
          flash[:notice] = "#{@project.company.name} is connected with #{@project.name}"
          redirect_to services_migrate_project_company_path
        end
        format.api do
          render json: {
            success: true,
            message: "#{@project.company.name} is connected with #{@project.name}",
            project: { id: @project.id, name: @project.name, identifier: @project.identifier }
          }
        end
      end
      return
    end

    # Handle client_email lookup
    if params[:client_email].present?
      unless defined?(ErpServiceProjects)
        respond_to do |format|
          format.html do
            flash[:error] = "ERP Service integration is not available"
            redirect_to services_migrate_project_company_path
          end
          format.api do
            render json: {
              company: nil,
              projects: [],
              grouped_projects: {},
              found: false,
              error: "ERP Service integration is not available"
            }, status: :service_unavailable
          end
        end
        return
      end

      begin
        erp_company_data = ErpServiceProjects.new.for_migrating_companies_from_erp(params[:client_email]).first
        if erp_company_data.class == Hash && erp_company_data.has_key?('email_id')
          @company = Company.find_by_erp_client_id(erp_company_data["client_id"])
          @projects = if User.current.admin?
            Project.where.not(id: 1).where("erp_client_id IS NULL or erp_client_id = ?", "")
          else
            User.current.projects.where.not(id: 1).where("erp_client_id IS NULL or erp_client_id = ?", "")
          end
        end
      rescue => e
        Rails.logger.error("Error fetching company from ERP: #{e.message}")
        Rails.logger.error(e.backtrace.join("\n"))
        @error_message = "Error fetching company data: #{e.message}"
      end
    end

    respond_to do |format|
      format.html { return } # Render the view template (migrate_project_company.html.erb)
      format.api do
        if params[:client_email].present?
          begin
            erp_company_data = ErpServiceProjects.new.for_migrating_companies_from_erp(params[:client_email]).first
            if erp_company_data.class == Hash && erp_company_data.has_key?('email_id')
              company = Company.find_by_erp_client_id(erp_company_data["client_id"])
              projects = if User.current.admin?
                Project.where.not(id: 1).where("erp_client_id IS NULL or erp_client_id = ?", "")
              else
                User.current.projects.where.not(id: 1).where("erp_client_id IS NULL or erp_client_id = ?", "")
              end
              
              # Group projects by status
              grouped_projects = {}
              if projects.present?
                if Project.respond_to?(:group_projects_by_status)
                  begin
                    grouped_projects = Project.group_projects_by_status(projects.to_a)
                  rescue => e
                    Rails.logger.warn("group_projects_by_status failed: #{e.message}")
                    grouped_projects = group_projects_by_status_fallback(projects.to_a)
                  end
                else
                  grouped_projects = group_projects_by_status_fallback(projects.to_a)
                end
              end
              
              render json: {
                company: company ? { id: company.id, name: company.name, erp_client_id: company.erp_client_id } : nil,
                projects: projects ? projects.map { |p| { id: p.id, name: p.name, status: p.status, identifier: p.identifier } } : [],
                grouped_projects: grouped_projects,
                found: company.present?
              }
            else
              render json: {
                company: nil,
                projects: [],
                grouped_projects: {},
                found: false,
                error: "No company found for #{params[:client_email]} email id"
              }
            end
          rescue => e
            Rails.logger.error("Error fetching company from ERP: #{e.message}")
            Rails.logger.error(e.backtrace.join("\n"))
            render json: {
              company: nil,
              projects: [],
              grouped_projects: {},
              found: false,
              error: "Error fetching company data: #{e.message}"
            }, status: :internal_server_error
          end
        elsif params[:client_company_id].present? && params[:client_project].present?
          project = Project.find(params[:client_project])
          project.update_column(:erp_client_id, params[:client_company_id])
          render json: {
            success: true,
            message: "#{project.company.name} is connected with #{project.name}",
            project: { id: project.id, name: project.name, identifier: project.identifier }
          }
        else
          render json: {
            company: nil,
            projects: [],
            grouped_projects: {},
            found: false
          }
        end
      end
    end
  end

  private

  def service_assignment_type(all_type, shared_type, new_type, project_basis)
    if shared_type && @selected_project.present?
      "SUB_AND_EXSITING"
    elsif (all_type ||  new_type) && @selected_project.present?
      "SUB_AND_EXSITING_AND_NEW"
    elsif (all_type ||  new_type) && !@selected_project.present?
      'NEW'
    elsif project_basis
      @projects = @services.map(&:service).first.projects
      "PROJECT_BASIS"
    else
      "None"
    end
  end

  def find_and_group_service_details
    if params[:selected_client_company].present?
      begin
        @selectd_company = Company.find_by(id: params[:selected_client_company].to_i)
        
        # If company not found, initialize empty data
        unless @selectd_company
          Rails.logger.warn "[ServicesController] Company not found: #{params[:selected_client_company]}"
          @supervisors = []
          @projects = []
          @service_details = []
          @grouped_service_details = []
          return
        end
        
        # Get supervisors with error handling
        @supervisors = begin
          User.current.get_supervisors(@selectd_company.erp_client_id) || []
        rescue => e
          Rails.logger.error "[ServicesController] Error getting supervisors: #{e.message}"
          []
        end
        
        # Optimize: Use eager loading for projects
        @projects = begin
          @selectd_company.projects.includes(:company).order("status") || []
        rescue => e
          Rails.logger.error "[ServicesController] Error getting projects: #{e.message}"
          []
        end
        
        # Optimize: Only load service details if needed (when services param is not present, we still need them for the dropdown)
        @service_details = begin
          User.current.get_service_details_with_hierarchy(@selectd_company.erp_client_id) || []
        rescue => e
          Rails.logger.error "[ServicesController] Error getting service details: #{e.message}"
          []
        end
        
        # Only group if we have service details
        if @service_details.present?
          @grouped_service_details = begin
            ServiceDetail.group_services_by_user(@service_details, params[:supervisor], @selectd_company.erp_client_id) || []
          rescue => e
            Rails.logger.error "[ServicesController] Error grouping service details: #{e.message}"
            []
          end
        else
          @grouped_service_details = []
        end
      rescue => e
        # Catch any unexpected errors and log them
        Rails.logger.error "[ServicesController] Unexpected error in find_and_group_service_details: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        
        # Initialize all instance variables to prevent nil errors
        @selectd_company = nil
        @supervisors = []
        @projects = []
        @service_details = []
        @grouped_service_details = []
      end
    end
  end

  def new_master_if_project_is_not_active(project, existing_master, canditate_of_new_master)
    canditate_of_new_master.update_column(:is_master, true) if !existing_master.present? || existing_master.status != "IN-PROGRESS"
    existing_master.update_column(:is_master, false) if existing_master.present?
    project.update_column(:status, Project::STATUS_ACTIVE) unless project.active?
  end

  def group_projects_by_status_fallback(projects)
    grouped = projects.uniq.group_by(&:status)
    result = {}
    
    grouped.each do |status, projects_list|
      status_label = case status
      when Project::STATUS_CLOSED
        "Closed"
      when 10 # STATUS_ONHOLD (from projects_reporting plugin)
        "On Hold"
      when 11 # STATUS_CANCELLED (from projects_reporting plugin)
        "Cancelled"
      when 12 # STATUS_COMPLETE (from projects_reporting plugin)
        "Complete"
      when Project::STATUS_ARCHIVED
        "Archived"
      when Project::STATUS_ACTIVE
        "Active"
      else
        "Active"
      end
      
      result[status_label.to_sym] = projects_list.map { |p| [p.name, p.identifier] }
    end
    
    result
  end
end
