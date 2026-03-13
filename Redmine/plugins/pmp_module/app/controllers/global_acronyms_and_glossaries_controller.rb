class GlobalAcronymsAndGlossariesController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_global_acronyms_and_glossary, only: [:edit, :update, :destroy]

  def new
    @global_acronyms_and_glossary = GlobalAcronymsAndGlossary.new
  end

  def create
    @global_acronyms_and_glossary = GlobalAcronymsAndGlossary.new(params[:global_acronyms_and_glossary])
    if @global_acronyms_and_glossary.save
      respond_to do |format|
        flash.now[:notice] = "Global global acronym added successfully"
        format.html { redirect_to global_pmp_profiles_path(tab: "global_acronyms_and_glossary") }
        format.js
      end
    else
      respond_to do |format|
        format.html { render action: 'new' }
        format.js
      end
    end
  end

  def edit; end

  def update
    respond_to do |format|
      if @global_acronyms_and_glossary.update(params[:global_acronyms_and_glossary])
        flash[:notice] = "Global acronym updated successfully"
        format.html { redirect_to global_pmp_profiles_path(tab: "global_acronyms_and_glossary") }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def destroy
    @global_acronyms_and_glossary.destroy
    flash[:notice] = "Global global acronym deleted successfully"
    redirect_to global_pmp_profiles_path(tab: "global_acronyms_and_glossary")
  end

  private

  def find_global_acronyms_and_glossary
    @global_acronyms_and_glossary = GlobalAcronymsAndGlossary.find(params[:id])
  end
end
