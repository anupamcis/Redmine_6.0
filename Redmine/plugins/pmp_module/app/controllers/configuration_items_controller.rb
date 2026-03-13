class ConfigurationItemsController < ApplicationController

  before_action :authorize_global
  before_action :find_configuration_item, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @configuration_item = ConfigurationItem.new
  end

  def create
    @configuration_item = ConfigurationItem.new(params[:configuration_item])
    if @configuration_item.save
      respond_to do |format|
        flash[:notice] = l(:configuration_item_add_success)
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
    if @configuration_item.update_attributes(params[:configuration_item])
      respond_to do |format|
        flash[:notice] = l(:configuration_item_update_success)
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
    @configuration_item.destroy
    flash[:notice] = l(:configuration_item_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "configuration_and_data_management_plan")
  end

  private

  def find_configuration_item
    @configuration_item = ConfigurationItem.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

end
