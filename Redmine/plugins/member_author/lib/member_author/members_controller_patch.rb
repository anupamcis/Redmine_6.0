module MemberAuthor
  module MembersControllerPatch
    def self.included(base)
      base.send(:include, InstanceMethods)
      base.class_eval do
        skip_before_action :find_model_object, :only => [:change_manager, :change_client_poc]
        skip_before_action :find_project_from_association, :only => [:change_manager,:change_client_poc]
      end
    end

    module InstanceMethods
      def change_manager
        manager_role = Role.find(9)
        project_manager = @project.members.joins(:roles).where("roles.id = 9").last
        if project_manager.present?
          communication_plans = @project.communication_plans.where(responsibility_of_communication: project_manager.user.name)
          project_manager_roles = project_manager.roles - [manager_role]
          project_manager.role_ids = project_manager.set_editable_role_ids(project_manager_roles.map(&:id),project_manager.user)
        end
        new_manager = Member.find(params[:new_manager])
        new_manager.roles << manager_role
        new_manager.save
        if project_manager.present?
          project_manager.save
          if project_manager.roles.count.eql?(0)
            project_manager.destroy
          elsif project_manager.roles.count.eql?(1) && project_manager.roles.last.name == MANAGEMENT_ROLE
            GroupHierarchy.find_or_create_by(user: project_manager.user, project: @project)
          end
          communication_plans.update_all(responsibility_of_communication: new_manager.user.name) if communication_plans.present?
        end
        respond_to do |format|
          format.js { render js: "window.location='#{settings_project_path(@project, tab: "members")}'" }
        end
      end

      def change_client_poc
        old_poc = @project.members.where(is_poc: true).first
        new_poc_member = Member.find(params[:client_poc])
        new_poc_member.update_column(:is_poc, true)
        old_poc.update_column(:is_poc, false) if old_poc.present?
        old_poc.communication_plan.destroy if old_poc.present? && old_poc.communication_plan.present?
        new_poc_member.add_commuincation_plan("client")
        respond_to do |format|
          format.js { render js: "window.location='#{settings_project_path(@project, tab: "members")}'" }
          format.json { render json: { success: true, message: 'Client POC updated successfully' } }
        end
      rescue => e
        respond_to do |format|
          format.json { render json: { success: false, message: e.message }, status: :unprocessable_entity }
        end
      end
    end
  end

end
