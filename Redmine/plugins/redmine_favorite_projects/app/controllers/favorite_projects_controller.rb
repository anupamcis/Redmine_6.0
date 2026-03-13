class FavoriteProjectsController < ApplicationController
  # unloadable removed for Rails 7 compatibility
  include FavoriteProjectsHelper
  helper :projects
  helper :custom_fields
  helper :queries

  before_action :deny_for_unauthorized, :only => [:favorite, :unfavorite, :favorite_css]
  before_action :find_project_by_project_id, :except => :search
  accept_api_auth :search

  def search
    retrieve_projects_query
    
    @limit = 25

    if @query.valid?

      case params[:format]
      when 'csv', 'pdf'
        @limit = Setting.issues_export_limit.to_i
      when 'atom'
        @limit = Setting.feeds_limit.to_i
      when 'xml', 'json'
        @offset, @limit = api_offset_and_limit
      else
        @limit = per_page_option
      end

      order_by = if params[:order_projects].present?
        params[:order_projects] == "order_by_date" ? {:created_on => :desc} : {:name => :asc}
      else
        {:created_on => :desc}
      end
      
      @projects = @query.results_scope(
        :include => [:avatar],
        :search => params[:search]
        ).where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).visible.reorder(order_by)

      @project_count = @projects.count

      @project_pages = Redmine::Pagination::Paginator.new(@project_count, @limit, params[:page])
      @offset ||= @project_pages.offset
      
      if Project.reflect_on_association(:tags)
        @projects = @projects.includes(:tags)
      end
      @projects = @projects.limit(@limit).offset(@offset)
      @recent_projects = Project.where(id: session[:recent_projects]).where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).visible.reorder(order_by).first(5)
      # @projects = @projects - @recent_projects
      
      respond_to do |format|
        if request.xhr?
          list_style = respond_to?(:favorite_project_list_style) ? favorite_project_list_style : (RedmineFavoriteProjects.default_list_style rescue 'list')
          format.html { render :partial => "projects/#{list_style}", :layout => false }
        else
          @tags = Project.respond_to?(:available_tags) ? Project.available_tags : []
          @tags ||= [] # Ensure @tags is never nil
          format.html { render :template => "projects/index" }
        end
        format.js { render :partial => "search" }

        format.api  {
          @offset, @limit = api_offset_and_limit
          @project_count = @project_count
          @projects = @projects.to_a
          render :template => "projects/index", :type => 'api'
        }
        format.atom {
          projects = @projects.reorder(:created_on => :desc).limit(Setting.feeds_limit.to_i).to_a
          render_feed(projects, :title => "#{Setting.app_title}: #{l(:label_project_latest)}")
        }
      end
    else #not valid query
      @projects = [] # Ensure @projects is always set
      respond_to do |format|
        format.html do
          @tags = Project.respond_to?(:available_tags) ? Project.available_tags : []
          @tags ||= [] # Ensure @tags is never nil
          render(:template => 'projects/index', :layout => !request.xhr?)
        end
        format.any(:atom, :csv, :pdf) { render(:nothing => true) }
        format.api { render_validation_errors(@query) }
      end
    end
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def favorite
    if @project.respond_to?(:visible?) && !@project.visible?(User.current)
      render_403
    else
      set_favorite(User.current, true)
    end
  end

  def unfavorite
   set_favorite(User.current, false)
  end

  # Returns the css class used to identify watch links for a given +object+
  def favorite_css(object)
    "#{object.class.to_s.underscore}-#{object.id}-favorite"
  end

  private

  def set_favorite(user, favorite)
    if favorite
      FavoriteProject.create(:project_id => @project.id, :user_id => user.id)
    else
      favorite_project = FavoriteProject.where(:project_id => @project.id, :user_id => user.id).first
      favorite_project.delete if favorite_project.present?
    end

    respond_to do |format|
      format.html { redirect_to :back }
      format.js { render :partial => 'set_favorite' }
    end

  rescue ::ActionController::RedirectBackError
    render :text => (favorite ? 'Favorite added.' : 'Favorite removed.'), :layout => true
  end

  def deny_for_unauthorized
    deny_access unless User.current.logged?
  end
end
