class AddColumnsInReleaseNotification < ActiveRecord::Migration[4.2]
  def up
    add_column :release_notifications, :notifiable_id, :integer
    add_column :release_notifications, :notifiable_type, :string
  end

  def down
    add_column :release_notifications, :notifiable_id
    add_column :release_notifications, :notifiable_type
  end
end
