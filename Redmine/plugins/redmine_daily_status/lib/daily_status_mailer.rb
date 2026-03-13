gem "actionmailer"
require "mailer"

class DailyStatusMailer < Mailer
  # unloadable removed for Rails 7 compatibility
  ActionMailer::Base.prepend_view_path(File.join(File.dirname(__FILE__), '../app/views'))

  include Redmine::I18n

  def send_daily_status(user, daily_status, subject, signature)
    redmine_headers 'DailyStatusId' => daily_status.id,
                    'DailyStatus' => daily_status
    message_id daily_status
    references daily_status
    @project_name = daily_status.project.name
    @daily_status = daily_status
    @login_user_name = User.current.name;
    @signature = signature
    mail(:to => user.mail, :subject => "#{subject}")
  end

  def send_daily_status_reply(user, daily_status_reply, subject)
    redmine_headers 'DailyStatusReplyId' => daily_status_reply.id,
                    'DailyStatusReply' => daily_status_reply
    message_id daily_status_reply
    references daily_status_reply
    @project_name = daily_status_reply.daily_status.project.name
    @daily_status_reply = daily_status_reply
    @login_user_name = User.current.name;
    mail(:to => user.mail, :subject => "#{subject}")
  end
end
