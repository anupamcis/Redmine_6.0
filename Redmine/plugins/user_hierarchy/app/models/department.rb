class Department < ActiveRecord::Base
  unloadable
  has_many :employees

  def create_department(department)
    self.attributes = {
      name: department["department_name"],
    }
    self.save
  end    

  #   departments.map do |department|
  #     dep = Department.find_by_department_id(department[:department_id])

  #     if !dep.present?
  #       Department.create(department_id: department[:department_id],
  #                         name: department[:name])
  #     end
  #   end 
  # end
end
