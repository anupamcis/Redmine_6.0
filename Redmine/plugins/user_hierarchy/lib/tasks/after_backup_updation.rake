namespace :redmine do
  task after_backup_updation: :environment do
    puts 'Project data updation starting'
    Project.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).each_with_index do |project, index|
      project.update_columns(name: "project name - #{index}", description: "this is project description - #{index}")
    end
    puts 'Project data updation done'


    puts 'Issue data updation starting'
    Issue.all.each_with_index do |issue, index|
      issue.update_columns(subject: "issue subject - #{index}", description: "this is issue description - #{index}")
    end
    puts 'Issue data updation done'


    puts "Comment's of issues updation starting"
    Journal.where(journalized_type: 'Issue').each_with_index do |journal, index|
      journal.update_column(:notes, "journal notes - #{index}")
    end
    puts "Comment's of issues updation done"


    puts "Document's updation starting"
    Document.all.each_with_index do |doc, index|
      doc.update_columns(title: "DOC TITEL - #{index} ", description:  "DOC description - #{index} ")
    end
    puts "Document's updation done"


    puts "Attachment's updation starting"
    Attachment.all.each_with_index do |attachment, index|
      attachment.update_column(:filename, "Document File name - #{index}")
    end
    puts "Attachment's updation done"


    puts "User's updation starting"
    User.where(admin: false).each_with_index do |user, index|
      user.mail = "User-#{index}@domain.com"
      user.firstname = "User Firstname-#{index}"
      user.lastname = "User Lasttname-#{index}"
      user.save
    end
    puts "Users email updation done"


    puts "Company's updation starting"
    companies = Company.where(default_company: false)
    companies.each_with_index do |company, index|
      company.update_columns(name: "XXX-#{index}", phone_number: "XXXXXXXXXX#{index}", fax_number: "XXXXXXXXXX#{index}", address: "Some place",  homepage: "xxx#{index}.com")
    end
    puts "Company data updation done"


    puts "Checklist's updation starting"
    Checklist.all.each_with_index do |check_list, index|
      check_list.update_column(:subject, "Check List - #{index}")
    end
    puts "Checklist's updation done"


    puts "DailyStatus's updation starting"
    DailyStatus.all.each_with_index do |daily_status, index|
      daily_status.update_column(:subject, "Daily Status - #{index}")
    end
    puts "DailyStatus's updation done"


    puts "DailyStatusReply's updation starting"
    DailyStatusReply.all.each_with_index do |reply, index|
      reply.update_column(:message, "Daily Status Reply - #{index}")
    end
    puts "DailyStatusReply's updation done"


    puts "Version's updation starting"
    Version.all.each_with_index do |version, index|
      version.update_columns(name: "Version - #{index}", description: "Desc Version - #{index}")
    end
    puts "Version's updation done"


    puts "Milestone's updation starting"
    Milestone.all.each_with_index do |milestone, index|
      milestone.update_columns(name: "Milestone - #{index}", description: "Desc Milestone - #{index}")
    end
    puts "Milestone's updation done"

  end

  task unregistred_users_list: :environment do
    file = "/home/cis/Desktop/unregistred_users.csv"
    column_headers = ['Employee Name', 'Department Name', 'Email', "Supervisor Name"]
    user_emplyee_id_list = User.pluck('employee_id').compact
    employee_table_id_list = Employee.pluck('id').compact
    unregistred_list  = employee_table_id_list - user_emplyee_id_list

    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      unregistred_list.each do |unregistred|
        employee = Employee.find(unregistred)
        deppartment = employee.department_id.nil? ? 'None' : Department.find_by_department_id(employee.department_id).name
        supervisor =  employee.parent_employee_id.nil? ? "None" : Employee.find_by_employee_id(employee.parent_employee_id).name
        writer << [employee.name, deppartment, employee.email , supervisor]
      end
    end
  end
end
