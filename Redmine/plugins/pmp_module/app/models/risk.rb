class Risk < ActiveRecord::Base

  belongs_to :project
  
  has_many :risk_mitigation_plans

  validates_presence_of :risk_description, :risk_category, :source,
  :probability, :impact
  validates_presence_of :mitigation_plan, :if => :is_mitigation_plan_required?
  validates_presence_of :contingency_plan, :if => :is_contingency_plan_required?



  def is_contingency_plan_required?
    admin_config = PmpAdminConfiguration.first
    if exposure.present? && admin_config.present?
      exposure >= admin_config.risk_contingency_difference
    end
  end

  def is_mitigation_plan_required?
    admin_config = PmpAdminConfiguration.first
    if exposure.present? && admin_config.present?
      exposure >= admin_config.risk_mitigation_difference
    end
  end

  def send_mail
    PmpModule::HardwareSoftwareMailer.risk_mail(self).deliver
  end

end