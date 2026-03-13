module MemberAuthor
  module MemberPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        # safe_attributes 'author_id'
        belongs_to :author, :class_name => 'User', :foreign_key => 'author_id'
        has_one :staff_need, dependent: :nullify
        has_one :communication_plan, :class_name => "CommunicationPlan",
                :foreign_key => 'stackholder_id', :dependent => :destroy

        if respond_to?(:acts_as_event)
          acts_as_event :datetime => :created_on,
                  :description => Proc.new { |o| o.user.name + (o.master_department.present? ? "(" + (o.master_department.name).to_s + ")" : "") + " added as a member in " + o.project.name},
                  :title => Proc.new { |o| o.user.name}
        end

        if respond_to?(:acts_as_activity_provider)
          acts_as_activity_provider :timestamp => "#{table_name}.created_on",
                              :scope => joins(:project, :author).preload(:project, :author),
                              :author_key => :author_id
        end

        after_save :add_member_author
        belongs_to :master_department
        alias_method :deletable_without_member_author?, :deletable?
        alias_method :deletable?, :deletable_with_member_author?
      end
    end

    module InstanceMethods
      def deletable_with_member_author?(user=User.current)
        if any_inherited_role? || roles.try(:ids).include?(9)
          false
        else
          roles & user.managed_roles(project) == roles
        end
      end

      def add_client_poc
        unless project.members.where(is_poc: true).present?
          self.update_column('is_poc', true)
          add_commuincation_plan("client")
          matrix_type = project.try(:project_responsibility_assignment_matrix_filter).try(:matrix_type)
          if matrix_type.present? && matrix_type == "Role"
            client_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "Client POC").id)
            client_raci.update_attributes(responsibility: CLIENT_RACI_REPONSBILITIES )
          end
        end
      end

      def add_commuincation_plan(type)
        manager = project.members.joins(:roles).where("roles.id = ? ", 9).first
        if type == "client"
          communication_plan = CommunicationPlan.find_or_initialize_by(username: user.login, project_id: project.id)
          communication_plan.add_or_update(self, manager, "client")
        else
          roles = self.roles.where.not("name like '%CIS%' or name like '%Manager%'").map(&:name).join(", ")
          if roles.present? && !manager.eql?(self)
            communication_plan = CommunicationPlan.find_or_initialize_by(username: user.login, project_id: project.id)
            communication_plan.add_or_update(self, manager, "member")
          end
        end
      end
    end

    private
    def add_member_author
      self.update_column('author_id', User.current.id)
      add_client_poc unless user.company.default_company
      add_staff_need if user.company.default_company
      add_raci_chart if user.company.default_company
    end

    def add_staff_need
      self.reload
      roles = self.roles.where.not("name like '%CIS%'").map(&:name).join(", ")
      if roles.present?
        attendees = [user]
        experience = user.employee.present? ? user.employee.experience : 0
        # experience = ((experience.to_i/12) + (experience.to_i%12))
        to_date = project.services.present? ? project.services.map(&:service_date_to).max : nil
        staff_need = StaffNeed.find_or_initialize_by(username: user.login, project_id: project.id)
        staff_need.add_or_update(attendees, roles, experience, to_date, id)
      end
      self.add_commuincation_plan("member")
    end

    def add_raci_chart
      role_names = self.roles.map(&:name)
      matrix_type = project.try(:project_responsibility_assignment_matrix_filter).try(:matrix_type)
      matrix_type = matrix_type.nil? ? "Role" : matrix_type
      if role_names.present? &&  (matrix_type.present? && matrix_type == "Role")
        role_names.each do |role_name|
          if role_name.eql?("IT Engineer") || role_name.eql?("IT Manager")
            self.send(:it_raci) if self.class.private_method_defined?(:it_raci)
          elsif role_name.eql?("Account Manager(BDE)") || role_name.eql?("Account Manager(BTL)") || role_name.eql?("Account Manager(BDM)")
            self.send(:account_manager_raci) if self.class.private_method_defined?(:account_manager_raci)
          else
            method_name = role_name.downcase.gsub(/\s/,"_") + "_raci"
            self.send(method_name.to_sym) if self.class.private_method_defined?(method_name.to_sym)
          end
        end
      end
    end

    def project_manager_raci
      pm_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "Project Manager").id)
      pm_raci.update_attributes({responsibility: PROJECT_MANAGER_RACI_REPONSBILITIES })
      dm_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "Delivery Manager").id)
      dm_raci.update_attributes({responsibility: DELIVERY_MANAGER_RACI_REPONSBILITIES })
      process_manager_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "Process Manager").id)
      process_manager_raci.update_attributes({responsibility: PROCESS_MANAGER_RACI_REPONSBILITIES })
    end

    def desigener_raci
      ui_ux_m_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "UI/UX Manager").id)
      ui_ux_m_raci.update_attributes({responsibility: UI_UX_MANAGER_RACI_REPONSBILITIES }) if ui_ux_m_raci.new_record?
    end

    def developer_raci
      team_member_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "Team Members").id)
      team_member_raci.update_attributes({responsibility: TEAM_MEMBER_RACI_REPONSBILITIES}) if team_member_raci.new_record?
    end

    def account_manager_raci
      bd_dep_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "BD Manager").id)
      bd_dep_raci.update_attributes({responsibility: ACCOUNT_MANAGER_RACI_REPONSBILITIES } ) if bd_dep_raci.new_record?
    end

    def it_raci
      it_dep_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "IT Manager").id)
      it_dep_raci.update_attributes({responsibility: IT_MANAGER_RACI_REPONSBILITIES } ) if it_dep_raci.new_record?
    end

    def qa_raci
      qa_m_raci = ResponsibilityAssignmentMatrix.find_or_initialize_by(project_id: project.id, role_id: RaciRole.find_by(name: "Quality Manager").id)
      qa_m_raci.update_attributes(responsibility: QA_RACI_REPONSBILITIES ) if qa_m_raci.new_record?
    end
  end
end
