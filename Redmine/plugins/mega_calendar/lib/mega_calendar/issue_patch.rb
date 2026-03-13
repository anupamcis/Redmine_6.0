require_dependency "issue"

module MegaCalendar
  module IssuePatch
    def self.included(base)
      base.class_eval do
        validates_presence_of :bug_category_id, :if => Proc.new {|issue| issue.new_record? && issue.tracker_id == 1}
      end
    end
    module InstanceMethods
    end
  end
end
