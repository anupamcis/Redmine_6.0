class RaciRole < ActiveRecord::Base

  validates_presence_of :name
  has_many :responsibility_assignment_matrices, foreign_key: "role_id"

end
