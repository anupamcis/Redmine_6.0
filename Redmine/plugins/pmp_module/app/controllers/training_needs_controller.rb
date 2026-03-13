class TrainingNeedsController < ApplicationController

  before_action :authorize_global
  before_action :find_training_need, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @training_need = TrainingNeed.new
  end

  def create
    attendees = User.where(id: params[:training_need][:attendees])
    params[:training_need][:attendees] = attendees.to_a
    params[:training_need][:status] = "Proposed"
    @training_need = TrainingNeed.new(params[:training_need])
    @training_need.add_coordination_plan if @training_need.training_method == "External"
    if @training_need.save
      @training_need.send_mail if  @training_need.training_method == "External"
      respond_to do |format|
        flash[:notice] = l(:training_need_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "training")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'training')}'"}
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
    attendees = User.where(id: params[:training_need][:attendees])
    params[:training_need][:attendees] = attendees.to_a
    if @training_need.update_attributes(params[:training_need])
      respond_to do |format|
        flash[:notice] = l(:training_need_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "training")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'training')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @training_need.destroy
    flash[:notice] = l(:training_need_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "training")
  end

  private

  def find_training_need
    @training_need = TrainingNeed.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
