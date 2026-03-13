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

