module UserHierarchyPlugin
  module PrincipalPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        scope :project_members, lambda { |project| joins(:members).where("members.project_id = ?",project.id).exclude_group_hierarchies_members(project) }
        
        scope :exclude_group_hierarchies_members, lambda { |project|
          if project.group_hierarchies.exists?
            joins(:members).where("members.project_id = ?",project.id).where.not("members.user_id IN (?)", GroupHierarchy.where(project: project).pluck("user_id"))
          else
            joins(:members).where("members.project_id = ?",project.id)
          end
        }
      end
    end

    module InstanceMethods
    end
  end
end
