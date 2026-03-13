class RisksController < ApplicationController

  before_action :authorize_global
  before_action :find_risk, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @risk = Risk.new
  end

  def create
    @risk = Risk.new(params[:risk])
    if @risk.save
      @risk.send_mail
      respond_to do |format|
        flash[:notice] = l(:risk_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "risk")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'risk')}'"}
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
    if @risk.update_attributes(params[:risk])
      respond_to do |format|
        flash[:notice] = l(:risk_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "risk")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'risk')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @risk.destroy
    flash[:notice] = l(:risk_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "risk")
  end

  private

  def find_risk
    @risk = Risk.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

end
