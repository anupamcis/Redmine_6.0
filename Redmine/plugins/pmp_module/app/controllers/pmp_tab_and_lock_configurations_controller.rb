class PmpTabAndLockConfigurationsController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_pmp_tab_and_lock_configuration, only: [:edit, :update, :destroy]
  before_action :set_admin_configuration, only: [:index, :edit_admin_configuration, :update_admin_configuration]

  def index
    @pmp_tab_and_lock_configurations = PmpTabAndLockConfiguration.all.order("position ASC")
  end

  def new
    @pmp_tab_and_lock_configuration = PmpTabAndLockConfiguration.new
  end

  def create
    @pmp_tab_and_lock_configuration = PmpTabAndLockConfiguration.new(params[:pmp_tab_and_lock_configuration])
    if @pmp_tab_and_lock_configuration.save
      respond_to do |format|
        flash.now[:notice] = "Tab added successfully"
        format.html { redirect_back_or_default(pmp_tab_and_lock_configurations_path) }
        format.js
      end
    else
      respond_to do |format|
        format.html { render action: 'new' }
        format.js
      end
    end
  end

  def destroy
    @pmp_tab_and_lock_configuration.destroy
    flash[:notice] = "tab deleted successfully"
    redirect_to pmp_tab_and_lock_configurations_path
  end

  def update
    respond_to do |format|
      if @pmp_tab_and_lock_configuration.update(params[:pmp_tab_and_lock_configuration])
        format.html { redirect_back_or_default(pmp_tab_and_lock_configurations_path) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def edit_admin_configuration
  end

  def update_admin_configuration
    if @pmp_admin_configuration.update_attributes(params[:pmp_admin_configuration])
      respond_to do |format|
        flash[:notice] = l(:pmp_admin_configuration_update_success)
        format.html
        format.js { render js: "window.location='#{pmp_tab_and_lock_configurations_path()}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit_admin_configuration' }
        format.js
      end
    end
  end

  private

  def find_pmp_tab_and_lock_configuration
   @pmp_tab_and_lock_configuration = PmpTabAndLockConfiguration.find(params[:id])
  end

  def set_admin_configuration
    @pmp_admin_configuration = PmpAdminConfiguration.first
  end
end
