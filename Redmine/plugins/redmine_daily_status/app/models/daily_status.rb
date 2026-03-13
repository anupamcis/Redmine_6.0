require_relative '../../lib/daily_status_mailer'
class DailyStatus < ActiveRecord::Base
  default_scope {order('created_at desc')}
  belongs_to :project
  belongs_to :author, :class_name => 'User', :foreign_key => 'author_id'
  has_many :daily_status_replies
  has_many :release_notifications, as: :notifiable, dependent: :destroy
  validates_presence_of :content, :message => "^Status message cannot be blank"
  validate :validate_invalid_user

  #attr_accessible :project_id, :content, :author_id, :is_email_sent, :subject, :signature

  acts_as_attachable

  def setting
    project.try(:daily_status_setting) or project.try(:create_daily_status_setting, user_id: User.current.try(:id))
  end


  def validate_invalid_user
    # Skip validation if project is not set (will be caught by presence validation)
    return unless project.present?
    
    # Get project members
    project_member_ids = project.members.pluck("user_id")
    
    # Check if author is a project member (if author is different from current user)
    if self.author != User.current && !project_member_ids.include?(self.author.id)
      self.errors.add(:base, "Invalid user")
      return
    end
    
    # Check if current user is a project member
    unless project_member_ids.include?(User.current.id)
      self.errors.add(:base, "Invalid user")
    end
  end

  acts_as_event :datetime => :created_at,
                :description => Proc.new { |o| o.author.name + o.mail_drafted_or_sent + " daily status in " + o.project.name},
                :title => :subject,
                :url =>Proc.new {
                                  |o|
                                  {
                                      :controller => 'daily_statuses',
                                      :action => 'index',
                                      :project_id => o.project ,
                                      :day => (o.created_at.to_date).to_s
                                  }
                                }

  acts_as_activity_provider :timestamp => "#{table_name}.created_at",
                            :scope => joins(:project, :author).preload(:project, :author).
                                      where("#{table_name}.is_email_sent= ?",true),
                            :author_key => :author_id,
                            :permission => :view_daily_status
                            

  def email(signature, subject)
    recipients = []
    if setting.watchers.any?
      recipients = setting.watchers.includes(:user).map(&:user).compact
    else
      recipients = project.members.includes(:user).map(&:user).compact
    end
    recipients << User.current
    recipients = recipients.compact.uniq
    recipients.each do |user|
      next unless user&.mail.present?
      DailyStatusMailer.send_daily_status(user, self, subject, signature).deliver
    end
  end

  def daily_status_subject
    date = self.created_at.nil? ? Time.now.strftime('%d %b %y') : self.created_at.strftime('%d %b %y')
    "[#{project.name} ##{self.id}] - #{date} - Status update "
  end

  def self.on time, project_id
    where(:project_id => project_id).where("created_at = ? ", time).first
  end

  def self.ago number_of, project_id
    #on Time.now-number_of.days, project_id
    on Date.today-number_of.days, project_id
  end

  def self.todays_status_for project, user
    where("project_id = ? AND author_id = ? ", project.id, user.id).where("created_at >= ? and created_at <= ?", Date.today.beginning_of_day, Date.today.end_of_day).first
  end

  def replies_count
    unless daily_status_replies.nil?
      daily_status_replies.count
    else
      0
    end
  end

  def set_watchers(user_ids)
    setting.watchers.delete_all
    user_ids.each do |user_id|
      setting.watchers.create(user_id: user_id)
    end
  end

  def set_subject_and_mail_sent(subject)
    update_column(:is_email_sent, true)
    extra = subject.blank? ? '' : ' - ' + subject.strip
    update_column(:subject, daily_status_subject + extra)
  end

  def self.todays_mail_sent? project
    daily_status = project.todays_status
    daily_status.is_email_sent if daily_status
  end

  def attachments_visible?(usr=nil)
    if User.current.company_id.nil? || User.current.company.default_company
      (usr || User.current).admin? || (usr || User.current).allowed_to?(:view_daily_status, self.project)
    else
      (usr || User.current).allowed_to?(:download_attachment, self.project)
    end
  end

  def attachments_editable?(usr=nil)
    (usr || User.current).admin? || (usr || User.current).allowed_to?(:edit_attachments, self.project)
  end

  def attachments_deletable?(usr=nil)
    (usr || User.current).admin? || (usr || User.current).allowed_to?(:view_daily_status, self.project)
  end

  def mail_drafted_or_sent
    is_email_sent ? ' sent' : ' drafted'
  end
end
