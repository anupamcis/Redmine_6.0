class CommunicationPlansController < ApplicationController

  before_action :authorize_global
  before_action :find_communication_plan, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @communication_plan = CommunicationPlan.new
  end

  def create
    @communication_plan = CommunicationPlan.new(params[:communication_plan])
    if @communication_plan.save
      respond_to do |format|
        flash[:notice] = l(:communication_plan_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "communication_and_coordination")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'communication_and_coordination')}'"}
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
    if @communication_plan.update_attributes(params[:communication_plan])
      respond_to do |format|
        flash[:notice] = l(:communication_plan_update_success)
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
    @communication_plan.destroy
    flash[:notice] = l(:communication_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "communication_and_coordination")
  end

  private

  def find_communication_plan
    @communication_plan = CommunicationPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

end
