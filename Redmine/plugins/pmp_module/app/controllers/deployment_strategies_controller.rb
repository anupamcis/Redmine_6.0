class DeploymentStrategiesController < ApplicationController

  before_action :authorize_global
  before_action :find_deployment_strategy, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @deployment_strategy = DeploymentStrategy.new
  end

  def create
    @deployment_strategy = DeploymentStrategy.new(params[:deployment_strategy])
    if @deployment_strategy.save
      respond_to do |format|
        flash[:notice] = l(:deployment_strategy_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "deployment_strategy")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'deployment_strategy')}'"}
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
    if @deployment_strategy.update_attributes(params[:deployment_strategy])
      respond_to do |format|
        flash[:notice] = l(:deployment_strategy_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "deployment_strategy")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'deployment_strategy')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @deployment_strategy.destroy
    flash[:notice] = l(:deployment_strategy_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "standards_and_guidelines")
  end

  private

  def find_deployment_strategy
    @deployment_strategy = DeploymentStrategy.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
