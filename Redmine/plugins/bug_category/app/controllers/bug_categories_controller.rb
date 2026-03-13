class BugCategoriesController < ApplicationController
  layout 'admin'
  before_action :require_admin
  before_action :find_bug_category, only: [:edit, :update, :destroy]

  def index
    @bug_categories = BugCategory.all
  end

  def new
    @bug_category = BugCategory.new
  end

  def create
    params[:bug_category][:position] = BugCategory.count+1
    @bug_category = BugCategory.new(params[:bug_category])
    if @bug_category.save
      respond_to do |format|
        flash[:notice] = l(:create_success_message)
        format.html { redirect_back_or_default(bug_categories_path) }
        format.js
      end
    else
      respond_to do |format|
        format.html { render action: 'new' }
        format.js
      end
    end
  end

  def update
     respond_to do |format|
      if @bug_category.update(params[:bug_category])
        flash[:notice] = l(:update_message)
        format.html { redirect_back_or_default(bug_categories_path) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def destroy
    @bug_category.destroy
    flash[:notice] = l(:delete_message)
    redirect_back_or_default(bug_categories_path)
  end

  private

  def find_bug_category
    @bug_category = BugCategory.find(params[:id])
  end

end
