module UserHierarchyPlugin
  module IssuesHelperPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        alias_method :users_for_new_issue_watchers_without_user_hierarchies, :users_for_new_issue_watchers
        alias_method :users_for_new_issue_watchers, :users_for_new_issue_watchers_with_user_hierarchies
      end
    end

    module InstanceMethods
      def users_for_new_issue_watchers_with_user_hierarchies(issue)
        default_group_users = Group.where(lastname: DEFAULT_MEMBER_GROUP).first.try(:users).to_a
        if @project.group_hierarchies.exists?
          @project.group_hierarchies.each do |group_hierarchy|
            unless default_group_users.include?(group_hierarchy.user)
              default_group_users << group_hierarchy.user
            end
          end
        end
        users = issue.watcher_users
        users = (users + issue.project.users.sort).uniq
        default_group_users.present? ? (users - default_group_users) : users
      end
    end
  end
end
