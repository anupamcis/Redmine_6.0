module UserPermissions
  module UsersHelperPatch
    def self.included(base)
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        alias_method :change_status_link_without_user_permissions, :change_status_link
        alias_method :change_status_link, :change_status_link_with_user_permissions
      end
    end

    module ClassMethods
    end

    module InstanceMethods
      def change_status_link_with_user_permissions(user) 
        url = {:controller => 'users', :action => 'update', :id => user, :page => params[:page], :status => params[:status], :tab => nil}
        if (User.current.allowed_to?(:edit_users, nil, :global => true) && User.current.allowed_to?(:lock_users, nil, :global => true)) || User.current.admin?
          if user.locked?
            link_to l(:button_unlock), url.merge(:user => {:status => User::STATUS_ACTIVE}), :method => :put, :class => 'icon icon-unlock'
          elsif user.registered?
            link_to l(:button_activate), url.merge(:user => {:status => User::STATUS_ACTIVE}), :method => :put, :class => 'icon icon-unlock'
          elsif user != User.current
            link_to l(:button_lock), url.merge(:user => {:status => User::STATUS_LOCKED}), :method => :put, :class => 'icon icon-lock'
          end
        end
      end
    end

  end
end
