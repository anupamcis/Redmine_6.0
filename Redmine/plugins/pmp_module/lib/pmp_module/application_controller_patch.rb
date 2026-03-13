module PmpModule
  module ApplicationControllerPatch
    def self.included(base) # :nodoc:
      base.send(:include, InstanceMethods)
      base.class_eval do
        # before_action :lock_pmp_tabs, :if => :is_pmp_controller?
      end
    end

    module InstanceMethods
    end

    private
    def lock_pmp_tabs
      if params[:project_id].present? || params[:id].present?
        params[:project_id] ||= params[:id]
        project = begin
          Project.find(params[:project_id])
        rescue Exception => e
          nil
        end
        if project.present? && project.active?
          roles = project.try(:members).where(user_id: User.current.id).try(:first).try(:roles)
          is_manager = roles.present? && roles.ids.include?(9)
          if project.services.present? && is_manager
            service_types = project.services.uniq.map(&:service_type).map(&:downcase)
            if !service_types.include?("dedicated") && !service_types.include?("hourly")
              cond = project.project_condition(Setting.display_subprojects_issues?)
              @total_assigned_hours = project.services.sum(:total_hrs).to_f
              @total_spent_hours = TimeEntry.visible.where(cond).sum(:hours).to_f
              if project.project_processes.present?
                sorted_tabs = project.project_processes.map(&:pmp_tab_and_lock_configuration).sort_by(&:position)
                sorted_tabs.each do |tab|
                  tabs_lock_condition = (tab.tab_name != "Project process" && check_tab_model_data?(project,tab.id) && (tab.lock_percent == 0 ||  ((@total_spent_hours/@total_assigned_hours)*100) >= tab.lock_percent))
                  if tabs_lock_condition
                    flash[:warning] = "Some Important PMP Data needs to be filled on this #{tab.tab_name} tab"
                    redirect_to project_pmp_reports_path(project, tab: tab.tab_name.downcase.gsub(/[^0-9A-Z]/i, '_'))
                    return
                  end
                end
              end
            end
          end
        end
      end
    end

    def is_pmp_controller?
      !PMP_CONTROLLERS.include?(params[:controller]) && !request.xhr?
      # a = params[:controller] != "pmp_reports"
      # a = !(params[:back_url].present? && params[:back_url].include?("pmp")) if request.xhr?
      # a = !request.referer.include?("pmp") if request.xhr?
      # a.present? ? a : false
    end

    def check_tab_model_data?(project,tab_id)
      case tab_id
      when 2
        return true if check_model_data_present?(project,"hardware_and_software_profiles")
        return true if check_model_data_present?(project,"hardware_software_suplied_by_clients")
      when 3
        return true if check_model_data_present?(project,"acronyms_and_glossaries")
      when 4
        return true if check_model_data_present?(project,"user_role_and_responsibilities", "users")
        return true if check_model_data_present?(project,"staff_needs", "users")
        return true if check_model_data_present?(project,"responsibility_assignment_matrices", "users")
      when 5
        return true if check_model_data_present?(project,"training_needs", "users")
        return true if check_model_data_present?(project,"knowledge_and_skill_requirements", "users")
      when 6
        return true if check_model_data_present?(project,"communication_plans")
        return true if check_model_data_present?(project,"coordination_plans")
        return true if check_model_data_present?(project,"stakeholder_management_plans")
      when 7
        return true if check_model_data_present?(project,"verification_plans")
        return true if check_model_data_present?(project,"type_of_testings")

      when 8
        return true if check_model_data_present?(project,"risks")
      when 9
        return true if check_model_data_present?(project,"lessons")
        return true if check_model_data_present?(project,"reusable_artifacts")
      when 10
        return true if check_model_data_present?(project,"project_folder_structures")
        return true if check_model_data_present?(project,"configuration_items")
        return true if check_model_data_present?(project,"back_up_details")
        return true if check_model_data_present?(project,"configuration_audits", "users")
        return true if check_model_data_present?(project,"data_retention_plans")
        return true if check_model_data_present?(project,"base_lining_plans")
        return true if check_model_data_present?(project,"client_specific_credentials")
      when 11
        return true if check_model_data_present?(project,"customer_specific_security_requirements")
      when 12
        return true if check_model_data_present?(project,"standard_and_guidlines")
      when 13
        return true if check_model_data_present?(project,"deployment_strategies")
      when 14
        return true if check_model_data_present?(project,"project_monitoring_reviews", "milestones")
      end
    end

    def check_model_data_present?(project, association_name, other_association=nil)
      check_other_association = (other_association.present? ? project.send(other_association).present? : true)
      !project.send(association_name).present? && check_other_association
    end

 end
end