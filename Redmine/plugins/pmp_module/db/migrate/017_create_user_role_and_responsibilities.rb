class CreateUserRoleAndResponsibilities < ActiveRecord::Migration[4.2]
  def change
    create_table :user_role_and_responsibilities do |t|
      t.integer :user_id
      t.integer :reporting_person_id
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
