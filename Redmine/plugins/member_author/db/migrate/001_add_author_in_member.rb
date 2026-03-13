class AddAuthorInMember < ActiveRecord::Migration[4.2]
  def up
    add_column :members, :author_id, :integer
  end

  def down
    remove_column :members, :author_id
  end
end
