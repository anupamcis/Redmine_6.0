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

class UsersController < ApplicationController
  menu_item :manage_users
  layout 'admin'
  self.main_menu = false

  before_action :require_admin, :except => [:show, :new]
  before_action :check_new_action_permission, :only => :new
  before_action lambda {find_user(false)}, :only => :show
  before_action :find_user, :only => [:edit, :update, :destroy]
  accept_api_auth :index, :show, :create, :update, :destroy, :new

  helper :sort
  include SortHelper
  helper :custom_fields
  include CustomFieldsHelper
  include UsersHelper
  helper :principal_memberships
  helper :activities
  include ActivitiesHelper
  helper :queries
  include QueriesHelper
  helper :user_queries
  include UserQueriesHelper

  require_sudo_mode :create, :update, :destroy

  def index
    use_session = !request.format.csv?
    retrieve_query(UserQuery, use_session)

    # API backwards compatibility: handle legacy filter parameters
    unless request.format.html?
      if name = params[:name].presence
        @query.add_filter 'name', '~', [name]
      end
      if group_id = params[:group_id].presence
        @query.add_filter 'is_member_of_group', '=', [group_id]
      end
    end

    if @query.valid?
      scope = @query.results_scope

      @user_count = scope.count

      respond_to do |format|
        format.html do
          @limit = per_page_option
          @user_pages = Paginator.new @user_count, @limit, params['page']
          @offset ||= @user_pages.offset
          @users = scope.limit(@limit).offset(@offset).to_a
          render :layout => !request.xhr?
        end
        format.csv do
          # Export all entries
          entries = scope.to_a
          send_data(query_to_csv(entries, @query, params), :type => 'text/csv; header=present', :filename => "#{filename_for_export(@query, 'users')}.csv")
        end
        format.api do
          @offset, @limit = api_offset_and_limit
          @users = scope.limit(@limit).offset(@offset).to_a
        end
      end
    else
      respond_to do |format|
        format.html {render :layout => !request.xhr?}
        format.csv {head :unprocessable_content}
        format.api {render_validation_errors(@query)}
      end
    end
  end

  def show
    logger.info("DEBUG: @user is #{@user.inspect}")
    logger.info("DEBUG: User.current is #{User.current.inspect}")
    unless @user.visible?
      render_404
      return
    end

    # show projects based on current user visibility
    @memberships = @user.memberships.preload(:roles, :project).where(Project.visible_condition(User.current)).to_a

    @issue_counts = {}
    @issue_counts[:assigned] = {
      :total  => Issue.visible.assigned_to(@user).count,
      :open   => Issue.visible.open.assigned_to(@user).count
    }
    @issue_counts[:reported] = {
      :total  => Issue.visible.where(:author_id => @user.id).count,
      :open   => Issue.visible.open.where(:author_id => @user.id).count
    }

    respond_to do |format|
      format.html do
        events = Redmine::Activity::Fetcher.new(User.current, :author => @user).events(nil, nil, :limit => 10)
        @events_by_day = events.group_by {|event| User.current.time_to_date(event.event_datetime)}
        render :layout => 'base'
      end
      format.api
    end
  end

  # Allow JSON API requests to access languages/timezones without admin
  def check_new_action_permission
    if request.format.json? && api_request?
      # Allow any authenticated user for JSON API
      return
    end
    # Require admin for HTML requests
    require_admin
  end

  def new
    @user = User.new(:language => Setting.default_language,
                     :mail_notification => Setting.default_notification_option)
    @user.safe_attributes = params[:user]
    @auth_sources = AuthSource.all

    respond_to do |format|
      format.html { no_store }
      format.json do
        # Get available languages using Redmine's helper
        # languages_options returns [name, code] arrays (same format as shown in user form)
        languages = view_context.languages_options.map do |option|
          locale_name, locale_code = option
          {
            value: locale_code.to_s,
            label: locale_name.to_s
          }
        end
        
        # Get available time zones
        time_zones = ActiveSupport::TimeZone.all.map do |tz|
          {
            value: tz.name,
            label: tz.to_s
          }
        end
        
        render json: {
          languages: languages,
          time_zones: time_zones
        }
      end
    end
  end

  def create
    @user = User.new(:language => Setting.default_language,
                     :mail_notification => Setting.default_notification_option,
                     :admin => false)
    @user.safe_attributes = params[:user]
    unless @user.auth_source_id
      @user.password              = params[:user][:password]
      @user.password_confirmation = params[:user][:password_confirmation]
    end
    @user.pref.safe_attributes = params[:pref]

    if @user.save
      Mailer.deliver_account_information(@user, @user.password) if params[:send_information]

      respond_to do |format|
        format.html do
          flash[:notice] =
            l(:notice_user_successful_create,
              :id => view_context.link_to(@user.login, user_path(@user)))
          if params[:continue]
            attrs = {:generate_password => @user.generate_password}
            redirect_to new_user_path(:user => attrs)
          else
            redirect_to edit_user_path(@user)
          end
        end
        format.api {render :action => 'show', :status => :created, :location => user_url(@user)}
      end
    else
      @auth_sources = AuthSource.all
      # Clear password input
      @user.password = @user.password_confirmation = nil

      respond_to do |format|
        format.html do
          no_store
          render :action => 'new'
        end

        format.api do
          render_validation_errors(@user)
        end
      end
    end
  end

  def edit
    @auth_sources = AuthSource.all
    @membership ||= Member.new
    params[:user] = {company_id: @user.company_id}
  end

  def update
    is_updating_password = params[:user][:password].present? && (@user.auth_source_id.nil? || params[:user][:auth_source_id].blank?)
    if is_updating_password
      @user.password, @user.password_confirmation = params[:user][:password], params[:user][:password_confirmation]
    end
    @user.safe_attributes = params[:user]
    if params[:user][:company_id].present? && User.current.admin?
      @user.company_id = params[:user][:company_id]
    end
    # Was the account actived ? (do it before User#save clears the change)
    was_activated = (@user.status_change == [User::STATUS_REGISTERED, User::STATUS_ACTIVE])
    # TODO: Similar to My#account
    @user.pref.safe_attributes = params[:pref]

    if @user.save
      @user.pref.save

      Mailer.deliver_password_updated(@user, User.current) if is_updating_password
      if was_activated
        Mailer.deliver_account_activated(@user)
      elsif @user.active? && params[:send_information] && @user != User.current
        Mailer.deliver_account_information(@user, @user.password)
      end

      respond_to do |format|
        format.html do
          flash[:notice] = l(:notice_successful_update)
          redirect_to_referer_or edit_user_path(@user)
        end
        format.api  {render_api_ok}
      end
    else
      @auth_sources = AuthSource.all
      @membership ||= Member.new
      # Clear password input
      @user.password = @user.password_confirmation = nil

      respond_to do |format|
        format.html do
          no_store
          render :action => :edit
        end
        format.api do
          render_validation_errors(@user)
        end
      end
    end
  end

  def destroy
    return render_error status: 422 if @user == User.current && !@user.own_account_deletable?

    if api_request? || params[:lock] || params[:confirm] == @user.login
      if params[:lock]
        @user.update_attribute :status, User::STATUS_LOCKED
        flash[:notice] = l(:notice_successful_update)
      else
        @user.destroy
        flash[:notice] = l(:notice_successful_delete)
      end
      respond_to do |format|
        format.html {redirect_back_or_default(users_path)}
        format.api  {render_api_ok}
      end
    end
  end

  def bulk_destroy
    @users = User.logged.where(id: params[:ids]).where.not(id: User.current)
    (render_404; return) unless @users.any?

    if params[:confirm] == I18n.t(:general_text_Yes)
      @users.destroy_all
      flash[:notice] = l(:notice_successful_delete)
      redirect_to users_path
    end
  end

  def bulk_lock
    bulk_update_status(params[:ids], User::STATUS_LOCKED)
  end

  def bulk_unlock
    bulk_update_status(params[:ids], User::STATUS_ACTIVE)
  end

  private

  def find_user(logged = true)
    logger.info("DEBUG find_user: params[:id] = #{params[:id]}, logged = #{logged}")
    if params[:id] == 'current'
      logger.info("DEBUG find_user: Calling require_login")
      if require_login
        @user = User.current
        logger.info("DEBUG find_user: Set @user to User.current: #{@user.inspect}")
      else
        logger.info("DEBUG find_user: require_login returned false")
      end
      return
    elsif logged
      @user = User.logged.find(params[:id])
    else
      @user = User.find(params[:id])
    end
    logger.info("DEBUG find_user: Final @user = #{@user.inspect}")
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def bulk_update_status(user_ids, status)
    users = User.logged.where(id: user_ids).where.not(id: User.current)
    (render_404; return) unless users.any?

    users.update_all status: status
    flash[:notice] = l(:notice_successful_update)
    redirect_to users_path
  end
end
