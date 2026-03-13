class ProjectMonitoringReview < ActiveRecord::Base

  belongs_to :project
  belongs_to :milestone
  validates_presence_of :milestone_id, :frequency


  delegate :name, :to => :milestone, :allow_nil => true

end
