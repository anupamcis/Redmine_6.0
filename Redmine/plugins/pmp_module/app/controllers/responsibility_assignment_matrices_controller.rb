class ResponsibilityAssignmentMatricesController < ApplicationController

  before_action :authorize_global
  before_action :find_project
  before_action :find_responsibility_assignment_matrix, :only => [:edit, :update]


  def new
    @filter_type =  params[:filter_type]
    @responsibility_assignment_matrix  = ResponsibilityAssignmentMatrix.new
  end

  def create
    @responsibility_assignment_matrix  = ResponsibilityAssignmentMatrix.new
    @responsibility_assignment_matrix.create_update_raci_chart(params, @project)
    respond_to do |format|
      flash[:notice] = l(:assignment_matrix_add_success)
      format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "staffing_plan")) }
      format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'staffing_plan')}'"}
    end
  end

  def edit
    @filter_type =  params[:filter_type]
  end

  def update
    @responsibility_assignment_matrix.create_update_raci_chart(params, @project)
    respond_to do |format|
      flash[:notice] = l(:assignment_matrix_update_success)
      format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "staffing_plan")) }
      format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'staffing_plan')}'"}
    end
  end

  def destroy
    @project.responsibility_assignment_matrices.destroy_all
    flash[:notice] = l(:assignment_matrix_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "staffing_plan")
  end

  private

  def find_responsibility_assignment_matrix
    @responsibility_assignment_matrix = @project.responsibility_assignment_matrices.first
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
