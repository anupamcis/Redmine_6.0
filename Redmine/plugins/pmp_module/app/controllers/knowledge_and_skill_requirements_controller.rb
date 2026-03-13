class KnowledgeAndSkillRequirementsController < ApplicationController

  before_action :authorize_global
  before_action :find_knowledge_and_skill_requirement, :only => [:edit, :update, :destroy]
  before_action :find_project


  def new
    @knowledge_and_skill_requirement = KnowledgeAndSkillRequirement.new
  end

  def create
    @knowledge_and_skill_requirement = KnowledgeAndSkillRequirement.new(params[:knowledge_and_skill_requirement])
    if @knowledge_and_skill_requirement.save
      @knowledge_and_skill_requirement.add_risk
      respond_to do |format|
        flash[:notice] = l(:knowledge_and_skill_requirement_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "training")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'training')}'"}
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
    if @knowledge_and_skill_requirement.update_attributes(params[:knowledge_and_skill_requirement])
      respond_to do |format|
        flash[:notice] = l(:knowledge_and_skill_requirement_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "training")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'training')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @knowledge_and_skill_requirement.destroy
    flash[:notice] = l(:knowledge_and_skill_requirement_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "training")
  end

  private

  def find_knowledge_and_skill_requirement
    @knowledge_and_skill_requirement = KnowledgeAndSkillRequirement.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

end
