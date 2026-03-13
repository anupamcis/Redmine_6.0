class StandardAndGuidlinesController < ApplicationController

  before_action :authorize_global
  before_action :find_standard_and_guidline, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @standard_and_guidline = StandardAndGuidline.new
  end

  def create
    @standard_and_guidline = StandardAndGuidline.new(params[:standard_and_guidline])
    if @standard_and_guidline.save
      respond_to do |format|
        flash[:notice] = l(:standard_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "standards_and_guidelines")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'standards_and_guidelines')}'"}
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
    if @standard_and_guidline.update_attributes(params[:standard_and_guidline])
      respond_to do |format|
        flash[:notice] = l(:standard_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "standards_and_guidelines")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'standards_and_guidelines')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @standard_and_guidline.destroy
    flash[:notice] = l(:standard_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "standards_and_guidelines")
  end

  private

  def find_standard_and_guidline
    @standard_and_guidline = StandardAndGuidline.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
