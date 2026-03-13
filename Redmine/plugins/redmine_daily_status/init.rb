require 'redmine'
require_relative 'lib/daily_status_application_hooks'

Redmine::Plugin.register :redmine_daily_status do
  name 'Daily Status'
  author 'Amol Pujari, Vishal Mene'
  description 'Consolidated Team Daily Status'
  version '0.0.1'
  url 'https://github.com/gs-lab/redmine_daily_status'
  author_url 'https://github.com/gs-lab/redmine_daily_status'

  project_module :daily_status do
    permission :view_daily_status,   :daily_statuses => [:index, :show]
    permission :manage_daily_status, :daily_statuses => [:new, :create, :update]
    permission :view_daily_status_reply, {}
    permission :manage_daily_status_reply,:daily_status_replies => [:new, :create]
    permission :download_attachment, {}
  end
 
  menu :project_menu, :daily_statuses,
    { :controller => 'daily_statuses', :action => 'index' },
    :caption => :daily_status,
    :after => :activity,
    :param => :project_id
end
Redmine::Activity.map do |activity|
  activity.register :daily_statuses,{:class_name => 'DailyStatus'}
end

require_relative 'lib/mail_handler_patch'
require_relative 'lib/daily_status_mailer'
require_relative 'app/models/daily_status_project_patch'

Rails.application.config.to_prepare do
  MailHandler.send(:include, MailHandlerPatch)
end