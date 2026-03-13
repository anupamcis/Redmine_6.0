class ProjectProcess < ActiveRecord::Base

  belongs_to :project
  belongs_to :pmp_tab_and_lock_configuration


end
