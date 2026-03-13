class ReleaseNotification < ActiveRecord::Base
  # unloadable removed for Rails 7 compatibility
  belongs_to :user, polymorphic: true
  # belongs_to :release_update
  belongs_to :notifiable,  polymorphic: true

  before_validation :ensure_user_type

  private

  def ensure_user_type
    # default to classic Redmine User when no type is provided
    self.user_type ||= 'User'
  end
end
