desc <<-END_DESC
Send reminders about issues due in the next days.

Available options:
  * days     => number of days to remind about (defaults to 7)
  * tracker  => id of tracker (defaults to all trackers)
  * project  => id or identifier of project (defaults to all projects)
  * users    => comma separated list of user/group ids who should be reminded
  * version  => name of target version for filtering issues (defaults to none)

Example:
  rake redmine:send_reminders days=7 users="1,23, 56" RAILS_ENV="production"
END_DESC

namespace :redmine do
  task milestone_send_email_notification: :environment do
    if Milestone.exists?
      due_in = Setting.plugin_advanced_roadmap_v2[:milestone_notification_in_days].to_i
      Milestone.all.each do |milestone|
        if due_in.present?
          if milestone.effective_date.present? && (milestone.effective_date + due_in.day) == Date.today
            project = Project.find(milestone.project.id)
            recipients = project.users.where("users.company_id = ? ", Company.where(default_company: true).first).map(&:mail)
            MilestoneNotificationMailer.milestone_notification_email(milestone, project, recipients).deliver
          end
        end
      end
    end
  end


  task milestone_load_data: :environment do
    if Project.exists?
      Project.all.each do |project|
        puts "Project #{project.name}"
        version = project.versions.first if project.versions.present?
        milestone = project.milestones.first if project.milestones.present?
        if version.present? && milestone.present?
          puts "Version #{version.name}"
          puts "Milestone #{milestone.name}"
          if (milestone.effective_date.present? && version.effective_date.present?) && (milestone.effective_date <= version.effective_date)
            milestone.update_column('version_id', version.id)
          else
            version.update_column('effective_date', Time.now + 3.day)
            milestone.update_columns(effective_date: Time.now + 2.day, version_id: version.id)
          end
        end
        if project.issues.present? && version.present? && milestone.present?
          project.issues.each do |issue|
            puts "issue #{issue.subject}"
            issue.update_column("fixed_version_id", version.id)
            issue.update_column("fixed_milestone_id", milestone.id)
          end
        end
      end
    end
  end

end
