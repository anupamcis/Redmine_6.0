class ChangeAuthorField < ActiveRecord::Migration[4.2]
  def up
    rename_column :users, :author_id, :user_author_id
  end

  def down
    remove_column :users, :user_author_id
  end
end
