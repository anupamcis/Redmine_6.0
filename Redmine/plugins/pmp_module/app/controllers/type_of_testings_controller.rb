class TypeOfTestingsController < ApplicationController

  before_action :authorize_global, except: [:add_more_new, :add_more]
  before_action :find_type_of_testing, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @type_of_testing = TypeOfTesting.new
    project_values = @project.type_of_testings
    @global_testings = project_values.present? ? GlobalTypeOfTesting.where.not(id: project_values.map(&:global_type_of_testing_id)) : GlobalTypeOfTesting.all
  end

  def add_more_new
    @type_of_testing = TypeOfTesting.new
  end

  def add_more
    @type_of_testing = TypeOfTesting.new(params[:type_of_testing])
    if @type_of_testing.save
      respond_to do |format|
        flash[:notice] = l(:type_of_testing_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "verification")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'verification')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'add_more_new' }
        format.js
      end
    end
  end

  def create
    begin 
    gtestings = GlobalTypeOfTesting.where(id: params[:global_testing])
    gtestings.each do |gtest|
      t_testing = @project.type_of_testings.find_or_create_by(global_type_of_testing_id: gtest.id)
      t_testing.update_attributes(type_of_testing: gtest.type_of_testing_name, testing_method: strip_html(gtest.testing_method))
    end
    respond_to do |format|
      flash[:notice] = l(:type_of_testing_add_success)
      format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "verification")) }
      format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'verification')}'"}
    end
    rescue => e
       respond_to do |format|
        format.html { render :action => 'new' }
        format.js
      end
    end
  end

  def edit
  end

  def update
    if @type_of_testing.update_attributes(params[:type_of_testing])
      respond_to do |format|
        flash[:notice] = l(:type_of_testing_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "verification")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'verification')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @type_of_testing.destroy
    flash[:notice] = l(:type_of_testing_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "verification")
  end

  private

  def find_type_of_testing
    @type_of_testing = TypeOfTesting.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

  def strip_html(html_string)
    ActionView::Base.full_sanitizer.sanitize(html_string)
  end
end
