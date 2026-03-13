namespace :redmine do
  task migrate_existing_companies: :environment do
    companies = Company.where(default_company: false)
    if companies.present?
      companies.each do |company|
        user_mails = company.users.map(&:mail) rescue nil
        if user_mails && user_mails.present?
          user_mails.each do |user_mail|
            erp_client = ErpServiceProjects.new.for_migrating_companies_from_erp(user_mail).first
            if erp_client.present? && !erp_client.blank? && !erp_client.include?(400)
              puts "MAIL #{user_mail} - ERP RESPOSNE #{erp_client}"
              if erp_client.present?
                unless company.erp_client_id.present?
                  company.update({erp_client_id: erp_client["client_id"], name: erp_client["client_company"]})
                end
              end
            end
          end
        end
      end
    end
    puts "MIGRATION DONE"
  end

  task get_list_of_company_without_client_id: :environment do
    companies  = Company.where(default_company: false, erp_client_id: nil)
    file = "company_without_client_id.csv"
    column_headers = ['Company Name', 'User Emails']
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      companies.each do |company|
        writer << [company.name, company.users.present? ? company.users.map(&:mail).join(',') : "NA"]
      end
    end
    puts "COMPNAIES LIST WOTHOUT COMPANY STORE AT #{Rails.root} PATH "
  end

  task migrate_companies_with_project: :environment do
    companies = Company.where(default_company: false)
    companies.each_with_index do |company, index|
      company.projects.update_all(erp_client_id: company.erp_client_id) if company.projects.present?
    end
    puts "Project and company migration Done"
  end

  task get_list_of_projects_without_client_id: :environment do
    projects  = Project.where.not(id: 1)
    file = "projects_without_client_id.csv"
    column_headers = ['Project Name', 'LEAD/MANAGER']
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      projects.active.each do |project|
        if project.erp_client_id.nil?
          project_leader = project.memberships.joins(:member_roles).where('role_id = 10').last
          project_manager = project.memberships.joins(:member_roles).where('role_id = 9').last
          lead = project_leader.present? ? project_leader.name : (project_manager.present? ? project_manager.name : "NONE")
          writer << [project.name, lead]
        end
      end
    end
    puts "PROJECTS LIST WOTHOUT COMPANY STORE AT #{Rails.root} PATH"
  end

  task get_list_of_service_without_projects: :environment do
    service_details = ServiceDetail.where(project_id: nil)
    file = "service_without_projects.csv"
    column_headers = ['Service Name', 'Assignee Name', "Lead Name",  "Company Name" ]
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      service_details.each do |service_detail|
        writer << [service_detail.service_name, service_detail.employee.name, service_detail.employee.try(:user).try(:parent).name, service_detail.company.name ]
      end
    end
    p "List Generated"
  end

  task get_list_of_projects_with_multiple_managers: :environment do
    projects  = Project.where.not(id: 1)
    file = "projects_with_multiple_managers.csv"
    column_headers = ['Project Name', 'Managers']
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      projects.each do |project|
        project_managers = project.memberships.joins(:member_roles).where('role_id = 9')
        if project_managers.count > 1
          writer << [project.name, project_managers.map(&:user).map(&:name).join(",")]
        end
      end
    end
    puts "PROJECTS LIST WITH MULTIPLE MANAGERS STORE AT #{Rails.root} PATH"
  end

  task service_with_wait_waiting_status: :environment do
    file = "service_list_with_waitting_status.csv"
    column_headers = ['Service Id', 'Service Detail Id', "Assigneed To", "Status"]
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      ServiceDetail.where("lower(status) like '%wait%'").each do |service_detail|
        writer << [service_detail.erp_service_id, service_detail.erp_service_detail_id,
          service_detail.try(:employee).try(:user).try(:name), service_detail.status]
      end
    end
  end

  task user_project_manager_count: :environment do
    file = "user_project_manager_count.csv"
    column_headers = ['User Name', 'Manager in number of projects', 'Projects']
    company = Company.find_by(default_company: true)
    users = company.users
    users_hash = {}
    users.each do |user|
      users_hash[user.name] = {"counts" => 0, "projects_name" => []}
    end
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      Project.where.not(id: 1).active.joins(:service_details).uniq.each do |project|
        if project.service_details.map(&:service_detail_type).map(&:downcase).include?("project")
          user = project.members.joins(:roles).where("roles.id = ? ", 9).try(:first).try(:user).try(:name)
          if user.present?
            users_hash[user]["counts"] += 1
            users_hash[user]["projects_name"] << project.name
          end
        end
      end
      if users_hash.present?
        users_hash.each do |key, value|
          writer << [key, value["counts"], value["projects_name"].join(", ")] if value["counts"] > 0
        end
      end
    end
    puts "Done"
  end

  task projects_without_manager: :environment do
    file = "projects_without_manager_count.csv"
    column_headers = ['Project Name', 'Created By']
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      Project.where.not(id: 1).active.joins(:service_details).uniq.each do |project|
        if project.service_details.map(&:service_detail_type).map(&:downcase).include?("project")
          if_no_manager = project.members.map(&:roles).flatten.uniq.map(&:id).include?(9)
          writer << [project.name, project.try(:author).try(:name)] unless if_no_manager
        end
      end
    end
    p "Done"
  end
end