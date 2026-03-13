class DailyStatusReply < ActiveRecord::Base

  belongs_to :daily_status
  belongs_to :author, :class_name => 'User', :foreign_key => 'author_id'
  has_many :release_notifications, as: :notifiable, dependent: :destroy
  validates_presence_of :message
  #attr_accessible :message, :is_email_sent, :author_id, :daily_status_id
  acts_as_attachable

  def email
    subject = "Re " + daily_status.subject.to_s
    recipients = []
    if daily_status.setting.watchers.any?
      recipients = daily_status.setting.watchers.includes(:user).map(&:user).compact
    else
      recipients = daily_status.project.members.includes(:user).map(&:user).compact
    end
    recipients << daily_status.author
    recipients = recipients.compact.uniq
    recipients.each do |user|
      next unless user&.mail.present?
      DailyStatusMailer.send_daily_status_reply(user, self, subject).deliver
    end
  end

  def attachments_visible?(usr=nil)
    if User.current.company_id.nil? || User.current.company.default_company
      (usr || User.current).admin? || (usr || User.current).allowed_to?(:view_daily_status_reply, self.daily_status.project)
    else
      (usr || User.current).allowed_to?(:download_attachment, self.daily_status.project )
    end
  end

  def attachments_editable?(usr=nil)
    (usr || User.current).admin? || (usr || User.current).allowed_to?(:view_daily_status_reply, self.daily_status.project)
  end

  def attachments_deletable?(usr=nil)
    (usr || User.current).admin? || (usr || User.current).allowed_to?(:view_daily_status_reply, self.daily_status.project)
  end
end
