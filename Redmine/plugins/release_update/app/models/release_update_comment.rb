class ReleaseUpdateComment < ActiveRecord::Base
  # unloadable removed for Rails 7 compatibility
  # attr_accessible 'comment', 'user_id' # Removed for Rails 5 compatibility
  # acts_as_votable # Commented out - depends on acts_as_votable gem
  belongs_to :commentable,  polymorphic: true
  has_many :release_update_comments, as: :commentable, dependent: :destroy
  belongs_to :user
end
