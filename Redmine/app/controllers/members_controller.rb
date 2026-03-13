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

class MembersController < ApplicationController
  model_object Member
  before_action :find_model_object, :except => [:index, :new, :create, :autocomplete, :autocomplete2]
  before_action :find_project_from_association, :except => [:index, :new, :create, :autocomplete, :autocomplete2]
  before_action :find_project_by_project_id, :only => [:index, :new, :create, :autocomplete, :autocomplete2]
  before_action :authorize, :except => [:autocomplete2]
  accept_api_auth :index, :show, :create, :update, :destroy, :autocomplete, :autocomplete2

  require_sudo_mode :create, :update, :destroy

  def index
    scope = @project.memberships
    @offset, @limit = api_offset_and_limit
    @member_count = scope.count
    @member_pages = Paginator.new @member_count, @limit, params['page']
    @offset ||= @member_pages.offset
    @members = scope.includes(:principal, :roles).order(:id).limit(@limit).offset(@offset).to_a

    respond_to do |format|
      format.html {head :not_acceptable}
      format.api
    end
  end

  def show
    respond_to do |format|
      format.html {head :not_acceptable}
      format.api
    end
  end

  def new
    @member = Member.new
  end

  def create
    members = []
    if params[:membership]
      user_ids = Array.wrap(params[:membership][:user_id] || params[:membership][:user_ids])
      user_ids << nil if user_ids.empty?
      user_ids.each do |user_id|
        member = Member.new(:project => @project, :user_id => user_id)
        member.set_editable_role_ids(params[:membership][:role_ids])
        # Set master_department if provided
        if params[:membership][:master_department_id].present? && member.respond_to?(:master_department_id=)
          member.master_department_id = params[:membership][:master_department_id]
        end
        members << member
      end
      @project.members << members
    end

    respond_to do |format|
      format.html {redirect_to_settings_in_projects}
      format.js do
        @members = members
        @member = Member.new
      end
      format.api do
        @member = members.first
        if @member.valid?
          render :action => 'show', :status => :created, :location => membership_url(@member)
        else
          render_validation_errors(@member)
        end
      end
    end
  end

  def edit
    @roles = Role.givable.to_a
  end

  def update
    if params[:membership]
      @member.set_editable_role_ids(params[:membership][:role_ids])
      # Set master_department if provided
      if params[:membership][:master_department_id].present? && @member.respond_to?(:master_department_id=)
        @member.master_department_id = params[:membership][:master_department_id]
      elsif params[:membership][:master_department_id].blank? && @member.respond_to?(:master_department_id=)
        # Allow clearing the master_department by sending empty value
        @member.master_department_id = nil
      end
    end
    saved = @member.save
    respond_to do |format|
      format.html {redirect_to_settings_in_projects}
      format.js
      format.api do
        if saved
          render_api_ok
        else
          render_validation_errors(@member)
        end
      end
    end
  end

  def destroy
    if @member.deletable?
      @member.destroy
    end
    respond_to do |format|
      format.html {redirect_to_settings_in_projects}
      format.js
      format.api do
        if @member.destroyed?
          render_api_ok
        else
          head :unprocessable_content
        end
      end
    end
  end

  def autocomplete
    q = params[:q].to_s.strip
    return render json: { users: [], clients: [] } if q.blank?
    
    q_down = "%#{q.downcase}%"
    
    # Get users (default_company = true)
    users_scope = User.active.visible.sorted
    if User.reflect_on_association(:company)
      users_scope = users_scope.joins(:company)
                                .where(companies: { default_company: true })
                                .joins("LEFT JOIN email_addresses ON email_addresses.user_id = users.id")
                                .where("LOWER(companies.name) LIKE :q OR LOWER(users.firstname) LIKE :q OR LOWER(users.lastname) LIKE :q OR LOWER(email_addresses.address) LIKE :q OR LOWER(CONCAT(users.firstname, ' ', users.lastname)) LIKE :q", q: q_down)
    else
      users_scope = users_scope.joins("LEFT JOIN companies ON companies.id = users.company_id")
                                .where("companies.default_company = ?", true)
                                .joins("LEFT JOIN email_addresses ON email_addresses.user_id = users.id")
                                .where("LOWER(companies.name) LIKE ? OR LOWER(users.firstname) LIKE ? OR LOWER(users.lastname) LIKE ? OR LOWER(email_addresses.address) LIKE ? OR LOWER(CONCAT(users.firstname, ' ', users.lastname)) LIKE ?", q_down, q_down, q_down, q_down, q_down)
    end
    users = users_scope.limit(100).to_a
    
    # Get clients (default_company = false)
    clients_scope = User.active.visible.sorted
                         .joins("LEFT JOIN companies ON companies.id = users.company_id")
                         .joins("LEFT JOIN email_addresses ON email_addresses.user_id = users.id")
                         .where("companies.default_company = ?", false)
                         .where("LOWER(users.firstname) LIKE ? OR LOWER(users.lastname) LIKE ? OR LOWER(email_addresses.address) LIKE ? OR LOWER(CONCAT(users.firstname, ' ', users.lastname)) LIKE ? OR LOWER(companies.name) LIKE ?", q_down, q_down, q_down, q_down, q_down)
                         .includes(:company)
    clients = clients_scope.limit(100).to_a
    
    respond_to do |format|
      format.js
      format.json do
        render json: {
          users: users.map { |u| { id: u.id, name: u.name, login: u.login, email: u.mail } },
          clients: clients.map do |u|
            company_name = nil
            if u.respond_to?(:company) && u.company.present?
              company_name = u.company.name
            end
            { id: u.id, name: u.name, login: u.login, email: u.mail, company_name: company_name }
          end
        }
      end
    end
  end

  def autocomplete2
    @users = User.active.like(params[:q]).limit(100).to_a
    respond_to do |format|
      format.js
      format.json { render json: @users.map { |u| { id: u.id, name: u.name, login: u.login } } }
    end
  end

  private

  def redirect_to_settings_in_projects
    redirect_to settings_project_path(@project, :tab => 'members')
  end
end
