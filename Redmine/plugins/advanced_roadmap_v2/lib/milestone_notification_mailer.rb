gem "actionmailer"
require "mailer"
class MilestoneNotificationMailer < Mailer
  include ActionView::Helpers::DateHelper
  ActionMailer::Base.prepend_view_path(File.join(File.dirname(__FILE__), '../app/views'))

  include Redmine::I18n

  def milestone_notification_email(milestone, project, recipients)
    @project = project
    @milestone = milestone
    @trackers = @project.rolled_up_trackers
    @total_issues_by_tracker = Issue.where(fixed_milestone_id: @milestone.id).group(:tracker).count
    @open_issues_by_tracker = Issue.open.where(fixed_milestone_id: @milestone.id).group(:tracker).count
    @total_open_issues = Issue.open.where(fixed_milestone_id: @milestone.id).size
    @total_issues = Issue.where(fixed_milestone_id: @milestone.id).size
    @total_close_issues = @total_issues - @total_open_issues
    subject = "#{milestone.name.to_s} for project #{project.name.to_s} is due in "
    mail(:to => recipients, :subject => "#{subject}")
  end

end


