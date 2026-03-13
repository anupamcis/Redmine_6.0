module RedmineOnlineUsers
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        safe_attributes 'last_login'
      end
    end

    module InstanceMethods
    end
  end
end
