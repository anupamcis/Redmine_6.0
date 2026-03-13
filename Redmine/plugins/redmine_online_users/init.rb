Redmine::Plugin.register :redmine_online_users do
  name 'Redmine Online Users plugin'
  author 'CIS ROR TEAM'
  description 'This is a plugin for Redmine to show list of online users'
  version '0.0.1'
  url ''
  author_url ''

  settings :default => {
    'set_user_idle_time' => 15
  }, :partial => 'online_users_settings'

end

Rails.application.config.to_prepare do
  User.send(:include, RedmineOnlineUsers::UserPatch)
  ApplicationController.send(:include, RedmineOnlineUsers::ApplicationControllerPatch)
end

require_relative 'lib/redmine_online_users/hooks/view_hooks'
