class RiskMitigationPlansController < ApplicationController

  before_action :find_risk_migration_plan, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @risk_mitigation_plan = RiskMitigationPlan.new
  end

  def create
    @risk_mitigation_plan = RiskMitigationPlan.new(params[:risk_mitigation_plan])
    if @risk_mitigation_plan.save
      respond_to do |format|
        flash[:notice] = l(:risk_mitigation_plan_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "risk")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'risk')}'"}
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
    if @risk_mitigation_plan.update_attributes(params[:risk_mitigation_plan])
      respond_to do |format|
        flash[:notice] = l(:risk_mitigation_plan_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "risk")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'risk')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @risk_mitigation_plan.destroy
    flash[:notice] = l(:risk_mitigation_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "risk")
  end

  private

  def find_risk_migration_plan
    @risk_mitigation_plan = RiskMitigationPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
