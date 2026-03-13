Redmine::Plugin.register :member_author do
  name 'Member Author plugin'
  author 'CIS ROR Team'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url ''
  author_url ''

  #Change project manager permission
  permission :change_project_manager, {:members => [:change_manager]}

end

Rails.application.config.to_prepare do
  Member.send(:include, MemberAuthor::MemberPatch)
  MembersController.send(:include, MemberAuthor::MembersControllerPatch)
end


Redmine::Activity.map do |activity|
  activity.register :members,{:class_name => 'Member'}
end

Redmine::MenuManager.map :admin_menu do |menu|
  menu.push :department, {:controller => 'master_departments', :action => 'index'}, :caption => :department
end