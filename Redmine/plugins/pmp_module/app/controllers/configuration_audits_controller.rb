class ConfigurationAuditsController < ApplicationController

  before_action :authorize_global
  before_action :find_configuration_audit, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @configuration_audit = ConfigurationAudit.new
  end

  def create
    params[:configuration_audit][:auditor] = "SQA"
    @configuration_audit = ConfigurationAudit.new(params[:configuration_audit])
    if @configuration_audit.save
      respond_to do |format|
        flash[:notice] = l(:configuration_audit_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'configuration_and_data_management_plan')}'"}
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
    params[:configuration_audit][:auditor] = "SQA"
    if @configuration_audit.update_attributes(params[:configuration_audit])
      respond_to do |format|
        flash[:notice] = l(:configuration_audit_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'configuration_and_data_management_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @configuration_audit.destroy
    flash[:notice] = l(:configuration_audit_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_configuration_audit
    @configuration_audit = ConfigurationAudit.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
