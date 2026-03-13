Redmine::Plugin.register :org_reports do
  name 'Org Reports plugin'
  author 'CIS ROR TEAM'
  description 'This is a plugin for showing projects report in dashboard'
  version '0.0.1'
  url ''
  author_url ''

  settings :default => {
    'project_size_to' => 200,
    'project_size_from' => 0,
    'issue_count' => 50,
    'user_involvement' => "Direct",
    'bug_percent' => 20
  }, :partial => 'org_reports_settings'

  permission :view_org_reports, {}
end

Rails.application.config.to_prepare do
  Project.send(:include, OrgReports::ProjectPatch)
  WelcomeController.send(:include, OrgReports::WelcomeControllerPatch)
end