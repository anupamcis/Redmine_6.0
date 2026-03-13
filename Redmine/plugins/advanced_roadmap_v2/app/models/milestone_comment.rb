class MilestoneComment < ActiveRecord::Base

  belongs_to :milestone
  belongs_to :author, :class_name => 'User', :foreign_key => 'author_id'

  validates_presence_of :comment

  # #attr_accessible :milestone_id, :comment, :changed_date, :previous_date, :author_id,
  # :field_name # Removed for Rails 5 compatibility
end
