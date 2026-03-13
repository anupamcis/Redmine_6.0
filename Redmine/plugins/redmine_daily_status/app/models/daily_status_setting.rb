class DailyStatusSetting < ActiveRecord::Base


  belongs_to :project
  belongs_to :user
  acts_as_watchable DailyStatusSetting

  # TODO : find out hook when a project adds the module Daily Status from its settings
end
