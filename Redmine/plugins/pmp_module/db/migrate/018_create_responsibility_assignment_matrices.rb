class CreateResponsibilityAssignmentMatrices < ActiveRecord::Migration[4.2]
  def change
    create_table :responsibility_assignment_matrices do |t|
      t.integer :project_id
      t.integer :user_id
      t.integer :role_id
      t.text    :responsibility
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
