module UserHierarchyPlugin
  module MembersControllerPatch
    def self.included(base)
      base.class_eval do
        def create_with_plugin
          @members = []
          if params[:membership]
            user_ids = Array.wrap(params[:membership][:user_id] || params[:membership][:user_ids])
            user_ids << nil if user_ids.empty?
            user_ids.each do |user_id|
              member = Member.find_or_initialize_by(:project => @project, :user_id => user_id)
              if member.new_record?
                member.set_editable_role_ids(params[:membership][:role_ids])
              else
                all_roles = (params[:membership][:role_ids].present? && member.roles.present?) ? (params[:membership][:role_ids] + member.roles.map(&:id).map(&:to_s)).uniq  : []
                if member.roles.size == 1 && member.roles.first.name == MANAGEMENT_ROLE
                  member.update(created_on: Time.now)
                end
                member.set_editable_role_ids(all_roles)

                if all_roles.count == 1 && Role.find(all_roles.first).name == MANAGEMENT_ROLE
                  group_hierarchy = GroupHierarchy.find_or_initialize_by(project: @project, user: member.user)
                  group_hierarchy.save if group_hierarchy.new_record?
                elsif all_roles.count > 1
                  group_hierarchy = @project.group_hierarchies.where(user: member.user).first
                  group_hierarchy.destroy if group_hierarchy.present?
                end

              end
              member.update(master_department_id: params[:master_department_id].to_i) unless member.frozen?
              @members << member
            end

            @project.members << @members
            check_and_add_user_parent_as_member(user_ids) if user_ids.compact.present?
          end

          respond_to do |format|
            format.html { redirect_to_settings_in_projects }
            format.js {
              @members = @members
              @member = Member.new
            }
            format.api {
              @member = @members.first
              if @member.valid?
                render :action => 'show', :status => :created, :location => membership_url(@member)
              else
                render_validation_errors(@member)
              end
            }
          end
        end

        def destroy_with_plugin
          if @member.deletable?
            issue_id = @project.issues.map(&:id)
            user = @member.user
            user_parent = user.parent
            children = @project.users.joins(:parent).where("user_hierarchies.parent_id = ?", user)

            if children.present?
              role = Role.where(name: MANAGEMENT_ROLE)
              @member.roles = []
              @member.roles << role
              group_hierarchy = GroupHierarchy.find_or_initialize_by(project: @project, user: user)
              group_hierarchy.save if group_hierarchy.new_record?
              Watcher.where("watchable_id in (?) and watchable_type = ? and user_id =  ?", issue_id, "Issue", @member.user_id).destroy_all
              @member.communication_plan.destroy if @member.communication_plan.present?
              @member.save
            else
              daily_status_setting = @member.project.daily_status_setting
              watchers = daily_status_setting.watchers if daily_status_setting
              if watchers && watchers.pluck(:user_id).include?(@member.user_id)
                watchers.find_by(user_id: @member.user_id).destroy
              end
              Watcher.where("watchable_id in (?) and watchable_type = ? and user_id =  ?", issue_id, "Issue", @member.user_id).destroy_all
              current_member = @member
              @member.destroy
              staff_need = current_member.staff_need
              staff_need.update_column(:to_date, Time.now) if staff_need.present?
              destroy_user_parent_hierarchy(user_parent, @member.project)
            end
          end

          respond_to do |format|
            format.html { redirect_to_settings_in_projects }
            format.js
            format.api {
              if @member.destroyed?
                render_api_ok
              else
                head :unprocessable_entity
              end
            }
          end
        end

        def update_with_plugin
          management_role = @member.roles.where(name: MANAGEMENT_ROLE)
          role = Role.find_by_name(MANAGEMENT_ROLE)
          if management_role.present?
            params[:membership][:role_ids] << (role.id).to_s
          end

          if params[:membership]
            member_role = @member.set_editable_role_ids(params[:membership][:role_ids])
          end

          if member_role.count == 1 && Role.find(member_role.first).name == MANAGEMENT_ROLE
            @member.communication_plan.destroy if @member.communication_plan
            group_hierarchy = GroupHierarchy.find_or_initialize_by(project: @project, user: @member.user)
            group_hierarchy.save if group_hierarchy.new_record?
          elsif member_role.count > 1
            group_hierarchy = @project.group_hierarchies.where(user: @member.user).first
            group_hierarchy.destroy if group_hierarchy.present?
          end
          @member.master_department_id = params[:master_department_id].to_i unless @member.frozen?
          @member.role_ids = member_role
          saved = @member.save
          respond_to do |format|
            format.html { redirect_to_settings_in_projects }
            format.js
            format.api {
              if saved
                render_api_ok
              else
                render_validation_errors(@member)
              end
            }
          end
        end

        alias_method :create_without_plugin, :create
        alias_method :create, :create_with_plugin
        alias_method :destroy_without_plugin, :destroy
        alias_method :destroy, :destroy_with_plugin
        alias_method :update_without_plugin, :update
        alias_method :update, :update_with_plugin
      end
    end

    private
      def check_and_add_user_parent_as_member(user_ids)
        user_ids.map do |user_id|
          user = User.find user_id
          user_parent = user.parent
          add_parent_into_project(user_parent)
        end
      end

      def add_parent_into_project(user_parent)
        role = Role.find_by_name(MANAGEMENT_ROLE)

        return if user_parent.nil?
        if @project.users.include?(user_parent)
          parent_member = @project.members.where(user_id: user_parent.id).first
          parent_member.roles << role unless parent_member.roles.include?(role)
          parent_member.save
        else
          member = Member.new(project: @project, user: user_parent)
          member.set_editable_role_ids([role.id])
          @project.members << member
        group_hierarchy = GroupHierarchy.find_or_initialize_by(project: @project, user: user_parent)
        group_hierarchy.save if group_hierarchy.new_record?
        end


        user_parent = user_parent.parent

        add_parent_into_project(user_parent)
      end

      def destroy_user_parent_hierarchy(user_parent, project)
        return if user_parent.nil?

        children = project.users.joins(:parent).where("user_hierarchies.parent_id = ?", user_parent)
        all_children = user_parent.children
        return if (all_children & children).present?
        member = Member.where(user: user_parent, project: project).first
        if member.present?
          roles = member.roles
          parent_role = Role.find_by_name(MANAGEMENT_ROLE)
          current_role = roles - [parent_role]

          if current_role.present?
            member.roles = current_role
            member.save
          else
            member.try(:destroy)
          end

          group_hierarchy = GroupHierarchy.where(user: user_parent, project: project).first
          group_hierarchy.delete if group_hierarchy.present?
        end

        user_parent = user_parent.parent
        destroy_user_parent_hierarchy(user_parent, project)
      end
  end

end
