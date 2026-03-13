class ConfigurationItem < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :phase, :configuration_item, :storage_location

end
