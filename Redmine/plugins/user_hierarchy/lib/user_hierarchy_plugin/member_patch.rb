module UserHierarchyPlugin
  module MemberPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        scope :project_members, lambda { |project|  where("members.project_id = ?",project.id).exclude_group_hierarchies_members(project) }
        scope :exclude_group_hierarchies_members, lambda { |project| 
          if project.group_hierarchies.exists?
            where("members.project_id = ?",project.id).where.not("members.user_id IN (?)", GroupHierarchy.where(project: project).pluck("user_id")) 
          else
            where("members.project_id = ?",project.id) 
          end
        }

        #Only For Existing projects
        def self.create_members_parent_hierarchy(project)
          project.members.each do |member|
            user_parent = member.user.parent
            return unless user_parent.present?
            Member.create_group_hierarchy(user_parent, project)
          end
        end

        #Only For Existing projects
        def self.create_group_hierarchy(user_parent, project)
          role = Role.find_by_name(MANAGEMENT_ROLE)
          parent_member = project.members.where(user: user_parent).first
          if parent_member.present?
            parent_member.roles << role unless parent_member.roles.include?(role)
          else
            member = Member.new(user: user_parent, project: project)
            member.roles << role
            member.save
            GroupHierarchy.create(project: project, user: user_parent)
          end

          user_parent = user_parent.parent
          return unless user_parent.present?
          Member.create_group_hierarchy(user_parent, project)
        end
      end
    end

    module InstanceMethods
    end
  end
end


