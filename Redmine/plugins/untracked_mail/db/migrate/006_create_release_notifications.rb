class CreateReleaseNotifications < ActiveRecord::Migration[7.0]
  def change
    create_table :release_notifications do |t|
      t.references :user, polymorphic: true, null: false
      t.references :notifiable, polymorphic: true, null: false
      t.timestamps
    end

    add_index :release_notifications, [:user_id, :user_type, :notifiable_type, :notifiable_id], 
              name: 'index_release_notifications_on_user_and_notifiable'
  end
end
