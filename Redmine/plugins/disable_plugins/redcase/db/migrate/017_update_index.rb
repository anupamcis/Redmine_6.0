class UpdateIndex < ActiveRecord::Migration[4.2]
  def change
    # remove index cuz we need to
    remove_index :test_suites, [:name, :parent_id]
    remove_index :execution_suites, [:name, :parent_id]

    add_index :execution_suites, [:name, :parent_id,:project_id], :unique => true
    add_index :test_suites, [:name, :parent_id,:project_id], :unique => true
  end
end
