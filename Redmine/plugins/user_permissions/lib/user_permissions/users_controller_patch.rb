module UserPermissions
  module UsersControllerPatch
    def self.included(base)
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        before_action :authorize_global, if: :is_admin?
        before_action :authorize, unless: :is_admin?
      end
    end

    module ClassMethods
    end

    module InstanceMethods
    end

    private
    
    def is_admin?
      User.current.admin?
    end

  end
end
