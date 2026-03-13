class AcronymsAndGlossariesController < ApplicationController
  include ApplicationHelper
  include ERB::Util

  before_action :authorize_global, except: [:autocomplete_for_acronym]
  before_action :find_acronyms_and_glossary, :only => [:edit, :update, :destroy]
  before_action :find_project, except: [:autocomplete_for_acronym]

  def new
    @acronyms_and_glossary = AcronymsAndGlossary.new
  end

  def create
    @acronyms_and_glossary = AcronymsAndGlossary.new(params[:acronyms_and_glossary])
    if @acronyms_and_glossary.save
      GlobalAcronymsAndGlossary.find_or_create_by(abbreviation: params[:acronyms_and_glossary][:abbreviation],
                        full_form: params[:acronyms_and_glossary][:full_form])
      respond_to do |format|
        flash[:notice] = l(:acronyms_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "acronyms_and_glossaries")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'acronyms_and_glossary')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'index' }
        format.js
      end
    end
  end

  def edit
  end

  def update
    if @acronyms_and_glossary.update_attributes(params[:acronyms_and_glossary])
      GlobalAcronymsAndGlossary.find_or_create_by(abbreviation: params[:acronyms_and_glossary][:abbreviation],
                        full_form: params[:acronyms_and_glossary][:full_form])
      # respond_to do |format|
        # format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "acronyms_and_glossaries")) }
        # format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'acronyms_and_glossaries')}'"}
      # end
       render status: 200, json: {msg: l(:acronyms_update_success)}
    else
      # respond_to do |format|
      #   format.html { render :action => 'edit' }
      #   format.js
      # end
      render status: 400, json: {msg: error_messages_for(@acronyms_and_glossary)}
    end
  end

  def destroy
    @acronyms_and_glossary.destroy
    flash[:notice] = l(:acronyms_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "acronyms_and_glossary")
  end

  def autocomplete_for_acronym
   @global_acronyms_and_glossaries = []
   @global_acronyms_and_glossaries += GlobalAcronymsAndGlossary.where("lower(abbreviation) LIKE LOWER(?) ", "%#{params[:term]}%" ).to_a
   @global_acronyms_and_glossaries.compact!
   render :layout => false
  end

  private

  def find_acronyms_and_glossary
    @acronyms_and_glossary = AcronymsAndGlossary.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

end
