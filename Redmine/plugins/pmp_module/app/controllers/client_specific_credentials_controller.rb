class ClientSpecificCredentialsController < ApplicationController

  before_action :authorize_global
  before_action :find_client_specific_credential, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @client_specific_credential = ClientSpecificCredential.new
  end

  def create
    @client_specific_credential = ClientSpecificCredential.new(params[:client_specific_credential])
    if @client_specific_credential.save
      respond_to do |format|
        flash[:notice] = l(:client_specific_credential_add_success)
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
    if @client_specific_credential.update_attributes(params[:client_specific_credential])
      respond_to do |format|
        flash[:notice] = l(:client_specific_credential_update_success)
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
    @client_specific_credential.destroy
    flash[:notice] = l(:client_specific_credential_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_client_specific_credential
    @client_specific_credential = ClientSpecificCredential.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
