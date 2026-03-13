Redmine::Plugin.register :client_authentication do
  name 'Client Authentication plugin'
  author 'CIS ROR TEAM'
  description 'This is a plugin for Redmine to add special permissions for client roles'
  version '0.0.1'
  url ''
  author_url ''

  # project_module :extra_permissions_for_project_and_issues do
    permission :hide_percentage_done, {}, :require => :loggedin
    permission :hide_dates, {}, :require => :loggedin
    permission :show_milestone, {:milestones => [:show]}
    permission :show_version, {:versions => [:show]}
    permission :activity, {:activities => [:index]}
    permission :add_manager, {}
  # end

  project_module :issue_tracking do
    permission :edit_attachments, {:attachments => [:edit, :update]}
    permission :watch_item, {:watchers => [:watch, :unwatch]}
  end
end
