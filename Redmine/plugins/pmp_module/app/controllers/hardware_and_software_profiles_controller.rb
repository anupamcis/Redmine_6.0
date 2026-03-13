class HardwareAndSoftwareProfilesController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :find_hardware_and_software_profile, only: [:edit, :update, :destroy]

  def new
    @hardware_and_software_profile = HardwareAndSoftwareProfile.new
    @field_count = 0
  end

  def create
    @field_count = params[:field_count].to_i
    @hardware_and_software_profile = HardwareAndSoftwareProfile.new(params[:hardware_and_software_profile])
    if @hardware_and_software_profile.save
      params[:hardware_and_software_profile_data].each do |key, value|
        @hardware_and_software_profile_data = @hardware_and_software_profile.hardware_and_software_profile_datas.create(value)
      end
      flash[:notice] = l(:hardware_and_software_profile_added)
      redirect_to global_pmp_profiles_path(tab: "hardware_and_software_profile")
    else
      render 'new'
    end
  end

  def edit
    params[:hardware_and_software_profile_data] = {}
    @hardware_and_software_profile_datas  = @hardware_and_software_profile.hardware_and_software_profile_datas
    @hardware_and_software_profile_datas.each_with_index do |profile_data, i|
      params[:hardware_and_software_profile_data].merge!({i.to_s => 
        {profile_data_id: profile_data.id ,profile_type: profile_data.profile_type, resource: profile_data.resource,
         configuration: profile_data.configuration, environment: profile_data.environment,
         quantity: profile_data.quantity, action: profile_data.action, version: profile_data.version
        }
      })
    end
    @field_count = @hardware_and_software_profile_datas.count
  end

  def update
    @field_count = params[:field_count].to_i
    if @hardware_and_software_profile.update(params[:hardware_and_software_profile])
      params[:hardware_and_software_profile_data].each do |key, value|
        if value[:profile_data_id].present?
          profile_data = @hardware_and_software_profile.hardware_and_software_profile_datas.find(value[:profile_data_id])
          profile_data.update(value)
        else
          @hardware_and_software_profile.hardware_and_software_profile_datas.create(value)
        end
      end
      flash[:notice] = l(:hardware_and_software_profile_updated)
      redirect_to global_pmp_profiles_path(tab: "hardware_and_software_profile")
    else
      render 'edit'
    end
  end

  def destroy
    @hardware_and_software_profile.destroy
    flash[:notice] = l(:hardware_and_software_profile_deleted)
    redirect_to global_pmp_profiles_path(tab: "hardware_and_software_profile")
  end

  def render_profile_form
    if params[:id].present?
      @hardware_and_software_profile = HardwareAndSoftwareProfile.find(params[:id])
      @new_field = true
    end
    @field_count = params[:field_count]
    respond_to do |format|
      format.js
    end
  end

  private

  def find_hardware_and_software_profile
   @hardware_and_software_profile = HardwareAndSoftwareProfile.find(params[:id])
  end
end
