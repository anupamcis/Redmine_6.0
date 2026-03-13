class HardwareSoftwareSupliedByClient < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :client_supplied_item

end
