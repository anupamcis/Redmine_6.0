class CreateReleaseNotifications < ActiveRecord::Migration[4.2]
  def change
    create_table :release_notifications do |t|
      t.integer :user_id
      t.integer :release_update_id
      t.timestamp :created_on
    end
  end
end
