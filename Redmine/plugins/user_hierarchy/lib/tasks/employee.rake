namespace :redmine do
  task getEmployeeList: :environment do
    Employee.getEmployeeList
    puts "Employee Data Created successfully"
  end

  task associate_user_with_employee: :environment do
  	Employee.associate_user_with_employee
    puts "Assocaition with user done"
  end

  task associate_parent_with_user_hierarchy: :environment do
  	UserHierarchy.associate_parent_with_user_hierarchy
    puts "Parent Child assocaition Done"
  end

  #Only For Existing projects
  task check_members_group_hierarchy: :environment do
    Project.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).each do |project|
      Member.create_members_parent_hierarchy(project)
    end
    puts "Parent added in old projects done"
  end

end
