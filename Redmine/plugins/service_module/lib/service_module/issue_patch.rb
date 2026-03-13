module ServiceModule
  module IssuePatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_many :timesheets, :foreign_key => 'item_id'
      end
    end

    module InstanceMethods
      def total_timesheet_hours
        timesheets.sum(:filled_hrs)
      end

      def item_name
        "##{self.id} #{self.subject}"
      end
    end 
  end
end
