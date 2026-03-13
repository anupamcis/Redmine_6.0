require 'redmine'

# Explicitly require patch files for Zeitwerk
require_relative 'lib/service_module/project_patch'
require_relative 'lib/service_module/issue_patch'
require_relative 'lib/service_module/user_patch'
require_relative 'lib/service_module/projects_helper_patch'
require_relative 'lib/service_module/projects_controller_patch'

Redmine::Plugin.register :service_module do
  name 'Service Module plugin'
  author 'CIS ROR Team'
  description 'This is a plugin for Redmine to connected ERP service module with PMS2'
  version '0.0.1'
  url ''
  author_url ''

  menu(:top_menu, :services, { :controller => 'services', :action => 'index' }, :caption => :services,
  :if => Proc.new { (User.current.allowed_to?(:assign_service, nil, :global => true)) }, :last => true,
  :html => {:class => 'top_menu_services'} )

  project_module :service_module do
    permission :assign_service, {:services => [:index]}, :read => true, :require => :loggedin
    permission :remove_service, {:projects => :settings, :service_details => [:remove_service_detail]},
    :require => :loggedin, :read => true
    permission :change_master, {:projects => :settings, :service_details =>
      [:update_service_detail_master]}, :require => :loggedin, :read => true
  end
end

  Rails.application.config.to_prepare do
    Project.send(:include, ServiceModule::ProjectPatch)
    Issue.send(:include, ServiceModule::IssuePatch)
    User.send(:include, ServiceModule::UserPatch)
    ProjectsHelper.send(:include, ServiceModule::ProjectsHelperPatch)
    ProjectsController.send(:include, ServiceModule::ProjectsControllerPatch)
  end

  Redmine::MenuManager.map :project_menu do |menu|
    menu.push :timesheet_report, {:controller => 'timesheets', :action => 'index'}, :caption => :timesheet_report, :after => :untracked_mail, :if => Proc.new { |p| (User.current.allowed_to?(:view_timesheet_report, nil, :global => true) || User.current.admin?) && p.identifier != GLOBAL_PERMISSIONS_MODULE_NAME }
  end

require_relative 'lib/service_module/hooks/view_hooks'