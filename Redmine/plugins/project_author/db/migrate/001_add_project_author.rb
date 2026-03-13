class AddProjectAuthor < ActiveRecord::Migration[4.2]
  def up
    add_column :projects, :author_id, :integer
  end

  def down
    remove_column :projects, :author_id
  end
end
