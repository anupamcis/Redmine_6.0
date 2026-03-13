class NotificationEmailTemplate < ApplicationRecord
  # Template types for inactivity notifications
  TEMPLATE_TYPES = [
    'inactivity_1_day',
    'inactivity_2_days',
    'inactivity_1_week',
    'inactivity_15_days',
    'inactivity_1_month',
    'inactivity_1_year',
    'inactivity_no_activity',
    'default' # Default template if specific one doesn't exist
  ].freeze

  validates :name, presence: true
  validates :template_type, presence: true, inclusion: { in: TEMPLATE_TYPES }
  validates :subject, presence: true

  scope :active, -> { where(is_active: true) }
  scope :for_type, ->(type) { where(template_type: type) }

  # Get template for a specific type, fallback to default
  def self.get_template(template_type)
    template = active.for_type(template_type).first
    template ||= active.for_type('default').first
    template
  end

  # Available variables for template substitution
  # {{project_name}} - Project name
  # {{project_identifier}} - Project identifier
  # {{project_url}} - Project URL
  # {{days_inactive}} - Number of days inactive
  # {{user_name}} - Project manager name
  # {{user_email}} - Project manager email
  def render(notification, project, user)
    vars = {
      'project_name' => project.name,
      'project_identifier' => project.identifier,
      'project_url' => Rails.application.routes.url_helpers.project_url(project.identifier, host: Setting.host_name, protocol: Setting.protocol),
      'days_inactive' => notification.days_inactive || 0,
      'user_name' => user.name,
      'user_email' => user.mail,
      'notification_date' => notification.created_at.strftime('%B %d, %Y')
    }

    rendered_subject = subject.dup
    rendered_html = body_html ? body_html.dup : ''
    rendered_text = body_text ? body_text.dup : ''

    vars.each do |key, value|
      placeholder = "{{#{key}}}"
      rendered_subject.gsub!(placeholder, value.to_s)
      rendered_html.gsub!(placeholder, value.to_s) if rendered_html.present?
      rendered_text.gsub!(placeholder, value.to_s) if rendered_text.present?
    end

    {
      subject: rendered_subject,
      body_html: rendered_html,
      body_text: rendered_text
    }
  end
end

