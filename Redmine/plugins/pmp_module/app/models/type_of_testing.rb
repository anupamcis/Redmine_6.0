class TypeOfTesting < ActiveRecord::Base

  
  validates_presence_of :type_of_testing, :testing_method

  belongs_to :project
  # belongs_to :stakeholder_user, class_name: "User", foreign_key: "stakeholder"
  belongs_to :global_type_of_testing

  serialize :stakeholder
  # delegate :firstname, to: :stakeholder_user, prefix: true

end
