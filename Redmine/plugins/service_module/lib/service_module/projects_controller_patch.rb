module ServiceModule
  module ProjectsControllerPatch

    def self.included(base)
      base.send(:include, InstanceMethods)
      base.class_eval do

        alias_method :create_without_service_module, :create
        alias_method :create, :create_with_service_module
        alias_method :new_without_service_module, :new
        alias_method :new, :new_with_service_module
        alias_method :update_without_service_module, :update
        alias_method :update, :update_with_service_module
        alias_method :settings_without_service_module, :settings
        alias_method :settings, :settings_with_service_module
      end
    end

    module InstanceMethods

      def new_with_service_module
        respond_to do |format|
          format.html do
            if params[:selected_service_ids].present?
              @issue_custom_fields = IssueCustomField.sorted.to_a
              @trackers = Tracker.sorted.to_a
              @project = Project.new
              @service_details = ServiceDetail.where(id: params[:selected_service_ids])
              @company  = Company.find(params[:selected_client_company])
              @project.safe_attributes = params[:project] || {}
            elsif User.current.admin? || params[:parent_id].present?
               @issue_custom_fields = IssueCustomField.sorted.to_a
               @trackers = Tracker.sorted.to_a
               @project = Project.new
               @project.safe_attributes = params[:project] || {}
            else
              flash[:error] = l(:presence_of_service)
              redirect_to_referer_or home_path
            end
          end
          format.js do
            # Handle AJAX request for modal popup
            if params[:selected_service_ids].present?
              # Handle both array and string formats for selected_service_ids
              service_ids = if params[:selected_service_ids].is_a?(Array)
                params[:selected_service_ids]
              elsif params[:selected_service_ids].is_a?(String)
                params[:selected_service_ids].split(',').map(&:strip).reject(&:blank?)
              else
                [params[:selected_service_ids]].flatten
              end
              
              @issue_custom_fields = IssueCustomField.sorted.to_a
              @trackers = Tracker.sorted.to_a
              @project = Project.new
              @service_details = ServiceDetail.where(id: service_ids) if service_ids.present?
              if params[:selected_client_company].present?
                begin
                  @company = Company.find(params[:selected_client_company])
                rescue ActiveRecord::RecordNotFound => e
                  Rails.logger.warn("Company not found: #{params[:selected_client_company]}")
                  @company = nil
                end
              end
              @project.safe_attributes = params[:project] || {}
            elsif User.current.admin? || params[:parent_id].present?
              @issue_custom_fields = IssueCustomField.sorted.to_a
              @trackers = Tracker.sorted.to_a
              @project = Project.new
              @project.safe_attributes = params[:project] || {}
            else
              render js: "alert('#{l(:presence_of_service)}');"
              return
            end
            # Render new.js.erb which will populate the modal
          end
          format.api do
            if params[:selected_service_ids].present?
              service_ids = if params[:selected_service_ids].is_a?(Array)
                params[:selected_service_ids]
              elsif params[:selected_service_ids].is_a?(String)
                params[:selected_service_ids].split(',').map(&:strip).reject(&:blank?)
              else
                [params[:selected_service_ids]].flatten
              end
              @service_details = ServiceDetail.where(id: service_ids) if service_ids.present?
              @company = Company.find(params[:selected_client_company]) if params[:selected_client_company].present?
            elsif params[:selected_client_company].present?
              # Even if no services selected, still load company
              @company = Company.find(params[:selected_client_company])
            end
            @issue_custom_fields = IssueCustomField.sorted.to_a
            @trackers = Tracker.sorted.to_a
            @project = Project.new
            @project.safe_attributes = params[:project] if params[:project].present?
            
            # Get application types
            application_types = []
            begin
              if defined?(ServiceModule::ProjectPatch::TYPES)
                application_types = ServiceModule::ProjectPatch::TYPES.map { |t| { label: t[0], value: t[1] } }
              end
            rescue => e
              Rails.logger.warn("Failed to load application types: #{e.message}")
            end
            
            # Get technologies
            technologies = []
            begin
              if defined?(ErpServiceProjects)
                erp_service = ErpServiceProjects.new
                skills = erp_service.get_skills
                technologies = skills.is_a?(Array) ? skills.map { |s| { label: s, value: s } } : []
              end
            rescue => e
              Rails.logger.warn("Failed to load technologies: #{e.message}")
            end
            
            render json: {
              service_details: @service_details ? @service_details.map { |s| { id: s.id, name: s.service_detail_name } } : [],
              company: @company ? { id: @company.id, name: @company.name } : nil,
              trackers: @trackers.map { |t| { id: t.id, name: t.name } },
              custom_fields: @issue_custom_fields.map { |cf| { id: cf.id, name: cf.name, field_format: cf.field_format } },
              enabled_modules: Redmine::AccessControl.available_project_modules,
              application_types: application_types,
              technologies: technologies
            }
          end
        end
      end

      def create_with_service_module
        my_logger = Logger.new("#{Rails.root}/log/project_member.log")
        @issue_custom_fields = IssueCustomField.sorted.to_a
        @trackers = Tracker.sorted.to_a
        @project = Project.new
        @project.safe_attributes = params[:project] || {}
          if params[:selected_service_ids].present?
            service_ids = if params[:selected_service_ids].is_a?(Array)
              params[:selected_service_ids]
            elsif params[:selected_service_ids].is_a?(String)
              params[:selected_service_ids].split(',').map(&:strip).reject(&:blank?)
            else
              [params[:selected_service_ids]].flatten
            end
            @service_details = ServiceDetail.where(id: service_ids) if service_ids.present?
            if params[:selected_client_company].present?
              company_id = params[:selected_client_company].to_s.strip
              # Skip if it's the string "[object Object]" or not a valid integer
              if company_id.present? && company_id != '[object Object]' && company_id.match?(/^\d+$/)
                begin
                  @company = Company.find(company_id)
                rescue ActiveRecord::RecordNotFound => e
                  Rails.logger.warn("Company not found with ID: #{company_id}")
                  @company = nil
                end
              end
            end
            @project.service_details << @service_details if @service_details.present?
          end
        @project.erp_client_id  = @project.parent.present? ? @project.try(:parent).try(:erp_client_id) : @company.try(:erp_client_id)

        if @project.save
          unless User.current.admin?
            @project.add_default_sub_member(User.current)
          end

          if params[:selected_service_ids].present?
            master_service = @project.service_details.where(transferred_by: nil).first
            master_service.update_attribute(:is_master, true) if master_service.present?
            @service_details.update_all(added_by_id: User.current.id)
            my_logger.info("------ #{@project.id}-Start------------")
            my_logger.info("master_service #{master_service.inspect}")
            if master_service.present?
              service = master_service.service
              my_logger.info("service #{service.inspect}")
              # Account Manager(BDE)
              role = Role.find(12) || Role.find_by(name: 'Account Manager(BDE)')
              employee = Employee.find_by(employee_id: service.account_manager_employee_id)
              user = employee.user if employee.present?
              my_logger.info("role #{role.inspect}")
              my_logger.info("employee #{employee.inspect}")
              my_logger.info("user #{user.inspect}") if user.present?
              my_logger.info("role.present? && user.present? #{role.present? && user.present?}")
              if role.present? && user.present?
                member = Member.new(:project => @project, :principal => user, :roles => [role])
                my_logger.info("member #{member.inspect}")
                @project.members << member
                my_logger.info("@project.members #{@project.members}")
                @project.save
                my_logger.info("@project.save #{@project.save}")
              end
              my_logger.info("------#{@project.id}-End------------")
              # update_service_count  # TODO: Define this method if needed
            end
          end

          @project.attch_project_to_services_on_erp

          create_default_members if valid_project?

          respond_to do |format|
            format.html {
              flash[:notice] = l(:notice_successful_create)
              if params[:continue]
                attrs = {:parent_id => @project.parent_id}.reject {|k,v| v.nil?}
                redirect_to new_project_path(attrs)
              else
                session[:service_details] = []
                redirect_to settings_project_path(@project)
              end
            }
            format.js { render js: "window.location='#{settings_project_path(@project)}'" }
            format.api do
              render :action => 'show', :status => :created, :location => url_for(:controller => 'projects', :action => 'show', :id => @project.id)
            end
            format.json do
              render json: {
                project: {
                  id: @project.id,
                  identifier: @project.identifier,
                  name: @project.name
                }
              }, status: :created
            end
          end
        else
          respond_to do |format|
            format.html { render :action => 'new' }
            format.js
            format.api  { render_validation_errors(@project) }
          end
        end
      end

      def update_with_service_module
        @project.safe_attributes = params[:project] || {}
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

      def settings_with_service_module
        settings_without_service_module
        if params[:service_status].present?
          status = params[:service_status].upcase.eql?("ALL") ? ALL_SERVICE_STATUS : params[:service_status].upcase
          @service_details = @project.service_details.where(status: status)
        else
          @service_details = @project.service_details.where(status: SERVICE_ACTIVE_STATUS)
        end
      end

    end
  end
end