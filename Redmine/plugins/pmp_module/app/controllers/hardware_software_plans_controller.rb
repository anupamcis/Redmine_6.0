class HardwareSoftwarePlansController < ApplicationController

  before_action :authorize_global, except: [:load_profile_data, :add_more_new, :add_more]
  before_action :find_hardware_software_plan, :only => [:edit, :update, :destroy]
  before_action :find_project

  def new
    @hardware_software_plan = HardwareSoftwarePlan.new
    @hardware_software_profiles = if User.current.admin?
      HardwareAndSoftwareProfile.where("(project_id  is null or use_as_profile = ? )", true)
    else
      HardwareAndSoftwareProfile.where("(project_id  is null or user_id = ? and use_as_profile = ? )",User.current.id, true)
    end
  end

  def create
    check_all = []
    params[:hardware_and_software_plan].each do |key, value|
      @profile = HardwareAndSoftwareProfile.find(value[:profile_id])
      @profile_data = if @profile.project.present?
        HardwareSoftwarePlan.find(value[:profile_data_id]) if value[:profile_data_id].present?
      else
        HardwareAndSoftwareProfileData.find(value[:profile_data_id]) if value[:profile_data_id].present?
      end
      new_values =  value.except(:profile_id,:profile_data_id, :critical_resource, :start_date, :end_date, :responsible_person_id, :remarks)
      old_data = @profile_data.serializable_hash.except("id", "project_id", "user_id", "hardware_and_software_profile_id").values
      check_all << is_profile_data_changed?(old_data, new_values)
      @new_profile = HardwareAndSoftwareProfile.find_or_initialize_by(name: "#{HW_SW_PREFIX} #{@project.name}", project_id: @project.id)
      @new_profile.create_profile_with_hw_sw_plan(value, check_all.include?(true))
    end
    @new_profile.send_mail(params[:hardware_and_software_plan].count)
    respond_to do |format|
      flash[:notice] = l(:hardware_software_plan_add_success)
      format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")) }
      format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'hardware_and_software_plan')}'"}
    end
  end

  def edit; end

  def update
    if @hardware_software_plan.update(params[:hardware_software_plan])
      respond_to do |format|
        flash[:notice] = l(:hardware_software_plan_update_success)
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'hardware_and_software_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.js
      end
    end
  end

  def add_more_new
    @profile = HardwareAndSoftwareProfile.find(params[:profile_id])
    @hardware_software_plan = @profile.hardware_software_plans.build
  end

  def add_more
    @profile = HardwareAndSoftwareProfile.find(params[:hardware_software_plan][:profile_id])
    @hardware_software_plan = HardwareSoftwarePlan.new(params[:hardware_software_plan])
    @hardware_software_plan.hardware_and_software_profile_id = params[:hardware_software_plan][:profile_id].to_i
    @hardware_software_plan.add_coordination_plan(@profile.project_id)
    if @hardware_software_plan.save
      @hardware_software_plan.add_more_send_mail
      @profile = @hardware_software_plan.hardware_and_software_profile
      respond_to do |format|
        flash[:notice] = l(:hardware_software_plan_added_success_add_more, to: @profile.name )
        format.html { redirect_back_or_default(project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")) }
        format.js { render js: "window.location='#{project_pmp_reports_path(@project, :tab => 'hardware_and_software_plan')}'"}
      end
    else
      respond_to do |format|
        format.html { render :action => 'add_more_new' }
        format.js
      end
    end
  end

  def destroy
    profile  = @hardware_software_plan.hardware_and_software_profile
    profile.hardware_software_plans.count == 1 ? profile.destroy : @hardware_software_plan.destroy
    flash[:notice] = l(:hardware_software_plan_delete_success)
    redirect_to project_pmp_reports_path(@project, :tab => "hardware_and_software_plan")
  end

  def load_profile_data
    @hardware_software_profiles = HardwareAndSoftwareProfile.where(id: params[:profile_id])
    @with_project = @hardware_software_profiles.where.not(project_id: nil)
    @without_project = @hardware_software_profiles.where(project_id: nil)
    @profile_data =  if @with_project.present?
      @with_project.map(&:hardware_software_plans).flatten.compact.map{|hw_sw_plan| hw_sw_plan if !hw_sw_plan.environment.eql? 'Production'}
    else
      @without_project.map(&:hardware_and_software_profile_datas) if @without_project.present?
    end.flatten.compact
    respond_to do |format|
      format.js
    end
  end

  private

  def find_hardware_software_plan
    @hardware_software_plan = HardwareSoftwarePlan.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end

  def is_profile_data_changed?(old_data, new_values)
    is_changed = false
    new_values.each do |key, value|
      is_changed = old_data.include?(value)
      return true if is_changed == false
    end
  end
end
