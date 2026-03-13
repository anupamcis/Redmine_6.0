Redmine::Plugin.register :user_permissions do
  name 'User Permissions plugin'
  author 'CIS ROR TEAM'
  description 'This plugin allows to give permissions to roles to manage users (like add, edit delete etc.)'
  version '0.0.1'
  url ''
  author_url ''

  project_module :user_management do
    permission :show_users, {:users => [:show]}, :require => :loggedin, :read => true
    permission :add_users, {:users => [:new, :create]}, :require => :loggedin
    permission :edit_users, {:users => [:edit, :update]}, :require => :loggedin
    permission :destroy_users, {:users => [:destroy]}, :require => :loggedin
    permission :index_users, {:users => [:index]}, :require => :loggedin
    permission :lock_users, {}, :require => :loggedin
  end
end

require_relative 'lib/user_permissions/user_patch'
require_relative 'lib/user_permissions/role_patch'
require_relative 'lib/user_permissions/users_controller_patch'
require_relative 'lib/user_permissions/users_helper_patch'
require_relative 'lib/user_permissions/application_helper_patch'

Rails.application.config.to_prepare do
  User.send(:include, UserPermissions::UserPatch) unless User.included_modules.include?(UserPermissions::UserPatch)
  Role.send(:include, UserPermissions::RolePatch) unless Role.included_modules.include?(UserPermissions::RolePatch)
  UsersController.send(:include, UserPermissions::UsersControllerPatch) unless UsersController.included_modules.include?(UserPermissions::UsersControllerPatch)
  UsersHelper.send(:include, UserPermissions::UsersHelperPatch) unless UsersHelper.included_modules.include?(UserPermissions::UsersHelperPatch)
  ApplicationHelper.send(:include, UserPermissions::ApplicationHelperPatch) unless ApplicationHelper.included_modules.include?(UserPermissions::ApplicationHelperPatch)
end

Redmine::MenuManager.map :project_menu do |menu|
  menu.push :manage_users, {:controller => 'users', :action => 'index'}, :caption => :manage_users, :if => Proc.new { User.current.allowed_to?(:index_users, nil, :global => true) && !User.current.admin? }
end

Redmine::MenuManager.map :top_menu do |menu|
  menu.push :global_permissions, { :controller => 'projects', :action => 'show', :id => 'global-permissions' }, :caption => :global_permissions, :if => Proc.new { Project.first.members.pluck("user_id").include?(User.current.id) || User.current.admin? }
end
