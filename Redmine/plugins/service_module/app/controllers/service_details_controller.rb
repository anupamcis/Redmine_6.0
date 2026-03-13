class ServiceDetailsController < ApplicationController

  before_action :authorize_global
  accept_api_auth :remove_service_detail, :update_service_detail_master

  def remove_service_detail
    @service_detail =  ServiceDetail.find(params[:id])
    @project  = Project.find(@service_detail.project_id)
    if @service_detail.removable? || User.current.admin?
      @service_detail.update_attribute(:project_id, nil)
      @project.detach_ptoject_from_services_on_erp(@service_detail)
      update_service_count if respond_to?(:update_service_count)
      respond_to do |format|
        format.html { redirect_to :controller => :projects, :action => :settings, :tab => "assigned_service", :id => @project }
        format.api { render_api_ok }
      end
    else
      respond_to do |format|
        format.html do
          flash[:error] = l(:notice_master_service_removal)
          redirect_to :controller => :projects, :action => :settings, :tab => "assigned_service", :id => @project
        end
        format.api { render_api_errors l(:notice_master_service_removal) }
      end
    end
  end

  def update_service_detail_master
    @project = Project.find(params[:project_id])
    master_service_detail = @project.service_details.where(is_master: true).first
    master_service_detail.update_attribute(:is_master, false) if master_service_detail.present?
    current_service_detail  = ServiceDetail.find(params[:current_service_detail_id])
    current_service_detail.update_attribute(:is_master, true)
    @project.update_column(:status, Project::STATUS_ACTIVE) unless @project.active?
    respond_to do |format|
      format.html { redirect_to :controller => :projects, :action => :settings, :tab => "assigned_service", :id => @project }
      format.api { render_api_ok }
    end
  end

end
