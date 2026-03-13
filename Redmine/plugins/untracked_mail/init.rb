require 'redmine'
require_relative 'lib/untracked_mail/user_patch'

Redmine::Plugin.register :untracked_mail do
  name 'Untracked Mail plugin'
  author 'ROR Team'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url ''
  author_url ''


  project_module :untracked_mails do
    permission :show, {:untracked_mails => [:show]}
    permission :show_project_untracked_mails, {:untracked_mails => [:project_untracked_mails]}
  end

end

Redmine::MenuManager.map :project_menu do |menu|
  menu.push :untracked_mail, {:controller => 'untracked_mails', :action => 'project_untracked_mails'}, :caption => :untracked_mail, :after => :daily_status, :if => Proc.new { |p| (User.current.allowed_to?(:show_project_untracked_mails, nil, :global => true) || User.current.admin?) && p.identifier != GLOBAL_PERMISSIONS_MODULE_NAME }
end

Redmine::MenuManager.map :admin_menu do |menu|
  menu.push :untracked_mail, {:controller => 'untracked_mails', :action => 'index'}, :caption => :untracked_mail
end