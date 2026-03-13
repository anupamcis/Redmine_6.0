class CoordinationPlan < ActiveRecord::Base

  belongs_to :project
  belongs_to :planable, polymorphic: true
  validates_presence_of :stackholder_name, :coordination_need


end
