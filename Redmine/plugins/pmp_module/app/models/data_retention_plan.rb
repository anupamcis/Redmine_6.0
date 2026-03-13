class DataRetentionPlan < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :record_name


end