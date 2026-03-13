class AddDefaultMemberInProjects < ActiveRecord::Migration[4.2]
  def change
    Project.all.each do |project|
      if Setting.plugin_redmine_default_members
        if project.members.size == 0 || !project.members.map(&:roles).collect{|role| role.name.include?(DEFAULT_MEMBER_ROLE)}.include?(true)
          Setting.plugin_redmine_default_members.each do |key, default_members|
            next if key == 'template'
            next if default_members[:roles].empty?
            group = Group.find_by_lastname(default_members[:group])
            users = User.active.in_group(group).all
            users.each do |user|
              next if user.anonymous?
              roles = Role.where(id: default_members[:roles])
              Member.create(user: user, role_ids: roles.map(&:id), project: project)
              check_roles_for_user!(project, user, roles)
            end
          end
        end
      end
    end
  end

  private

  def check_roles_for_user!(project, user, roles)
            roles.each do |role|
              if !user.roles_for_project(project).include?(role)
                membership = project.member_principals.select { |m| m.user == user }.first
                membership.role_ids = roles.map(&:id)
                membership.save!
              end
            end
  end
end
