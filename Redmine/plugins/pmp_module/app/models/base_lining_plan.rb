class BaseLiningPlan < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :when_to_baseline, :trigger_for_baseline, :what_to_baseline

end
