class ReusableArtifactsController < ApplicationController

  before_action :authorize_global
  before_action :find_reusable_artifact, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @reusable_artifact = ReusableArtifact.new
  end

  def create
    @reusable_artifact = ReusableArtifact.new(params[:reusable_artifact])
    if @reusable_artifact.save
      respond_to do |format|
        flash[:notice] = l(:reusable_artifact_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "lessons_learned_and_reusable_artifacts")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'lessons_learned_and_reusable_artifacts')}'"}
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
    if @reusable_artifact.update_attributes(params[:reusable_artifact])
      respond_to do |format|
        flash[:notice] = l(:reusable_artifact_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "lessons_learned_and_reusable_artifacts")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'lessons_learned_and_reusable_artifacts')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @reusable_artifact.destroy
    flash[:notice] = l(:reusable_artifact_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "lessons_learned_and_reusable_artifacts")
  end

  private

  def find_reusable_artifact
    @reusable_artifact = ReusableArtifact.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
