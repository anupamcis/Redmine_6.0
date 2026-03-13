class Employee < ActiveRecord::Base
  has_one :user, dependent: :nullify
  belongs_to :department, :class_name => :Department, foreign_key: :department_id, primary_key: :department_id
  has_many :service_details, foreign_key: :supervisor_employee_id, primary_key: :employee_id

  # attr_accessible 'employee_id', 'employee_code', 'name', 'email', 'dob', 'status', "department_id", "designation", "parent_employee_code", "parent_employee_id",
  # 'experience' # Removed for Rails 5 compatibility

  def self.getEmployeeList    
    st = SchedulerTime.find_or_initialize_by(cron_name: "getEmployeeList")
    st.start_date = Time.now
    @employees =  ErpEmployeeList.new.get_employee_list
    add_department(@employees)
    Employee.update_all(status: "inactive")
    @employees.each do |employee|      
      emp = Employee.find_or_initialize_by(email: employee["email"])
      emp.new_record? ? emp.create_employee(employee) : emp.update_employee(employee)
      if FIX_EMPOLYEE_PARENT_LIST.include?(emp.employee_id)
        Employee.fix_parent_for_users(emp)
      end
    end
    st.end_date = Time.now
    st.save
  end

  def self.add_department(employees)
    if Department.count == 0
      @employees  = employees
      departments = @employees.map{|employee| [employee["department_id"],employee["department_name"]]}.uniq
      departments.each do |department|
        Department.find_or_create_by(department_id: department[0], name:  department[1])
      end
    end
  end

  def self.associate_user_with_employee
    employees = Employee.all
    employees.map do |employee|
      user = EmailAddress.find_by_address(employee.email).try(:user)
      user.update(employee: employee) if user.present? && !user.employee.present?
    end
  end

  def create_employee(employee)
    self.attributes = {
      employee_id: employee["employee_id"],
      employee_code: employee["employee_code"],
      name: employee["name"],
      dob: employee["dob"],
      status: 'active',
      department_id: employee["department_id"],
      designation: employee["designation"],
      experience: employee["totexp_month"],
      parent_employee_code: employee["parent_employee_code"],
      parent_employee_id: employee["parent_employee_id"],
    }

    self.save
  end

  def update_employee(employee)
    self.attributes = {
      name: employee["name"],
      dob: employee["dob"],
      status: 'active',
      department_id: employee["department_id"],
      designation: employee["designation"],
      experience: employee["totexp_month"],
      parent_employee_code: employee["parent_employee_code"],
      parent_employee_id: employee["parent_employee_id"]
    }

    self.save
  end

  def self.fix_parent_for_users(employee)
    if ["MY825LLG86"].include?(employee.employee_id)
      #Mahendra Sir
      employee.parent_employee_code = "CIS26"
      employee.parent_employee_id = "YOW250KV58"
      employee.save
    elsif ["1PG33S3856", "N0041NMH76"].include?(employee.employee_id)
      #Girish Sir
      employee.parent_employee_code = "CIS19"
      employee.parent_employee_id = "57425WOB55"
      employee.save
    elsif ["13827LCP40", "S8425AQ371", "F0Y25T7572", "R1U26HGT66"].include?(employee.employee_id)
      #Sudhanshu Sir
      employee.parent_employee_code = "CIS52"
      employee.parent_employee_id = "8BQ2574X67"
      employee.save
    elsif ["JOM25YRL60", "45W25TC254", "E6525EDX53"].include?(employee.employee_id)
      #Bharat S
      employee.parent_employee_code = "CIS13"
      employee.parent_employee_id = "V0I25T3W52"
      employee.save
    else
    end
  end
end


