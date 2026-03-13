class BackUpDetailsController < ApplicationController

  before_action :authorize_global
  before_action :find_back_up_detail, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @back_up_detail = BackUpDetail.new
  end

  def create
    @back_up_detail = BackUpDetail.new(params[:back_up_detail])
    if @back_up_detail.save
      respond_to do |format|
        flash[:notice] = l(:back_up_detail_add_success)
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
    if @back_up_detail.update_attributes(params[:back_up_detail])
      respond_to do |format|
        flash[:notice] = l(:back_up_detail_update_success)
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
    @back_up_detail.destroy
    flash[:notice] = l(:back_up_detail_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_back_up_detail
    @back_up_detail = BackUpDetail.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
