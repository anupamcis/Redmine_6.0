module GlobalPmpProfilesHelper


  def global_pmp_profiles_tabs
    tabs = []
    tabs = [ {:name => 'hardware_and_software_profile', :action => :index, :partial => 'hardware_and_software_profiles/index', :label => :global_profile_plural},
             {:name => 'global_type_of_testing', :action => :index, :partial => 'global_type_of_testings/index', :label => :label_global_type_of_testing_plural},
             {:name => 'global_acronyms_and_glossary', :action => :index, :partial => 'global_acronyms_and_glossaries/index', :label => :label_global_acronyms_and_glossary_plural},
             {:name => 'global_back_up_detail', :action => :index, :partial => 'global_back_up_details/index', :label => :label_global_back_up_detail_plural},
             {:name => 'global_data_retention_plan', :action => :index, :partial => 'global_data_retention_plans/index', :label => :label_global_data_retention_plan_plural},
             {:name => 'global_work_product', :action => :index, :partial => 'global_work_products/index', :label => :label_global_work_product_plural}
    ]
    tabs
  end


end
