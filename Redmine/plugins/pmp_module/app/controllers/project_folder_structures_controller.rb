class ProjectFolderStructuresController < ApplicationController

  before_action :authorize_global
  before_action :find_project_folder_structure, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @project_folder_structure = ProjectFolderStructure.new
  end

  def create
    @project_folder_structure = ProjectFolderStructure.new(params[:project_folder_structure])
    if @project_folder_structure.save
      respond_to do |format|
        flash[:notice] = l(:project_folder_structure_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'configuration_and_data_management_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'new' }
        format.js
      end
    end
  end

  def edit
  end

  def update
    if @project_folder_structure.update_attributes(params[:project_folder_structure])
      respond_to do |format|
        flash[:notice] = l(:project_folder_structure_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'configuration_and_data_management_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @project_folder_structure.destroy
    flash[:notice] = l(:project_folder_structure_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_project_folder_structure
    @project_folder_structure = ProjectFolderStructure.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
