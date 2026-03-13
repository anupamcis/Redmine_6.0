class GlobalTypeOfTestingsController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_global_type_of_testing, only: [:edit, :update, :destroy]

  def new
    @global_type_of_testing = GlobalTypeOfTesting.new
  end

  def create
    @global_type_of_testing = GlobalTypeOfTesting.new(params[:global_type_of_testing])
    if @global_type_of_testing.save
      respond_to do |format|
        flash.now[:notice] = "Type of testing global profile added successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_type_of_testing")) }
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
      if @global_type_of_testing.update(params[:global_type_of_testing])
        flash.now[:notice] = "Type of testing global profile updated successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_type_of_testing")) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def destroy
    @global_type_of_testing.destroy
    flash[:notice] = "Type of testing global profile deleted successfully"
    redirect_to global_pmp_profiles_path(tab: "global_type_of_testing")
  end

  private
  
  def find_global_type_of_testing
    @global_type_of_testing = GlobalTypeOfTesting.find(params[:id])  
  end
end
