class GlobalDataRetentionPlansController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_global_data_retention_plan, only: [:edit, :update, :destroy]

  def new
    @global_data_retention_plan = GlobalDataRetentionPlan.new
  end

  def create
    @global_data_retention_plan = GlobalDataRetentionPlan.new(params[:global_data_retention_plan])
    if @global_data_retention_plan.save
      respond_to do |format|
        flash[:notice] = "Global data retention plan added successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_data_retention_plan")) }
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
      if @global_data_retention_plan.update(params[:global_data_retention_plan])
        flash[:notice] = "Global data retention plan updated successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_data_retention_plan")) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def destroy
    @global_data_retention_plan.destroy
    flash[:notice] = "Global data retention plan deleted successfully"
    redirect_to global_pmp_profiles_path(tab: "global_data_retention_plan")
  end

  private

  def find_global_data_retention_plan
    @global_data_retention_plan = GlobalDataRetentionPlan.find(params[:id])
  end
end
