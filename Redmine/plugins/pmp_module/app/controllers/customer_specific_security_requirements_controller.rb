class CustomerSpecificSecurityRequirementsController < ApplicationController

  before_action :authorize_global
  before_action :find_security_requirement, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @security_requirement = CustomerSpecificSecurityRequirement.new
  end

  def create
    @security_requirement = CustomerSpecificSecurityRequirement.new(params[:customer_specific_security_requirement])
    if @security_requirement.save
      respond_to do |format|
        flash[:notice] = l(:security_requirement_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "security_requirements")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'security_requirements')}'"}
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
    if @security_requirement.update_attributes(params[:customer_specific_security_requirement])
      respond_to do |format|
        flash[:notice] = l(:security_requirement_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "security_requirements")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'security_requirements')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @security_requirement.destroy
    flash[:notice] = l(:security_requirement_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "acronyms_and_glossaries")
  end

  private
  def find_security_requirement
    @security_requirement = CustomerSpecificSecurityRequirement.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
