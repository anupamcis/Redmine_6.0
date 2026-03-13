class GlobalBackUpDetailsController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_global_back_up_detail, only: [:edit, :update, :destroy]

  def new
    @global_back_up_detail = GlobalBackUpDetail.new
  end

  def create
    @global_back_up_detail = GlobalBackUpDetail.new(params[:global_back_up_detail])
    if @global_back_up_detail.save
      respond_to do |format|
        flash[:notice] = "Global back up detail added successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_back_up_detail")) }
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
      if @global_back_up_detail.update(params[:global_back_up_detail])
        flash[:notice] = "Global back up detail updated successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_back_up_detail")) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def destroy
    @global_back_up_detail.destroy
    flash[:notice] = "Global back up detail deleted successfully"
    redirect_to global_pmp_profiles_path(tab: "global_back_up_detail")
  end

  private

  def find_global_back_up_detail
    @global_back_up_detail = GlobalBackUpDetail.find(params[:id])
  end

end
