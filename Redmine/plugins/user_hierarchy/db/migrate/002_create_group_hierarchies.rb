class CreateGroupHierarchies < ActiveRecord::Migration[4.2]
  def change
    create_table :group_hierarchies do |t|
      t.integer :project_id
      t.integer :user_id
    end
  end
end
