class DataRetentionPlansController < ApplicationController

  before_action :authorize_global
  before_action :find_data_retention_plan, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @data_retention_plan = DataRetentionPlan.new
  end

  def create
    @data_retention_plan = DataRetentionPlan.new(params[:data_retention_plan])
    if @data_retention_plan.save
      respond_to do |format|
        flash[:notice] = l(:data_retention_plan_add_success)
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
    if @data_retention_plan.update_attributes(params[:data_retention_plan])
      respond_to do |format|
        flash[:notice] = l(:data_retention_plan_update_success)
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
    @data_retention_plan.destroy
    flash[:notice] = l(:data_retention_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_data_retention_plan
    @data_retention_plan = DataRetentionPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
