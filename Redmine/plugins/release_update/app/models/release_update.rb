class ReleaseUpdate < ActiveRecord::Base
  # unloadable removed for Rails 7 compatibility
  # attr_accessible 'title', 'description', 'user_id' # Removed for Rails 5 compatibility
  # acts_as_votable # Commented out - depends on acts_as_votable gem
  validates_presence_of :title
  validates_length_of :title, maximum: 50
  has_many :release_update_comments, as: :commentable, dependent: :destroy
  belongs_to :user
  has_many :release_notifications, as: :notifiable, dependent: :destroy
end
