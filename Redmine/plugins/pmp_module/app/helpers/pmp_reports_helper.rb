module PmpReportsHelper

  def pmp_settings_tabs
    tabs = []
    if @project.present? && @project.project_processes.present?
      @project.project_processes.joins(:pmp_tab_and_lock_configuration).map(&:pmp_tab_and_lock_configuration).sort_by(&:position).each do |tab|
        tab_name = tab.tab_name.downcase.gsub(/[^0-9A-Z]/i, '_')
        label = "label_#{tab_name}"
        if lookup_context.find_all("pmp_reports/_#{tab_name}").any?
          tabs << {:name => tab_name, :partial => "pmp_reports/#{tab_name}", :label => label} if check_tab_permission(tab.id)
       else
        tabs << {:name => tab_name, :partial => "pmp_reports/no_partial", :label => label}
      end
    end
  end
    tabs
  end

  def check_tab_permission(tab_id)
    case tab_id
    when 1
      true
    when 2
      return true if check_permission("view_hardware_software_plans")
      return true if check_permission("view_hardware_software_suplied_by_clients")
    when 3
      return true if check_permission("view_acronyms_and_glossaries")
    when 4
      return true if check_permission("view_user_role_and_responsibilities")
      return true if check_permission("view_staff_needs")
      return true if check_permission("view_raci_chart")
    when 5
      return true if check_permission("view_training_needs")
      return true if check_permission("view_knowledge_and_skill_requirements")
    when 6
      return true if check_permission("view_communication_plans")
      return true if check_permission("view_coordination_plans")
      return true if check_permission("view_stakeholder_management_plans")
    when 7
      return true if check_permission("view_verification_plans")
      return true if check_permission("view_type_of_testings")

    when 8
      return true if check_permission("view_risks")
    when 9
      return true if check_permission("view_lessons")
      return true if check_permission("view_reusable_artifacts")
    when 10
      return true if check_permission("view_project_folder_structures")
      return true if check_permission("view_configuration_items")
      return true if check_permission("view_back_up_details")
      return true if check_permission("view_configuration_audits")
      return true if check_permission("view_data_retention_plans")
      return true if check_permission("view_base_lining_plans")
      return true if check_permission("view_client_specific_credentials")
    when 11
      return true if check_permission("view_customer_specific_security_requirements")
    when 12
      return true if check_permission("view_standard_and_guidlines")
    when 13
      return true if check_permission("view_deployment_strategies")
    when 14
      return true if check_permission("view_project_monitoring_reviews")
    end
  end

  def check_permission(view_name)
    User.current.allowed_to?(view_name.to_sym, @project, global: true)
  end
end
