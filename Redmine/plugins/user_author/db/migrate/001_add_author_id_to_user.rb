class AddAuthorIdToUser < ActiveRecord::Migration[4.2]
  def up
    add_column :users, :author_id, :integer
  end

  def down
    remove_column :users, :author_id
  end
end
