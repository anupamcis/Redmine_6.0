class Lesson < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :sdlc_phase, :description, :lesson_learnt_type

end
