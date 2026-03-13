class UserRoleAndResponsibility < ActiveRecord::Base

  belongs_to :project
  belongs_to :user
  belongs_to :reporting_person, class_name: "User", foreign_key: "reporting_person_id"


end
