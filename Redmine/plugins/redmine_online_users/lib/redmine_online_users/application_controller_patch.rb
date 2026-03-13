module RedmineOnlineUsers
  module ApplicationControllerPatch
    def self.included(base) # :nodoc:
      # sending instance methods to module
      base.send(:include, InstanceMethods)

      base.class_eval do

        # aliasing methods if needed
        alias_method :logged_user_without_online_users=, :logged_user=
        alias_method :logged_user=, :logged_user_with_online_users=
        alias_method :user_setup_without_online_users, :user_setup
        alias_method :user_setup, :user_setup_with_online_users
        alias_method :logout_user_without_online_users, :logout_user
        alias_method :logout_user, :logout_user_with_online_users
      end
    end

    module InstanceMethods
      def user_setup_with_online_users
          Setting.check_cache
          # Find the current user
          User.current = find_current_user
          # Update last action for current user
          User.current.update_column('last_seen_at', Time.now)
          logger.info("  Current user: " + (User.current.logged? ? "#{User.current.login} (id=#{User.current.id})" : "anonymous")) if logger
      end

      def logged_user_with_online_users=(user)
        reset_session
        if user && user.is_a?(User)
          user.update_columns(last_login: true)
          User.current = user         
          start_user_session(user)
        else
          User.current = User.anonymous
          User.current.update_columns(last_login: false)
        end
      end

      def logout_user_with_online_users
        User.current.update_columns(last_login: false)
        logout_user_without_online_users
      end
    end
  end
end
