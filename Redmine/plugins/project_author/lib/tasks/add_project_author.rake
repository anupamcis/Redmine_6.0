namespace :redmine do
  task update_project_author: :environment do
    if Project.exists?
      Project.all.each do |project|
        if  project.identifier != GLOBAL_PERMISSIONS_MODULE_NAME
          project.users_by_role.each do |user_role|
            if user_role[0].name == "Project Manager" || user_role[0].name == "Project Leader"
              project.update_column('author_id', user_role[1].first.id)
            end
          end
          if project.author_id.nil? && project.identifier != GLOBAL_PERMISSIONS_MODULE_NAME
            project.update_column('author_id', User.where(admin: true).first.id)
          end
        end
        puts "Completed"
      end
    end
  end
end

