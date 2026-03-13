class StaffNeedsController < ApplicationController

  before_action :authorize_global
  before_action :find_staff_need, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @staff_need = StaffNeed.new
  end

  def create
    attendees = User.where(id: params[:staff_need][:allocated_persons])
    params[:staff_need][:allocated_persons] = attendees.to_a
    params[:staff_need][:is_deleted] = true
    @staff_need = StaffNeed.new(params[:staff_need])
    if @staff_need.save
      respond_to do |format|
        flash[:notice] = l(:staff_need_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "staffing_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'staffing_plan')}'"}
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
    attendees = User.where(id: params[:staff_need][:allocated_persons])
    params[:staff_need][:allocated_persons] = attendees.to_a
    params[:staff_need][:is_deleted] = true
    if @staff_need.update_attributes(params[:staff_need])
      respond_to do |format|
        flash[:notice] = l(:staff_need_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "staffing_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'staffing_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @staff_need.destroy
    flash[:notice] = l(:staff_need_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "staffing_plan")
  end

  private

  def find_staff_need
    @staff_need = StaffNeed.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
