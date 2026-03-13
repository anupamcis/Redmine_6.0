class RiskMitigationPlan < ActiveRecord::Base
 

  validates_presence_of :date_occurred, :risk_id, :assigned_to

  belongs_to :risk
  belongs_to :assigned_user, :class_name => "User", :foreign_key => "assigned_to"

  delegate :firstname, to: :assigned_user, prefix: true
  delegate :risk_description, to: :risk, prefix: true

end
