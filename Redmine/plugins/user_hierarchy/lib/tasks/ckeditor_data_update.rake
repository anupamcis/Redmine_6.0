namespace :redmine do
  task check_issue_text: :environment do
    file = "/home/cis/Desktop/users.csv"
    column_headers = ['Project Name', 'Project Manager Name', 'Project Leader Name']
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      Project.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).each do |project|
        project_done = false

        project_done = true if check_description(project.description)

        project.issues.map do |issue|
          project_done = true if check_description(issue.description)

          issue.journals.map do |comment|
            project_done = true if check_description(comment.notes)
          end
        end

        project.daily_statuses.each do |daily_status|
          project_done = true if check_description(daily_status.content)
        end

        if project_done
          project_leader = project.memberships.joins(:member_roles).where('role_id = 10').last
          project_manager = project.memberships.joins(:member_roles).where('role_id = 9').last
          project_leader = project_leader.present? ? project_leader.name : 'None'
          project_manager = project_manager.present? ? project_manager.name : 'None'
          writer << [project.name, project_leader, project_manager]
        end
      end
    end
  end
end


def check_description(obj)
  obj.present? && (obj.match(/([*_+-@|#])/) || obj.match("h1") || obj.match("h2") || obj.match("h3") || obj.match("<pre>"))
end
