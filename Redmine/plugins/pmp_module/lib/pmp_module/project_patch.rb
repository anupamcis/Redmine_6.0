module PmpModule
  module ProjectPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_many :acronyms_and_glossaries, :dependent => :destroy
        has_many :customer_specific_security_requirements, :dependent => :destroy
        has_many :standard_and_guidlines, :dependent => :destroy
        has_many :deployment_strategies, :dependent => :destroy
        has_many :project_monitoring_reviews, :dependent => :destroy
        has_many :communication_plans, :dependent => :destroy
        has_many :coordination_plans, :dependent => :destroy
        has_many :verification_plans, :dependent => :destroy
        has_many :type_of_testings, :dependent => :destroy
        has_many :stakeholder_management_plans, :dependent => :destroy
        has_many :training_needs, :dependent => :destroy
        has_many :knowledge_and_skill_requirements, :dependent => :destroy
        has_many :staff_needs, :dependent => :destroy
        has_many :user_role_and_responsibilities, :dependent => :destroy
        has_many :reusable_artifacts, :dependent => :destroy
        has_many :lessons, :dependent => :destroy
        has_many :project_folder_structures, :dependent => :destroy
        has_many :configuration_items, :dependent => :destroy
        has_many :back_up_details, :dependent => :destroy
        has_many :project_processes, :dependent => :destroy
        has_many :responsibility_assignment_matrices, :dependent => :destroy
        has_one  :project_responsibility_assignment_matrix_filter, :dependent => :destroy
        has_many :configuration_audits, :dependent => :destroy
        has_many :data_retention_plans, :dependent => :destroy
        has_many :base_lining_plans, :dependent => :destroy
        has_many :hardware_software_suplied_by_clients, :dependent => :destroy
        has_many :hardware_software_plans
        has_many :risks, :dependent => :destroy
        has_many :client_specific_credentials, :dependent => :destroy
        has_many :hardware_and_software_profiles, :dependent => :destroy
      end
    end

    module InstanceMethods
      def lesson_type_count(type)
        lessons.where('lower(lesson_learnt_type) = ?', type.downcase).count
      end

      def risk_count(type)
        if type == "identified"
          risks.count
        elsif type == "occurred"
          risks.joins(:risk_mitigation_plans).where("risk_mitigation_plans.date_occurred is not null").count
        else
          risks.joins(:risk_mitigation_plans).where("risk_mitigation_plans.closed_date is not null").count
        end
      end

      def client_poc_for_project
        members.where(is_poc: true).first.try(:user).try(:name)
      end

      def is_manager_present?(role)
        members.joins(:roles).where("roles.id =? ",9).present? && role.id.eql?(9)
      end
    end

  end
end
