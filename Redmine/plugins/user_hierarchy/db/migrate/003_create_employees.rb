class CreateEmployees < ActiveRecord::Migration[4.2]
  def change
    create_table :employees do |t|
      t.string :employee_id
      t.string :employee_code
      t.string :name
      t.string :email
      t.datetime :dob
      t.string :status
      t.integer :department_id
      t.string :designation
      t.string :parent_employee_code
      t.string :parent_employee_id
    end
  end
end
