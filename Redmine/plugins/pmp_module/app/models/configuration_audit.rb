class ConfigurationAudit < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :cm_audit, :date_or_event, :auditor


end
