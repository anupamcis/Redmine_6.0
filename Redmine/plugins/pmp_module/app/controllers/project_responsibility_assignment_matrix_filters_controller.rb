class ProjectResponsibilityAssignmentMatrixFiltersController < ApplicationController

  before_action :authorize_global
  before_action :get_project, only: [:create, :update]

  def create
    @matrix_filter = @project.build_project_responsibility_assignment_matrix_filter(params[:project_responsibility_assignment_matrix_filter])
    respond_to do |format|
      if @matrix_filter.save
        flash[:notice] = l(:filter_matrix_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, tab: "staffing_plan")) }
        format.js
      else
        format.html { render action: 'new' }
        format.js
      end
    end
  end

  def update
    @matrix_filter = @project.project_responsibility_assignment_matrix_filter
    respond_to do |format|
      unless @matrix_filter.matrix_type.eql?(params[:project_responsibility_assignment_matrix_filter][:matrix_type])
        @matrices_for_remove = @project.responsibility_assignment_matrices
      end
      if @matrix_filter.update(params[:project_responsibility_assignment_matrix_filter])
        flash[:notice] = l(:filter_matrix_updated_success)
        @matrices_for_remove.delete_all if @matrices_for_remove.present?
        add_raci_after_type_change if @matrix_filter.matrix_type.eql?("Role")
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, tab: "staffing_plan")) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  private

  def get_project
    @project = Project.find(params[:project_id])
  end

  def add_raci_after_type_change
    @project.members.each do |member|
      member.send(:add_raci_chart)
    end
    raci_for_other_roles
  end

  def raci_for_other_roles
    #client poc raci
    if @project.members.where(is_poc: true).present?
      client_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: @project.id, role_id: RaciRole.find_by(name: "Client POC").id)
      client_raci.update_attributes(responsibility: CLIENT_RACI_REPONSBILITIES )
    end

    #Hr Manager Raci
    hr_m_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: @project.id, role_id: RaciRole.find_by(name: "HR Manager").id)
    hr_m_raci.update_attributes({responsibility: HR_MANAGER_RACI_REPONSBILITIES } )

    #Web or Mobile manager raci
    project_manager = @project.members.joins(:roles).where("roles.name = ?", "Project Manager").first
    department_name = project_manager.try(:user).try(:employee).try(:department).try(:name) if project_manager.present?
    if department_name.present?
      raci_role_name = department_name.downcase.include?("mobile") ? "Mobile Manager" : "Web Manager"
      web_mob_m_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: @project.id, role_id: RaciRole.find_by(name: raci_role_name).id)
      web_mob_m_raci.update_attributes({responsibility: MOBILE_AND_WEB_MANAGER_RACI_REPONSBILITIES } )
    end
  end
end
