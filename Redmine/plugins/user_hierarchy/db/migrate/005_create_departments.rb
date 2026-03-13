class CreateDepartments < ActiveRecord::Migration[4.2]
  def change
    create_table :departments do |t|
      t.integer :department_id
      t.string :name
    end
  end
end
