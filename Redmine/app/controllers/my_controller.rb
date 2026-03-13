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

class MyController < ApplicationController
  self.main_menu = false
  before_action :require_login
  # let user change user's password when user has to
  skip_before_action :check_password_change, :check_twofa_activation, :only => :password

  accept_api_auth :account

  require_sudo_mode :account, only: :put
  require_sudo_mode :reset_atom_key, :reset_api_key, :show_api_key, :destroy

  helper :issues
  helper :users
  helper :custom_fields
  helper :queries
  helper :activities

  def index
    page
    render :action => 'page'
  end

  # Show user's page
  def page
    @user = User.current
    @groups = @user.pref.my_page_groups
    @blocks = @user.pref.my_page_layout
  end

  # Edit user's account
  def account
    @user = User.current
    @pref = @user.pref
    if request.put?
      # Extract custom field values and gitlab_token from params before safe_attributes assignment
      # The plugin adds gitlab_token to safe_attributes, but we'll handle it explicitly to ensure it's saved
      custom_field_values_params = params[:user] && params[:user][:custom_field_values] ? params[:user][:custom_field_values].dup : {}
      gitlab_token_param = params[:user] && params[:user][:gitlab_token] ? params[:user][:gitlab_token] : nil
      
      # Debug: Log params to see what's being passed
      Rails.logger.debug "=== MyController#account params[:user] ==="
      Rails.logger.debug params[:user].inspect
      Rails.logger.debug "=== gitlab_token in params ==="
      Rails.logger.debug gitlab_token_param.inspect
      Rails.logger.debug "=== Custom field values in params ==="
      Rails.logger.debug custom_field_values_params.inspect
      
      # Assign safe attributes (this should include gitlab_token from the plugin's safe_attributes)
      @user.safe_attributes = params[:user]
      @user.pref.safe_attributes = params[:pref]
      
      # Explicitly set gitlab_token if it was provided in params
      # This ensures it's updated even if safe_attributes didn't handle it properly
      # Check if gitlab_token key exists in params (even if value is empty string)
      if params[:user] && params[:user].key?(:gitlab_token)
        Rails.logger.debug "=== Explicitly setting gitlab_token ==="
        Rails.logger.debug "Before: #{@user.gitlab_token.inspect}"
        Rails.logger.debug "New value from params: #{gitlab_token_param.inspect}"
        @user.gitlab_token = gitlab_token_param
        Rails.logger.debug "After: #{@user.gitlab_token.inspect}"
      end
      
      # Debug: Log gitlab_token after assignment
      Rails.logger.debug "=== gitlab_token after explicit assignment ==="
      Rails.logger.debug "gitlab_token: #{@user.gitlab_token.inspect}"
      
      # Manually assign custom field values AFTER safe_attributes
      # This ensures they're not filtered out
      if custom_field_values_params.present? && @user.respond_to?(:custom_field_values=)
        Rails.logger.debug "=== Manually assigning custom field values ==="
        @user.custom_field_values = custom_field_values_params
      end
      
      # Save user and preferences in a transaction
      User.transaction do
        if @user.save
          # Debug: Log after save
          Rails.logger.debug "=== After @user.save ==="
          Rails.logger.debug "User saved: #{@user.errors.empty?}"
          Rails.logger.debug "gitlab_token after save: #{@user.gitlab_token.inspect}"
          Rails.logger.debug "User errors: #{@user.errors.full_messages.inspect}" unless @user.errors.empty?
          
          # Custom field values are saved via after_save callback (save_custom_field_values)
          # Explicitly call it to ensure they're persisted
          if @user.respond_to?(:save_custom_field_values)
            result = @user.save_custom_field_values
            Rails.logger.debug "=== After save_custom_field_values ==="
            Rails.logger.debug "Result: #{result.inspect}"
          end
          
          @user.pref.save
          
          # Reload to verify gitlab_token was saved
          @user.reload
          Rails.logger.debug "=== gitlab_token after reload ==="
          Rails.logger.debug "gitlab_token: #{@user.gitlab_token.inspect}"
          
          respond_to do |format|
            format.html do
              flash[:notice] = l(:notice_account_updated)
              redirect_to my_account_path
            end
            format.api  {render_api_ok}
          end
          return
        else
          Rails.logger.debug "=== User save failed ==="
          Rails.logger.debug "Errors: #{@user.errors.full_messages.inspect}"
          respond_to do |format|
            format.html {render :action => :account}
            format.api  {render_validation_errors(@user)}
          end
        end
      end
    end
  end

  # Destroys user's account
  def destroy
    @user = User.current
    unless @user.own_account_deletable?
      redirect_to my_account_path
      return
    end

    if request.post? && params[:confirm]
      @user.destroy
      if @user.destroyed?
        logout_user
        flash[:notice] = l(:notice_account_deleted)
      end
      redirect_to home_path
    end
  end

  # Manage user's password
  def password
    @user = User.current
    unless @user.change_password_allowed?
      flash[:error] = l(:notice_can_t_change_password)
      redirect_to my_account_path
      return
    end
    if request.post?
      if !@user.check_password?(params[:password])
        flash.now[:error] = l(:notice_account_wrong_password)
      elsif params[:password] == params[:new_password]
        flash.now[:error] = l(:notice_new_password_must_be_different)
      else
        @user.password, @user.password_confirmation = params[:new_password], params[:new_password_confirmation]
        @user.must_change_passwd = false
        if @user.save
          # The session token was destroyed by the password change, generate a new one
          session[:tk] = @user.generate_session_token
          Mailer.deliver_password_updated(@user, User.current)
          flash[:notice] = l(:notice_account_password_updated)
          redirect_to my_account_path
        end
      end
    end
    no_store
  end

  # Create a new feeds key
  def reset_atom_key
    if request.post?
      if User.current.atom_token
        User.current.atom_token.destroy
        User.current.reload
      end
      User.current.atom_key
      flash[:notice] = l(:notice_feeds_access_key_reseted)
    end
    redirect_to my_account_path
  end

  def show_api_key
    @user = User.current
  end

  # Create a new API key
  def reset_api_key
    if request.post?
      if User.current.api_token
        User.current.api_token.destroy
        User.current.reload
      end
      User.current.api_key
      flash[:notice] = l(:notice_api_access_key_reseted)
    end
    redirect_to my_account_path
  end

  def update_page
    @user = User.current
    block_settings = params[:settings] || {}

    block_settings.each do |block, settings|
      @user.pref.update_block_settings(block, settings.to_unsafe_hash)
    end
    @user.pref.save
    @updated_blocks = block_settings.keys
  end

  # Add a block to user's page
  # The block is added on top of the page
  # params[:block] : id of the block to add
  def add_block
    @user = User.current
    @block = params[:block]
    if @user.pref.add_block @block
      @user.pref.save
      respond_to do |format|
        format.html {redirect_to my_page_path}
        format.js
      end
    else
      render_error :status => 422
    end
  end

  # Remove a block to user's page
  # params[:block] : id of the block to remove
  def remove_block
    @user = User.current
    @block = params[:block]
    @user.pref.remove_block @block
    @user.pref.save
    respond_to do |format|
      format.html {redirect_to my_page_path}
      format.js
    end
  end

  # Change blocks order on user's page
  # params[:group] : group to order (top, left or right)
  # params[:blocks] : array of block ids of the group
  def order_blocks
    @user = User.current
    @user.pref.order_blocks params[:group], params[:blocks]
    @user.pref.save
    head :ok
  end
end
