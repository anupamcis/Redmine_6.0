namespace :redmine do
  task update_user_author: :environment do
    manager_role = Role.where(name: "Project Manager").first
    mn_id = manager_role.members.pluck('user_id', 'project_id')
    mn_id.each do |m_id|
      project = Project.find(m_id[1])
      mn_user = User.find(m_id[0])
      mn_user.update_column("author_id", User.where(admin: true).first.id)
      user_ids = project.members.where.not(user_id: m_id[0]).pluck("user_id")
      user_ids.each do |id|
        user = User.find(id)
        puts "User name #{user.name} Project Name #{project.name}"
        user.update_column("author_id", m_id[0] )
      end
    end

    lead_role = Role.where(name: "Project Leader").first
    lead_id = lead_role.members.pluck('user_id', 'project_id')
    lead_id.each do |le_id|
      project = Project.find(le_id[1])
      user_ids = project.members.where.not(user_id: le_id[0]).pluck("user_id")
      user_ids.each do |id|
        user = User.find(id)
        if user.author_id.nil? && !user.auth_source_id.nil?
          puts "User name #{user.name} Project Name #{project.name}"
          user.update_column("author_id", le_id[0] )
        end
      end
    end

    users = User.where("auth_source_id IS NOT NUll and author_id IS null")
    users.each do |user|
      user.update_column('author_id', User.where(admin: true).first.id)
    end

    users_ladp = User.where("auth_source_id IS NUll and admin = ? ", false)
    users_ladp.each do |ladp|
      if ladp.class != AnonymousUser
        ladp.update_column('author_id', User.where(admin: true).first.id)
      end
    end
  end
end

