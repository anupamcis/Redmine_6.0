class BaseLiningPlansController < ApplicationController

  before_action :authorize_global
  before_action :find_base_lining_plan, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @base_lining_plan = BaseLiningPlan.new
  end

  def create
    @base_lining_plan = BaseLiningPlan.new(params[:base_lining_plan])
    if @base_lining_plan.save
      respond_to do |format|
        flash[:notice] = l(:base_lining_plan_add_success)
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
    if @base_lining_plan.update_attributes(params[:base_lining_plan])
      respond_to do |format|
        flash[:notice] = l(:base_lining_plan_update_success)
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
    @base_lining_plan.destroy
    flash[:notice] = l(:base_lining_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_base_lining_plan
    @base_lining_plan = BaseLiningPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
