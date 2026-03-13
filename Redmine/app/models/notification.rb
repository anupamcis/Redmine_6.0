class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :project, optional: true

  # Notification types
  INACTIVITY_TYPES = [
    'inactivity_1_day',
    'inactivity_2_days',
    'inactivity_1_week',
    'inactivity_15_days',
    'inactivity_1_month',
    'inactivity_1_year',
    'inactivity_no_activity'
  ].freeze

  validates :title, presence: true
  validates :message, presence: true
  validates :notification_type, presence: true
  validates :user_id, presence: true

  scope :unread, -> { where(read: false) }
  scope :read, -> { where(read: true) }
  scope :recent, -> { order(created_at: :desc) }

  # Store days_inactive for template rendering
  attr_accessor :days_inactive

  # Create inactivity notification for project manager
  def self.create_inactivity_notification(project, inactivity_category, days_inactive)
    return unless project
    
    # Get project manager
    project_manager = get_project_manager(project)
    return unless project_manager
    
    # Check if notification already exists for this project and category
    existing = Notification.where(
      user_id: project_manager.id,
      project_id: project.id,
      notification_type: inactivity_category,
      read: false
    ).where('created_at > ?', 24.hours.ago).first

    return if existing # Don't create duplicate notifications within 24 hours

    title = "Project Inactivity Alert: #{project.name}"
    message = case inactivity_category
             when 'inactivity_1_day'
               "Project '#{project.name}' has been inactive for 1 day."
             when 'inactivity_2_days'
               "Project '#{project.name}' has been inactive for 2 days."
             when 'inactivity_1_week'
               "Project '#{project.name}' has been inactive for #{days_inactive} days (1 week+)."
             when 'inactivity_15_days'
               "Project '#{project.name}' has been inactive for #{days_inactive} days (15+ days)."
             when 'inactivity_1_month'
               "Project '#{project.name}' has been inactive for #{days_inactive} days (1 month+)."
             when 'inactivity_1_year'
               "Project '#{project.name}' has been inactive for #{days_inactive} days (1 year+)."
             when 'inactivity_no_activity'
               "Project '#{project.name}' has no recorded activity since creation."
             else
               "Project '#{project.name}' has been inactive for #{days_inactive} days."
             end

    notification = Notification.new(
      user_id: project_manager.id,
      project_id: project.id,
      title: title,
      message: message,
      notification_type: inactivity_category
    )
    notification.days_inactive = days_inactive
    notification.save!

    # Send email notification
    NotificationMailer.inactivity_notification(notification).deliver_later

    notification
  end

  # Get project manager for a project
  def self.get_project_manager(project)
    return nil unless project

    # Find user with "Project Manager" role in project
    membership = project.memberships.joins(:roles)
                        .where("LOWER(roles.name) LIKE ?", "%project manager%")
                        .first

    membership&.user
  end
end

