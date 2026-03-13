class ChangeAuthorField < ActiveRecord::Migration[4.2]
  def up
    rename_column :projects, :author_id, :project_author_id
  end

  def down
    remove_column :projects, :project_author_id
  end
end
