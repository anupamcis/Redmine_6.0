
module DailyStatusProjectPatch
  def self.included(base)
    base.class_eval do
      has_many :daily_statuses
      has_one  :daily_status_setting

      def todays_status
        DailyStatus.todays_status_for self, User.current
      end
    end
  end
end

Rails.application.config.to_prepare do
  unless Project.included_modules.include?(DailyStatusProjectPatch)
    Project.send(:include, DailyStatusProjectPatch)
  end
end
