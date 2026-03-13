class CustomerSpecificSecurityRequirement < ActiveRecord::Base

  belongs_to :project
  
  validates_presence_of :security_requirement, :remarks

end
