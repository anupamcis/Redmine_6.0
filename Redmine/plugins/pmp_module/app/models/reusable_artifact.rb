class ReusableArtifact < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :reusable_component_name, :short_description


end
