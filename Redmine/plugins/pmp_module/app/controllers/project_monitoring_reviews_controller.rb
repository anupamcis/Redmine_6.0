class ProjectMonitoringReviewsController < ApplicationController

  before_action :authorize_global
  before_action :find_project_monitoring_review, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @project_monitoring_review = ProjectMonitoringReview.new
  end

  def create
    @project_monitoring_review = ProjectMonitoringReview.new(params[:project_monitoring_review])
    if @project_monitoring_review.save
      respond_to do |format|
        flash[:notice] = l(:monitoring_review_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "project_monitoring_review")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'project_monitoring_review')}'"}
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
    if @project_monitoring_review.update_attributes(params[:project_monitoring_review])
      respond_to do |format|
        flash[:notice] = l(:monitoring_review_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "project_monitoring_review")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'project_monitoring_review')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @project_monitoring_review.destroy
    flash[:notice] = l(:monitoring_review_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "project_monitoring_review")
  end

  private

  def find_project_monitoring_review
    @project_monitoring_review = ProjectMonitoringReview.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
