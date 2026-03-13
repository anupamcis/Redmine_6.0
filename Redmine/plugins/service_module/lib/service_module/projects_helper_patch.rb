
module ServiceModule
  module ProjectsHelperPatch
    def self.included(base)
      base.class_eval do
       def project_settings_tabs_with_service_module
          tabs = project_settings_tabs_without_service_module
          action = {:name => 'assigned_service', :controller => 'service_details', :action => :assign_service, :partial => 'projects/settings/assgined_service', :label => :project_services}

          tabs << action if User.current.allowed_to?(action[:action], @project)

          tabs
        end
        alias_method :project_settings_tabs_without_service_module, :project_settings_tabs
        alias_method :project_settings_tabs, :project_settings_tabs_with_service_module
      end
    end
  end
end
