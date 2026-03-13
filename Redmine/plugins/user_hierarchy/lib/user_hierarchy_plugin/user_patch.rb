module UserHierarchyPlugin
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)
      base.class_eval do
        after_create :add_users_parent_hierarchy

        has_one :parent_child_relationship,
               :class_name => "UserHierarchy",
               :foreign_key => :child_id,
               :dependent => :destroy

        has_one  :parent,
                 :through => :parent_child_relationship,
                 :source => :parent

        has_many  :child_parent_relationships,
                  :class_name => "UserHierarchy",
                  :foreign_key => :parent_id,
                  :dependent => :destroy

        has_many  :children,
                  :through => :child_parent_relationships,
                  :source => :child

        has_many :group_hierarchies

        belongs_to :employee
      end

      def add_users_parent_hierarchy
        employee = Employee.find_by_email(self.mail)

        if employee.present?
          self.update(employee: employee)
          user_parent = Employee.find_by_employee_id(employee.parent_employee_id).try(:user)
          UserHierarchy.find_or_create_by(child_id: id, parent_id: user_parent.id) if user_parent.present?
        end
      end
    end

    module InstanceMethods
      def self_and_descendents
        # Get all users in the hierarchy tree starting from this user
        # This includes the user itself and all their descendants
        user_ids = [self.id]
        
        # Get all direct and indirect children
        children_ids = children.pluck(:id)
        while children_ids.any?
          user_ids += children_ids
          children_ids = UserHierarchy.where(parent_id: children_ids).joins(:child).pluck('users.id')
        end
        
        User.where(id: user_ids.uniq)
      end
    end
  end
end
