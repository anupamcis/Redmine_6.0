class StakeholderManagementPlansController < ApplicationController

  before_action :authorize_global
  before_action :find_stakeholder_management_plan, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @stakeholder_management_plan = StakeholderManagementPlan.new
  end

  def create
    @project.stakeholder_management_plans.destroy_all if @project.stakeholder_management_plans.present?
    begin
      params[:stakeholder_management_plan].values.each do |plan|
        if plan.keys.length > 2
          management_plan = StakeholderManagementPlan.find_or_create_by(user_id: plan[:user_id], project_id: plan[:project_id])
          management_plan.update_attributes(plan)
        end
      end
      # @stakeholder_management_plan = StakeholderManagementPlan.new(params[:stakeholder_management_plan])
      # if @stakeholder_management_plan.save
        respond_to do |format|
          flash[:notice] = l(:stakeholder_management_add_success)
          format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "communication_and_coordination")) }
          format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'communication_and_coordination')}'"}
        end
    # else
    rescue => e
      respond_to do |format|
        format.html { render :action => 'new' }
        format.js
      end
    end
  end

  def edit
  end

  def update
    if @stakeholder_management_plan.update_attributes(params[:stakeholder_management_plan])
      respond_to do |format|
        flash[:notice] = l(:stakeholder_management_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "communication_and_coordination")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'communication_and_coordination')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @stakeholder_management_plan.destroy
    flash[:notice] = l(:stakeholder_management_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "communication_and_coordination")
  end

  private

  def find_stakeholder_management_plan
    @stakeholder_management_plan = StakeholderManagementPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end


end
