class GlobalPmpProfilesController < ApplicationController
  layout 'admin'

  before_action :require_admin

  def index
    @hardware_and_software_profiles = HardwareAndSoftwareProfile.all
    @global_type_of_testings = GlobalTypeOfTesting.all
    @global_acronyms_and_glossaries = GlobalAcronymsAndGlossary.all
    @global_back_up_details = GlobalBackUpDetail.all
    @global_data_retention_plans = GlobalDataRetentionPlan.all
    @global_work_products = GlobalWorkProduct.all
  end
end
