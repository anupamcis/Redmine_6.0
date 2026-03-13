require 'redmine'

Redmine::Plugin.register :user_company do
  name 'User Company plugin'
  author 'CIS ROR TEAM'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url ''
  author_url ''

  project_module :user_company do
    permission :show_company, {:companies => [:show]}, :require => :loggedin, :read => true
    permission :add_company, {:companies => [:new, :create]}, :require => :loggedin
    permission :edit_company, {:companies => [:edit, :update]}, :require => :loggedin
    permission :destroy_company, {:companies => [:destroy]}, :require => :loggedin
    permission :index_company, {:companies => [:index]}, :require => :loggedin
  end
end

require_relative 'lib/user_company/user_patch'
require_relative 'lib/user_company/users_controller_patch'
require_relative 'lib/user_company/principal_patch'
require_relative 'lib/user_company/members_helper_patch'
require_relative 'lib/user_company/application_helper_patch'

Rails.application.config.to_prepare do
  User.send(:include, UserCompany::UserPatch) unless User.included_modules.include?(UserCompany::UserPatch)
  UsersController.send(:include, UserCompany::UsersControllerPatch) unless UsersController.included_modules.include?(UserCompany::UsersControllerPatch)
  Principal.send(:include, UserCompany::PrincipalPatch) unless Principal.included_modules.include?(UserCompany::PrincipalPatch)
  MembersHelper.send(:include, UserCompany::MembersHelperPatch) unless MembersHelper.included_modules.include?(UserCompany::MembersHelperPatch)
  ApplicationHelper.send(:include, UserCompany::ApplicationHelperPatch) unless ApplicationHelper.included_modules.include?(UserCompany::ApplicationHelperPatch)
end


Redmine::MenuManager.map :project_menu do |menu|
  menu.push :company, {:controller => 'companies', :action => 'index'}, :caption => :company, :if => Proc.new { |p| (User.current.allowed_to?(:index_company, nil, :global => true) && !User.current.admin?) && p.identifier == GLOBAL_PERMISSIONS_MODULE_NAME}
end

Redmine::MenuManager.map :admin_menu do |menu|
  menu.push :company, {:controller => 'companies', :action => 'index'}, :caption => :company
end

require_relative 'lib/user_company/hooks/view_hooks'
