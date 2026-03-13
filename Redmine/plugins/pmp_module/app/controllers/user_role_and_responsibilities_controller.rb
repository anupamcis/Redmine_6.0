class UserRoleAndResponsibilitiesController < ApplicationController

  before_action :authorize_global, :except => [:user_roles, :set_user_role_and_responsibilities, :select_reporting_person]
  before_action :find_user_role_and_responsibility, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @user_role_and_responsibility = UserRoleAndResponsibility.new
  end

  def create
    @user_role_and_responsibility = UserRoleAndResponsibility.new(params[:user_role_and_responsibility])
    if @user_role_and_responsibility.save
      respond_to do |format|
        flash[:notice] = l(:user_role_and_responsibility_add_success)
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
    if @user_role_and_responsibility.update_attributes(params[:user_role_and_responsibility])
      respond_to do |format|
        flash[:notice] = l(:user_role_and_responsibility_update_success)
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
    @user_role_and_responsibility.destroy
    flash[:notice] = l(:user_role_and_responsibility_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "staffing_plan")
  end

  def user_roles
    @roles = @project.members.where(user_id: params[:user_role_and_responsibility][:user_id]).first.roles.where("name not like (?) ", "%CIS%")
    respond_to do |format|
      format.js
    end
  end

  def set_user_role_and_responsibilities
    user_role_and_responsibility = @project.user_role_and_responsibilities.find_or_initialize_by(user_id: user_role_and_responsibility_params[:user_id])
    user_role_and_responsibility.reporting_person_id = user_role_and_responsibility_params[:reporting_person_id]
    user_role_and_responsibility.save
  end

  def select_reporting_person
    @user = User.find(params[:user_id])
  end

  private

  def find_user_role_and_responsibility
    @user_role_and_responsibility = UserRoleAndResponsibility.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

  def user_role_and_responsibility_params
    params.require(:user_role_and_responsibility).permit(:reporting_person_id, :user_id)
  end
end
