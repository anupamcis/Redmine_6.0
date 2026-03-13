require 'redmine'

Redmine::Plugin.register :projects_reporting do
  name 'Projects Reporting plugin'
  author 'CIS ROR Team'
  description 'This is a plugin for show untouched projects list'
  version '0.0.1'
  url ''
  author_url ''

  settings :default => {
    'set_untouched_project_days' => 5
  }, :partial => 'projects_reporting_settings'

  project_module :projects_reporting do
    permission :show_project_reports, {:project_reports => [:index]}, :require => :loggedin, :read => true
    permission :project_paid_hours_reports, {:my => [:page]}, :require => :loggedin, :read => true
    permission :project_spent_hours_reports, {:my => [:page]}, :require => :loggedin, :read => true

  end

	menu(:top_menu, :project_report, { :controller => 'project_reports', :action => 'index' }, :caption => :project_report, :if => Proc.new { User.current.allowed_to?(:show_project_reports, nil, global: true)})
end

Rails.application.config.to_prepare do
  require_relative 'lib/projects_reporting/project_patch'
  require_relative 'lib/projects_reporting/user_patch'
  unless Project.included_modules.include?(ProjectsReporting::ProjectPatch)
    Project.send(:include, ProjectsReporting::ProjectPatch)
  end
  unless User.included_modules.include?(ProjectsReporting::UserPatch)
    User.send(:include, ProjectsReporting::UserPatch)
  end
end