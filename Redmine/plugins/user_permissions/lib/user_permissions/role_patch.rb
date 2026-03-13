module UserPermissions
  module RolePatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        
      end
    end

    module InstanceMethods
      def has_user_management_permissions?
        self.permissions.include?(:show_users || :add_users || :edit_users || :destroy_users || :index_users || :lock_users)
      end
    end
  end
end
