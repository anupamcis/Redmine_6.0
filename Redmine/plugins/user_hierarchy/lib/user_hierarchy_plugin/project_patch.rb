module UserHierarchyPlugin
  MANAGEMENT_ROLE = 'Management' unless const_defined?(:MANAGEMENT_ROLE)
  DEFAULT_MEMBER_GROUP = 'Default Member' unless const_defined?(:DEFAULT_MEMBER_GROUP)
  module ProjectPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        has_many :group_hierarchies, :dependent => :destroy
        alias_method :assignable_users_without_user_hierarchies, :assignable_users
        alias_method :assignable_users, :assignable_users_with_user_hierarchies
        alias_method :principals_by_role_without_user_hierarchies, :principals_by_role
        alias_method :principals_by_role, :principals_by_role_with_user_hierarchies
        alias_method :principals_without_user_hierarchies, :principals
        alias_method :principals, :principals_with_user_hierarchies
        alias_method :users_without_user_hierarchies, :users
        alias_method :users, :users_with_user_hierarchies

        def self.find_project_owner(user, project)
          project.add_user_parents_in_group_hierarchy(user)
        end

      end
    end

    module InstanceMethods
      def assignable_users_with_user_hierarchies
        remove_users = Group.where(lastname: DEFAULT_MEMBER_GROUP).first.try(:users)
        types = ['User']
        types << 'Group' if Setting.issue_group_assignment?

        base_scope = Principal.
          active.
          joins(:members => :roles).
          where(:type => types, :members => {:project_id => id}, :roles => {:assignable => true})
        
        scope = base_scope.project_members(self)

        # Normalize to an Array without forcing Array methods on relations prematurely
        if scope.respond_to?(:distinct)
          rel = scope
          rel = rel.distinct if rel.respond_to?(:distinct)
          rel = rel.sorted   if rel.respond_to?(:sorted)
          users = rel.to_a
        else
          users = scope.to_a.uniq.sort
        end

        users = (users - remove_users) if remove_users.present?
        users.sort
      end

      def principals_by_role_with_user_hierarchies
        begin
          # Try to use the custom scope, but fallback to regular members if it fails
          members = if self.respond_to?(:members) && self.members.respond_to?(:exclude_group_hierarchies_members)
                      self.members.exclude_group_hierarchies_members(self).includes(:user, :roles)
                    else
                      self.members.includes(:user, :roles)
                    end
          
          result = members.inject({}) do |h, m|
            next h unless m.roles.present?
            m.roles.each do |r|
              next if r.name == MANAGEMENT_ROLE
              principal = m.user
              next unless principal.present?
              (h[r] ||= []) << principal
            end
            h
          end
          
          # Ensure we always return a hash, even if empty
          result.is_a?(Hash) ? result : {}
        rescue => e
          Rails.logger.error "Error in principals_by_role_with_user_hierarchies: #{e.message}"
          # Fallback to original method if there's an error
          begin
            principals_by_role_without_user_hierarchies || {}
          rescue
            {}
          end
        end
      end

      def principals_with_user_hierarchies
        @principals ||= Principal.active.project_members(self).uniq
      end

      def users_with_user_hierarchies
        @users ||= User.active.project_members(project).uniq
      end

      def add_user_parents_in_group_hierarchy(user)
        user_parent = user.parent
        return unless user_parent.present?

        self.check_parent_users_parent(user_parent)
      end

      def add_user_parents_as_project_member(user_parent)
        role = Role.where(name: MANAGEMENT_ROLE)
        parent_member = self.members.where(user: user_parent).first
        if parent_member.present?
          parent_member.roles << role unless parent_member.roles.include?(role)
        else
          member = Member.new(user: user_parent, project: self)
          member.roles = role
          member.save
          GroupHierarchy.create(project: self, user: user_parent)
        end
      end

      def check_parent_users_parent(user_parent)
        puts "CHCECK USER PARENT #{user_parent}"
        self.add_user_parents_as_project_member(user_parent)
        user_parent = user_parent.parent
        return unless user_parent.present?
        self.check_parent_users_parent(user_parent)
      end
    end
  end
end
