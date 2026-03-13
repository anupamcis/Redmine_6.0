class CoordinationPlansController < ApplicationController

  before_action :authorize_global
  before_action :find_coordination_plan, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @coordination_plan = CoordinationPlan.new
  end

  def create
    @coordination_plan = CoordinationPlan.new(params[:coordination_plan])
    if @coordination_plan.save
      respond_to do |format|
        flash[:notice] = l(:coordination_plan_add_success)
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
    if @coordination_plan.update_attributes(params[:coordination_plan])
      respond_to do |format|
        flash[:notice] = l(:coordination_plan_update_success)
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
    @coordination_plan.destroy
    flash[:notice] = l(:coordination_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "communication_and_coordination")
  end

  private

  def find_coordination_plan
    @coordination_plan = CoordinationPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
