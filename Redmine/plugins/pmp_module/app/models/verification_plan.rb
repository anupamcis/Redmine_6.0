class VerificationPlan < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :sdlc_phase, :work_product

end