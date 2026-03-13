class LessonsController < ApplicationController

  before_action :authorize_global
  before_action :find_lesson, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @lesson = Lesson.new
  end

  def create
    @lesson = Lesson.new(params[:lesson])
    if @lesson.save
      respond_to do |format|
        flash[:notice] = l(:lesson_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "lessons_learned_and_reusable_artifacts")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'lessons_learned_and_reusable_artifacts')}'"}
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
    if @lesson.update_attributes(params[:lesson])
      respond_to do |format|
        flash[:notice] = l(:lesson_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "lessons_learned_and_reusable_artifacts")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'lessons_learned_and_reusable_artifacts')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @lesson.destroy
    flash[:notice] = l(:lesson_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "lessons_learned_and_reusable_artifacts")
  end

  private

  def find_lesson
    @lesson = Lesson.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
