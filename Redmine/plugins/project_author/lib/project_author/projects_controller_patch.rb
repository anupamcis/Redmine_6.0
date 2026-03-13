module ProjectAuthor
  module ProjectsControllerPatch
    def self.included(base)
      base.send(:include, InstanceMethods)
      base.class_eval do
        after_action :add_project_author, only: [:create]
      end
    end

    module InstanceMethods
      def remove_company
        @project.update_column(:erp_client_id, nil)
        flash[:notice] = l(:removal_success_message, project: @project.name)
        if params[:back_path] == "to_project"
          redirect_to :controller => :projects, :action => :settings, :tab => "assigned_service", :id => @project
        else
          redirect_to admin_projects_path(:status => params[:status])
        end
      end
    end

    private
    def add_project_author
      if @project && @project.errors.messages.blank?
        @project.update_column('project_author_id', User.current.id)
        add_base_line(@project)
        add_dmfs_default_folder(@project)
        add_back_details(@project)
        add_data_retention_plans(@project)
        add_verification_plans(@project)
        add_raci_matrix_filters
        PmpTabAndLockConfiguration.where(default_tab: true).each do |tab|
          tab.project_processes.find_or_create_by(project_id: @project.id, is_enabled: true)
        end
      end
    end

    def add_base_line(project)
      BASE_LINE_STATIC_VALUES.each do |base_line|
        base_plan = BaseLiningPlan.new({when_to_baseline: base_line[0],
          trigger_for_baseline: base_line[1],
          project_id: project.id,
          what_to_baseline: base_line[2]})
        base_plan.save(validate: false)
      end
    end

    def add_dmfs_default_folder(project)
      DMFS_DEFUALT_FOLDER.each do |folder_name|
        folder = DmsfFolder.new({project_id: project.id, title: folder_name,
          description: "Folder is used for #{folder_name} documents",
          user_id: User.current.id})
        folder.save(validate: false)
      end
    end

    def add_back_details(project)
      global_details = GlobalBackUpDetail.all
      if global_details.present?
        global_details.each do |global_detail|
          back_up_detail = BackUpDetail.new({project_id: project.id, server_name: global_detail.server_name,
            backup_type: global_detail.backup_type, data_detail: global_detail.data_detail,
            media_label: global_detail.media_label, backup_frequency: global_detail.backup_frequency,
            detail_of_media_storage: global_detail.detail_of_media_storage,
            role_responsible: global_detail.role_responsible, remarks: global_detail.remarks})
          back_up_detail.save(validate: false)
        end
      end
    end

    def add_data_retention_plans(project)
      global_retention_plans = GlobalDataRetentionPlan.all
      if global_retention_plans.present?
        global_retention_plans.each do |retention|
          retention_plan = DataRetentionPlan.new({project_id: project.id, record_name: retention.record_name,
            min_retention: retention.min_retention, type_of_record: retention.type_of_record,
            storage_path: retention.storage_path, disposal: retention.disposal, remarks: retention.remarks })
          retention_plan.save(validate: false)
        end
      end
    end

    def add_verification_plans(project)
      DEFAULT_VERIFICATION_PLAN.each do |verification_plan|
        new_plan = VerificationPlan.new({sdlc_phase: verification_plan[:sdlc_phase],
          work_product: verification_plan[:work_product],
          verification_method: verification_plan[:verification_method],
          validation_technique: verification_plan[:validation_technique],
          project_id: project.id})
        new_plan.save(validate: false)
      end
    end

    def add_raci_matrix_filters
      matrix_filter = ProjectResponsibilityAssignmentMatrixFilter.find_or_initialize_by(project_id: @project.id)
      matrix_filter.update(matrix_type: "Role", matrix_filter: RaciChart.all.ids)
      add_raci_matrix
    end

    def add_raci_matrix
      hr_m_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: @project.id, role_id: RaciRole.find_by(name: "HR Manager").id)
      hr_m_raci.update({responsibility: HR_MANAGER_RACI_REPONSBILITIES } )
      web_or_mobile_manager_raci
    end

    def web_or_mobile_manager_raci
      project_manager = @project.members.joins(:roles).where("roles.name = ?", "Project Manager").first
      department_name = project_manager.try(:user).try(:employee).try(:department).try(:name) if project_manager.present?
      if department_name.present?
        raci_role_name = department_name.downcase.include?("mobile") ? "Mobile Manager" : "Web Manager"
        web_mob_m_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: @project.id, role_id: RaciRole.find_by(name: raci_role_name).id)
        web_mob_m_raci.update({responsibility: MOBILE_AND_WEB_MANAGER_RACI_REPONSBILITIES } )
      end
    end
  end
end
