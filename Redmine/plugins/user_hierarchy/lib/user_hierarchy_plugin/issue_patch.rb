module UserHierarchyPlugin
  module IssuePatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        alias_method :assignable_users_without_user_hierarchies, :assignable_users
        alias_method :assignable_users, :assignable_users_with_user_hierarchies
        alias_method :attachments_editable_without_user_hierarchies?, :attachments_editable?
        alias_method :attachments_editable?, :attachments_editable_with_user_hierarchies?
      end
    end

    module InstanceMethods
      def assignable_users_with_user_hierarchies
        remove_users = Group.where(lastname: DEFAULT_MEMBER_GROUP).first.try(:users)
        users = project.assignable_users.to_a
        users << author if author && author.active?
        users << assigned_to if assigned_to
        remove_users.present? ? ((users - remove_users).uniq.sort) : users.uniq.sort
      end

      def attachments_editable_with_user_hierarchies?(user=User.current)
        (user || User.current).admin? || (user || User.current).allowed_to?(:edit_attachments, self.project)
      end
    end
  end
end
