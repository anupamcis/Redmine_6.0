# Ensure UntrackedMail plugin patches are applied
Rails.application.config.to_prepare do
  begin
    # Add missing release_notifications association to User model for UntrackedMail compatibility
    unless User.reflect_on_association(:release_notifications)
      User.class_eval do
        has_many :release_notifications, as: :user, dependent: :destroy
      end
      Rails.logger.info "Added release_notifications association to User model for UntrackedMail compatibility"
    end
  rescue => e
    Rails.logger.error "Failed to apply UntrackedMail patches: #{e.class}: #{e.message}"
  end
end
