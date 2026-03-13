class CreateUserHierarchies < ActiveRecord::Migration[4.2]
  def change
    create_table :user_hierarchies do |t|

      t.integer :child_id
      t.integer :parent_id
    end
  end
end
