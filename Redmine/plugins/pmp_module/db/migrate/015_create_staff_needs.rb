class CreateStaffNeeds < ActiveRecord::Migration[4.2]
  def change
    create_table :staff_needs do |t|
      t.string :role
      t.string :technologies
      t.string :username
      t.integer :no_of_persons
      t.float :min_experience
      t.datetime :from_date
      t.datetime :to_date
      t.integer :project_id
      t.boolean :is_deleted, default: false
      t.integer :member_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
