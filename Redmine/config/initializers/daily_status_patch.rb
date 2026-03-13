# Daily Status Project Patch
Rails.application.config.to_prepare do
  unless Project.instance_methods.include?(:daily_statuses)
    Project.class_eval do
      has_many :daily_statuses
      has_one  :daily_status_setting

      def todays_status
        DailyStatus.todays_status_for self, User.current
      end
    end
  end
end
