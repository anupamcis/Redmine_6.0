class HardwareSoftwareSupliedByClientsController < ApplicationController

  before_action :authorize_global
  before_action :find_hardware_software_suplied_by_client, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @hardware_software_suplied_by_client = HardwareSoftwareSupliedByClient.new
  end

  def create
    @hardware_software_suplied_by_client = HardwareSoftwareSupliedByClient.new(params[:hardware_software_suplied_by_client])
    if @hardware_software_suplied_by_client.save
      respond_to do |format|
        flash[:notice] = l(:hardware_software_suplied_by_client_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'hardware_and_software_plan')}'"}
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
    if @hardware_software_suplied_by_client.update_attributes(params[:hardware_software_suplied_by_client])
      respond_to do |format|
        flash[:notice] = l(:hardware_software_suplied_by_client_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'hardware_and_software_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @hardware_software_suplied_by_client.destroy
    flash[:notice] = l(:hardware_software_suplied_by_client_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")
  end

  private

  def find_hardware_software_suplied_by_client
    @hardware_software_suplied_by_client = HardwareSoftwareSupliedByClient.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
