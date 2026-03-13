class VerificationPlansController < ApplicationController

  before_action :authorize_global, except: [:autocomplete_for_work_product]
  before_action :find_verification_plan, :only => [:edit, :update, :destroy]
  before_action :find_project, except: [:autocomplete_for_work_product]

  def new
    @verification_plan = VerificationPlan.new
  end

  def create
    @verification_plan = VerificationPlan.new(params[:verification_plan])
    if @verification_plan.save
      GlobalWorkProduct.find_or_create_by(work_product: params[:verification_plan][:work_product])
      respond_to do |format|
        flash[:notice] = l(:verification_plan_add_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "verification")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'verification')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'new' }
        format.js
      end
    end
  end

  def edit
  end

  def update
    if @verification_plan.update_attributes(params[:verification_plan])
      GlobalWorkProduct.find_or_create_by(work_product: params[:verification_plan][:work_product])
      respond_to do |format|
        flash[:notice] = l(:verification_plan_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "verification")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'verification')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def destroy
    @verification_plan.destroy
    flash[:notice] = l(:verification_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "verification")
  end

  def autocomplete_for_work_product
   @global_work_products = []
   @global_work_products += GlobalWorkProduct.where("lower(work_product) LIKE LOWER(?) ", "%#{params[:term]}%" ).to_a
   @global_work_products.compact!
   render :layout => false
  end

  private

  def find_verification_plan
    @verification_plan = VerificationPlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
end
