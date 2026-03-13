require 'redmine'
require_relative 'lib/pmp_module/hardware_software_mailer'
require_relative 'lib/pmp_module/project_patch'
require_relative 'lib/pmp_module/user_patch'
require_relative 'lib/pmp_module/role_patch'
require_relative 'lib/pmp_module/application_controller_patch'

Redmine::Plugin.register :pmp_module do
  name 'Pmp Module plugin'
  author 'CIS ROR TEAM'
  description 'Pmp reports'
  version '0.0.1'
  url ''
  author_url ''

  # Project-level PMP tab (next to Documents, EVM, etc.)
  menu :project_menu, :pmp_reports,
       { :controller => 'pmp_reports', :action => 'index' },
       :caption => :pmp_reports,
       :param => :project_id

  menu :admin_menu, :raci_chart, { :controller => 'raci_charts', :action => 'index' },
  :caption => :raci_chart

  menu :admin_menu, :pmp_global_profiles, { :controller => 'global_pmp_profiles', :action => 'index' },
  :caption => :pmp_global_profiles

  menu :admin_menu, :label_pmp_tab_plural, { :controller => 'pmp_tab_and_lock_configurations', :action => 'index' },
  :caption => :label_pmp_tab_plural

  project_module :pmp_reports do
    permission :view_pmp_reports, {:pmp_reports => [:index]}

    permission :view_acronyms_and_glossaries, {}, :require => :loggedin, :read => true
    permission :create_acronyms_and_glossaries, {:acronyms_and_glossaries => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_acronyms_and_glossaries, {:acronyms_and_glossaries => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_acronyms_and_glossaries, {:acronyms_and_glossaries => [:destroy]}, :require => :loggedin, :read => true

    permission :view_back_up_details, {}, :require => :loggedin, :read => true
    permission :create_back_up_details, {:back_up_details => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_back_up_details, {:back_up_details => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_back_up_details, {:back_up_details => [:destroy]}, :require => :loggedin, :read => true

    permission :view_base_lining_plans, {}, :require => :loggedin, :read => true
    permission :create_base_lining_plans, {:base_lining_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_base_lining_plans, {:base_lining_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_base_lining_plans, {:base_lining_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_communication_plans, {}, :require => :loggedin, :read => true
    permission :create_communication_plans, {:communication_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_communication_plans, {:communication_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_communication_plans, {:communication_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_configuration_audits, {}, :require => :loggedin, :read => true
    permission :create_configuration_audits, {:configuration_audits => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_configuration_audits, {:configuration_audits => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_configuration_audits, {:configuration_audits => [:destroy]}, :require => :loggedin, :read => true

    permission :view_configuration_items, {}, :require => :loggedin, :read => true
    permission :create_configuration_items, {:configuration_items => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_configuration_items, {:configuration_items => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_configuration_items, {:configuration_items => [:destroy]}, :require => :loggedin, :read => true

    permission :view_coordination_plans, {}, :require => :loggedin, :read => true
    permission :create_coordination_plans, {:coordination_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_coordination_plans, {:coordination_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_coordination_plans, {:coordination_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_customer_specific_security_requirements, {}, :require => :loggedin, :read => true
    permission :create_customer_specific_security_requirements, {:customer_specific_security_requirements => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_customer_specific_security_requirements, {:customer_specific_security_requirements => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_customer_specific_security_requirements, {:customer_specific_security_requirements => [:destroy]}, :require => :loggedin, :read => true

    permission :view_data_retention_plans, {}, :require => :loggedin, :read => true
    permission :create_data_retention_plans, {:data_retention_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_data_retention_plans, {:data_retention_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_data_retention_plans, {:data_retention_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_deployment_strategies, {}, :require => :loggedin, :read => true
    permission :create_deployment_strategies, {:deployment_strategies => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_deployment_strategies, {:deployment_strategies => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_deployment_strategies, {:deployment_strategies => [:destroy]}, :require => :loggedin, :read => true

    permission :view_hardware_software_plans, {}, :require => :loggedin, :read => true
    permission :create_hardware_software_plans, {:hardware_software_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_hardware_software_plans, {:hardware_software_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_hardware_software_plans, {:hardware_software_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_hardware_software_suplied_by_clients, {}, :require => :loggedin, :read => true
    permission :create_hardware_software_suplied_by_clients, {:hardware_software_suplied_by_clients => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_hardware_software_suplied_by_clients, {:hardware_software_suplied_by_clients => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_hardware_software_suplied_by_clients, {:hardware_software_suplied_by_clients => [:destroy]}, :require => :loggedin, :read => true

    permission :view_knowledge_and_skill_requirements, {}, :require => :loggedin, :read => true
    permission :create_knowledge_and_skill_requirements, {:knowledge_and_skill_requirements => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_knowledge_and_skill_requirements, {:knowledge_and_skill_requirements => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_knowledge_and_skill_requirements, {:knowledge_and_skill_requirements => [:destroy]}, :require => :loggedin, :read => true

    permission :view_lessons, {}, :require => :loggedin, :read => true
    permission :create_lessons, {:lessons => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_lessons, {:lessons => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_lessons, {:lessons => [:destroy]}, :require => :loggedin, :read => true

    permission :view_project_folder_structures, {}, :require => :loggedin, :read => true
    permission :create_project_folder_structures, {:project_folder_structures => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_project_folder_structures, {:project_folder_structures => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_project_folder_structures, {:project_folder_structures => [:destroy]}, :require => :loggedin, :read => true

    permission :view_project_monitoring_reviews, {}, :require => :loggedin, :read => true
    permission :create_project_monitoring_reviews, {:project_monitoring_reviews => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_project_monitoring_reviews, {:project_monitoring_reviews => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_project_monitoring_reviews, {:project_monitoring_reviews => [:destroy]}, :require => :loggedin, :read => true

    permission :view_reusable_artifacts, {}, :require => :loggedin, :read => true
    permission :create_reusable_artifacts, {:reusable_artifacts => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_reusable_artifacts, {:reusable_artifacts => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_reusable_artifacts, {:reusable_artifacts => [:destroy]}, :require => :loggedin, :read => true

    permission :view_risks, {}, :require => :loggedin, :read => true
    permission :create_risks, {:risks => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_risks, {:risks => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_risks, {:risks => [:destroy]}, :require => :loggedin, :read => true

    permission :view_staff_needs, {}, :require => :loggedin, :read => true
    permission :create_staff_needs, {:staff_needs => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_staff_needs, {:staff_needs => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_staff_needs, {:staff_needs => [:destroy]}, :require => :loggedin, :read => true

    permission :view_stakeholder_management_plans, {}, :require => :loggedin, :read => true
    permission :create_stakeholder_management_plans, {:stakeholder_management_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_stakeholder_management_plans, {:stakeholder_management_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_stakeholder_management_plans, {:stakeholder_management_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_standard_and_guidlines, {}, :require => :loggedin, :read => true
    permission :create_standard_and_guidlines, {:standard_and_guidlines => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_standard_and_guidlines, {:standard_and_guidlines => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_standard_and_guidlines, {:standard_and_guidlines => [:destroy]}, :require => :loggedin, :read => true

    permission :view_training_needs, {}, :require => :loggedin, :read => true
    permission :create_training_needs, {:training_needs => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_training_needs, {:training_needs => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_training_needs, {:training_needs => [:destroy]}, :require => :loggedin, :read => true

    permission :view_type_of_testings, {}, :require => :loggedin, :read => true
    permission :create_type_of_testings, {:type_of_testings => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_type_of_testings, {:type_of_testings => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_type_of_testings, {:type_of_testings => [:destroy]}, :require => :loggedin, :read => true

    permission :view_user_role_and_responsibilities, {}, :require => :loggedin, :read => true
    permission :create_user_role_and_responsibilities, {:user_role_and_responsibilities => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_user_role_and_responsibilities, {:user_role_and_responsibilities => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_user_role_and_responsibilities, {:user_role_and_responsibilities => [:destroy]}, :require => :loggedin, :read => true

    permission :view_verification_plans, {}, :require => :loggedin, :read => true
    permission :create_verification_plans, {:verification_plans => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_verification_plans, {:verification_plans => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_verification_plans, {:verification_plans => [:destroy]}, :require => :loggedin, :read => true

    permission :view_raci_chart, {}, :require => :loggedin, :read => true
    permission :create_raci_chart, {:responsibility_assignment_matrices => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_raci_chart, {:responsibility_assignment_matrices => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_raci_chart, {:responsibility_assignment_matrices => [:destroy]}, :require => :loggedin, :read => true

    permission :create_raci_chart_filter, {:project_responsibility_assignment_matrix_filters => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_raci_chart_filter, {:project_responsibility_assignment_matrix_filters => [:edit, :update]}, :require => :loggedin, :read => true

    permission :view_client_specific_credentials, {}, :require => :loggedin, :read => true
    permission :create_client_specific_credentials, {:client_specific_credentials => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_client_specific_credentials, {:client_specific_credentials => [:edit, :update]}, :require => :loggedin, :read => true
    permission :delete_client_specific_credentials, {:client_specific_credentials => [:destroy]}, :require => :loggedin, :read => true
  end
end

Rails.application.config.to_prepare do
  Project.send(:include, PmpModule::ProjectPatch)
  User.send(:include, PmpModule::UserPatch)
  Role.send(:include, PmpModule::RolePatch)
  ApplicationController.send(:include, PmpModule::ApplicationControllerPatch)
end