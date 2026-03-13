namespace :redmine do
  task existing_projects_add_client_poc: :environment do
    Project.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).each do |project|
      if project.members.present?
        default_company_id = Company.where(default_company: true).id
        poc_candidate = project.members.joins(:user).where.not("users.company_id = ? ", 1).order('created_on').first
        poc_candidate.update_column(is_poc: true)
      end
    end
  end
end