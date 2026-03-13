class UserHierarchy < ActiveRecord::Base
  belongs_to :child, :class_name => "User"
  belongs_to :parent, :class_name => "User"

  def self.associate_parent_with_user_hierarchy
    st = SchedulerTime.find_or_initialize_by(description: "associate_parent_with_user_hierarchy")
    st.start_date = Time.now
    company = Company.where(default_company: true).first

    company.users.each do |user|
      employee = user.employee
      puts "USER NAME #{user.try(:name)} Employee NAME #{employee.try(:name)}"
      if employee.present?
        hierarchy = UserHierarchy.find_or_initialize_by(child_id: user.id)
        if employee.parent_employee_id.nil? && hierarchy.present?
          hierarchy.destroy
        else
          parent_user = Employee.find_by_employee_id(employee.parent_employee_id).try(:user)

          if parent_user.present?
            if hierarchy.new_record?
              hierarchy.parent_id =  parent_user.id
              hierarchy.save
            else
              hierarchy.update(parent_id: parent_user.id)
            end
          end
        end
      end
    end if company.present?
    st.end_date = Time.now
    st.save
  end
end
