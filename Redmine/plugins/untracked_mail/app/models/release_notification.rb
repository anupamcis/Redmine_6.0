class ReleaseNotification < ActiveRecord::Base
  belongs_to :user
  belongs_to :notifiable, polymorphic: true
end
