class PmpTabAndLockConfiguration < ActiveRecord::Base

  has_many :project_processes, :dependent => :destroy

  validates_presence_of :tab_name

  serialize :project_types
end
