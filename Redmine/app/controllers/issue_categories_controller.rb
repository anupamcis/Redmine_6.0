# frozen_string_literal: true

# Redmine - project management software
# Copyright (C) 2006-  Jean-Philippe Lang
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

class IssueCategoriesController < ApplicationController
  menu_item :settings
  model_object IssueCategory
  before_action :find_model_object, :except => [:index, :new, :create]
  before_action :find_project_from_association, :except => [:index, :new, :create]
  before_action :find_project_by_project_id, :only => [:index, :new, :create]
  before_action :authorize
  accept_api_auth :index, :show, :create, :update, :destroy

  def index
    respond_to do |format|
      format.html {redirect_to_settings_in_projects}
      format.api do
        @categories = @project.issue_categories.includes(:assigned_to).order(:name).to_a
        # Return categories with assigned_to_name for API
        render json: @categories.map { |category|
          {
            id: category.id,
            name: category.name,
            assigned_to_id: category.assigned_to_id,
            assigned_to_name: category.assigned_to&.name
          }
        }
      end
    end
  end

  def show
    respond_to do |format|
      format.html {redirect_to_settings_in_projects}
      format.api
    end
  end

  def new
    @category = @project.issue_categories.build
    @category.safe_attributes = params[:issue_category]

    respond_to do |format|
      format.html
      format.js
    end
  end

  def create
    @category = @project.issue_categories.build
    category_params = params[:issue_category] || {}
    # Convert empty string to nil for assigned_to_id
    if category_params[:assigned_to_id].present? && category_params[:assigned_to_id].to_s.strip == ''
      category_params[:assigned_to_id] = nil
    end
    @category.safe_attributes = category_params
    if @category.save
      respond_to do |format|
        format.html do
          flash[:notice] = l(:notice_successful_create)
          redirect_to_settings_in_projects
        end
        format.js
        format.api do
          render(:action => 'show', :status => :created,
                 :location => issue_category_path(@category))
        end
      end
    else
      respond_to do |format|
        format.html {render :action => 'new'}
        format.js   {render :action => 'new'}
        format.api  {render_validation_errors(@category)}
      end
    end
  end

  def edit
  end

  def update
    category_params = params[:issue_category] || {}
    # Convert empty string to nil for assigned_to_id
    if category_params[:assigned_to_id].present? && category_params[:assigned_to_id].to_s.strip == ''
      category_params[:assigned_to_id] = nil
    end
    @category.safe_attributes = category_params
    if @category.save
      respond_to do |format|
        format.html do
          flash[:notice] = l(:notice_successful_update)
          redirect_to_settings_in_projects
        end
        format.api {render_api_ok}
      end
    else
      respond_to do |format|
        format.html {render :action => 'edit'}
        format.api {render_validation_errors(@category)}
      end
    end
  end

  def destroy
    @issue_count = @category.issues.size
    if @issue_count == 0 || params[:todo] || api_request?
      reassign_to = nil
      if params[:reassign_to_id] && (params[:todo] == 'reassign' || params[:todo].blank?)
        reassign_to = @project.issue_categories.find_by_id(params[:reassign_to_id])
      end
      @category.destroy(reassign_to)
      respond_to do |format|
        format.html {redirect_to_settings_in_projects}
        format.api {render_api_ok}
      end
      return
    end
    @categories = @project.issue_categories - [@category]
  end

  private

  def redirect_to_settings_in_projects
    redirect_to settings_project_path(@project, :tab => 'categories')
  end

  # Wrap ApplicationController's find_model_object method to set
  # @category instead of just @issue_category
  def find_model_object
    super
    @category = @object
  end
end
