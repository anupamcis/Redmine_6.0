class PmpAdminConfiguration < ActiveRecord::Base


  validates :skill_requirement_cale_differnce, :risk_mitigation_difference, :risk_contingency_difference, numericality: true
end
