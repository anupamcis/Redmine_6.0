class AddLastSeenAtToUsers < ActiveRecord::Migration[4.2]

  def up
    add_column :users, :last_seen_at, :datetime
  end

   def down
    remove_column :users, :last_seen_at
  end
end
