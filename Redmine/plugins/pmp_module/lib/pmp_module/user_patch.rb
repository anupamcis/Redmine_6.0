module PmpModule
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_and_belongs_to_many :attended_training, class_name: 'TrainingNeed'
        has_and_belongs_to_many :staff_needs, class_name: 'StaffNeed'
        has_many :responsibility_assignment_matrices
        has_many :hardware_and_software_profiles
        has_many :user_role_and_responsibilities

      end
    end

    module InstanceMethods
      def is_client?
        (company.present? && company.default_company == false)
      end

      def project_role_and_responsibility(project_id)
       user_role_and_responsibilities.find_by(project_id: project_id)
      end

      def ancestors
        node, nodes = self, []
        nodes << node = node.parent while node.parent
        nodes
      end
    end

  end
end
