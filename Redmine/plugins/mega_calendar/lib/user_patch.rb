module MegaCalendar
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_many :holidays
      end
    end

    module InstanceMethods
    end
  end
end

# Zeitwerk expects this file (lib/user_patch.rb) to define ::UserPatch.
# Provide a thin delegator that reuses MegaCalendar::UserPatch behavior.
module UserPatch
  def self.included(base)
    MegaCalendar::UserPatch.included(base)
  end
end

