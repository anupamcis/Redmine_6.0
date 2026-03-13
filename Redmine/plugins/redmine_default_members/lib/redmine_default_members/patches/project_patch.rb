module RedmineDefaultMembers
  module Patches
    module ProjectPatch
      def self.included(base)
        base.class_eval do
          after_create :add_default_members_from_settings
        end
      end

      private

      # Adds configured default members (users from configured groups with configured roles)
      # to the project right after it is created.
      def add_default_members_from_settings
        settings = Setting.plugin_redmine_default_members
        return unless settings.is_a?(Hash)

        settings.each do |key, default_members|
          next if key.to_s == 'template'
          # Support ActionController::Parameters or Hash
          next unless default_members.respond_to?(:[]) && default_members.respond_to?(:keys)

          group_name = default_members[:group] || default_members['group']
          role_ids   = default_members[:roles] || default_members['roles']
          next if group_name.to_s.strip.empty?
          next if role_ids.nil? || role_ids.empty?

          group = Group.find_by_lastname(group_name)
          # If user configured an id instead of name
          group ||= Group.find_by(id: group_name.to_i) if group_name.to_s =~ /^\d+$/
          next unless group

          roles = Role.where(id: Array(role_ids).map(&:to_i)).to_a
          # Fallback by role names if ids not found
          if roles.empty?
            roles = Role.where(name: Array(role_ids).map(&:to_s)).to_a
          end
          next if roles.empty?

          # In some Redmine versions User.in_group may not exist; join through groups_users
          users = if User.respond_to?(:in_group)
                    User.active.in_group(group)
                  else
                    User.active.joins("INNER JOIN groups_users ON groups_users.user_id = users.id")
                        .where("groups_users.group_id = ?", group.id)
                  end
          users.each do |user|
            next if user.anonymous?

            member = Member.find_or_initialize_by(user: user, project: self)
            member.roles = (member.roles + roles).uniq
            member.save!
          end
        end
      end
    end
  end
end

unless Project.included_modules.include?(RedmineDefaultMembers::Patches::ProjectPatch)
  Project.send(:include, RedmineDefaultMembers::Patches::ProjectPatch)
end


