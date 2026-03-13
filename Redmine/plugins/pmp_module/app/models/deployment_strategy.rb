class DeploymentStrategy < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :release_plan, :release_date


end
