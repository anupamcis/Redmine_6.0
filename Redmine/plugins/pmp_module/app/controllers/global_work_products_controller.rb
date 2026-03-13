class GlobalWorkProductsController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_global_work_product, only: [:edit, :update, :destroy]

  def new
    @global_work_product = GlobalWorkProduct.new
  end

  def create
    @global_work_product = GlobalWorkProduct.new(params[:global_work_product])
    if @global_work_product.save
      respond_to do |format|
        flash.now[:notice] = "Global work product added successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_work_product")) }
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
      if @global_work_product.update(params[:global_work_product])
        flash.now[:notice] = "Global work product updated successfully"
        format.html { redirect_back_or_default(global_pmp_profiles_path(tab: "global_work_product")) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  def destroy
    @global_work_product.destroy
    flash[:notice] = "Global work product deleted successfully"
    redirect_to global_pmp_profiles_path(tab: "global_work_product")
  end

  private
  
  def find_global_work_product
    @global_work_product = GlobalWorkProduct.find(params[:id])  
  end
end
